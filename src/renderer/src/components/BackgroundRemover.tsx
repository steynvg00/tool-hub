import { JSX, useEffect, useMemo, useRef, useState } from 'react'
import ParamControl from './ParamControl'
import {
  fetchSteps,
  fetchPresets,
  removeBackground,
  pngDataUrl,
  type StepDef,
  type PipelineStep,
  type RemoveResult,
  type Preset
} from '../lib/api'
import type { UserPreset } from '../../../preload'
import { ToolHeader } from './toolkit'
import { fileFromDataTransfer, dragHasFile } from '../lib/collectedFiles'
import { sendToPrintLayout } from '../lib/printHandoff'

const baseNoExt = (name: string): string => name.replace(/\.[^.]+$/, '')

const BACKGROUND_REMOVER_INFO = (
  <>
    <h4>Wat doet deze tool?</h4>
    <p>
      Verwijdert de achtergrond van een afbeelding. Je bouwt zelf een pijplijn van technieken: een{' '}
      <b>generator</b> maakt eerst een masker en <b>modifiers</b> verfijnen dat masker daarna. De
      stappen worden op volgorde van boven naar beneden uitgevoerd.
    </p>
    <h4>Werkwijze</h4>
    <ul>
      <li>
        <b>1 · Afbeelding</b> &mdash; upload een PNG, JPEG of WEBP als bronbeeld.
      </li>
      <li>
        <b>2 · Technieken</b> &mdash; klik op een <b>generator</b> om een masker aan te maken en
        voeg eventueel <b>modifiers</b> toe om het masker te verfijnen. Elke techniek heeft eigen
        instelbare parameters.
      </li>
      <li>
        <b>Presets</b> &mdash; kies een ingebouwde of eigen preset om de pijplijn in één klik te
        vullen; de stappen blijven daarna aanpasbaar. Sla je huidige pijplijn op onder een naam om
        hem later opnieuw te gebruiken of te verwijderen.
      </li>
      <li>
        <b>3 · Pijplijn</b> &mdash; hier staan je stappen. Gebruik de pijltjes om de volgorde te
        wijzigen, het kruisje om een stap te verwijderen of <b>wissen</b> om alles te leegmaken.
      </li>
      <li>
        <b>4 · Resultaat</b> &mdash; bekijk het eindresultaat plus een preview per stap en download
        het als transparante PNG.
      </li>
    </ul>
  </>
)

let stepCounter = 0
const nextId = (): string => `step-${++stepCounter}`

/** Build a step's default params from its schema. */
function defaultParams(def: StepDef): Record<string, unknown> {
  const params: Record<string, unknown> = {}
  for (const [key, spec] of Object.entries(def.params)) {
    params[key] = spec.default
  }
  return params
}

function BackgroundRemover({ openTool }: { openTool: (id: string) => void }): JSX.Element {
  const [catalog, setCatalog] = useState<StepDef[]>([])
  const [catalogError, setCatalogError] = useState<string | null>(null)

  const [image, setImage] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [dropOver, setDropOver] = useState(false)

  const [pipeline, setPipeline] = useState<PipelineStep[]>([])

  const [result, setResult] = useState<RemoveResult | null>(null)
  const [processing, setProcessing] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)

  const [builtinPresets, setBuiltinPresets] = useState<Preset[]>([])
  const [userPresets, setUserPresets] = useState<UserPreset[]>([])
  const [presetName, setPresetName] = useState('')
  const [presetError, setPresetError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load the technique catalog from GET /steps once.
  useEffect(() => {
    fetchSteps()
      .then(setCatalog)
      .catch((e: Error) => setCatalogError(e.message))
  }, [])

  // Load built-in presets (GET /presets) and the user's own (Electron userData).
  useEffect(() => {
    fetchPresets()
      .then(setBuiltinPresets)
      .catch((e: Error) => setPresetError(e.message))
    window.api.presets
      .listUser()
      .then(setUserPresets)
      .catch((e: Error) => setPresetError(e.message))
  }, [])

  // Read the source as a data: URL. A blob: URL (createObjectURL) is blocked by
  // the renderer CSP (img-src 'self' data:), so read it the same way the backend
  // previews arrive — as base64 — which the CSP allows.
  useEffect(() => {
    if (!image) {
      setImageUrl(null)
      return
    }
    let cancelled = false
    const reader = new FileReader()
    reader.onload = () => {
      if (!cancelled) setImageUrl(reader.result as string)
    }
    reader.readAsDataURL(image)
    return () => {
      cancelled = true
    }
  }, [image])

  const generators = useMemo(
    () => catalog.filter((s) => s.category === 'generator'),
    [catalog]
  )
  const modifiers = useMemo(
    () => catalog.filter((s) => s.category === 'modifier'),
    [catalog]
  )

  const setPickedFile = (file: File | null): void => {
    setImage(file)
    setResult(null)
    setRunError(null)
  }

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setPickedFile(e.target.files?.[0] ?? null)
  }

  const onDropFile = async (e: React.DragEvent): Promise<void> => {
    e.preventDefault()
    setDropOver(false)
    const f = await fileFromDataTransfer(e.dataTransfer)
    if (f) setPickedFile(f)
  }

  const addStep = (def: StepDef): void => {
    setPipeline((prev) => [...prev, { id: nextId(), type: def.type, params: defaultParams(def) }])
  }

  const updateParam = (id: string, key: string, value: unknown): void => {
    setPipeline((prev) =>
      prev.map((s) => (s.id === id ? { ...s, params: { ...s.params, [key]: value } } : s))
    )
  }

  const removeStep = (id: string): void => {
    setPipeline((prev) => prev.filter((s) => s.id !== id))
  }

  const moveStep = (index: number, dir: -1 | 1): void => {
    setPipeline((prev) => {
      const target = index + dir
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const run = async (): Promise<void> => {
    if (!image || pipeline.length === 0) return
    setProcessing(true)
    setRunError(null)
    setResult(null)
    try {
      const res = await removeBackground(image, pipeline, true)
      setResult(res)
    } catch (e) {
      setRunError((e as Error).message)
    } finally {
      setProcessing(false)
    }
  }

  const defByType = (type: string): StepDef | undefined =>
    catalog.find((s) => s.type === type)

  // Replace the pipeline with a preset's steps. Preset params are merged over the
  // technique's defaults so every control renders populated, and each step gets a
  // fresh id so it behaves like a normal, editable step afterwards.
  const applyPreset = (preset: Preset | UserPreset): void => {
    setPipeline(
      preset.steps.map((s) => {
        const def = defByType(s.type)
        const base = def ? defaultParams(def) : {}
        return { id: nextId(), type: s.type, params: { ...base, ...s.params } }
      })
    )
    setResult(null)
    setRunError(null)
  }

  const saveCurrentAsPreset = async (): Promise<void> => {
    const name = presetName.trim()
    if (!name || pipeline.length === 0) return
    setPresetError(null)
    try {
      const updated = await window.api.presets.saveUser({
        name,
        steps: pipeline.map(({ type, params }) => ({ type, params }))
      })
      setUserPresets(updated)
      setPresetName('')
    } catch (e) {
      setPresetError((e as Error).message)
    }
  }

  const deletePreset = async (id: string): Promise<void> => {
    setPresetError(null)
    try {
      setUserPresets(await window.api.presets.deleteUser(id))
    } catch (e) {
      setPresetError((e as Error).message)
    }
  }

  const canRun = Boolean(image) && pipeline.length > 0 && !processing

  return (
    <div className="tool">
      <ToolHeader
        title="Achtergrond verwijderen"
        subtitle="Upload een afbeelding, bouw een pijplijn van technieken en verwijder de achtergrond."
        info={BACKGROUND_REMOVER_INFO}
      />

      {catalogError && (
        <div className="banner banner-error">
          Kon technieken niet laden: {catalogError}
        </div>
      )}

      <div className="tool-grid">
        {/* -------- Left: upload + technique palette -------- */}
        <section className="panel">
          <h2>1 · Afbeelding</h2>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={onPickFile}
            hidden
          />
          <button
            className={dropOver ? 'btn btn-drop drag-over' : 'btn btn-drop'}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              if (dragHasFile(e.dataTransfer)) {
                e.preventDefault()
                setDropOver(true)
              }
            }}
            onDragLeave={() => setDropOver(false)}
            onDrop={onDropFile}
          >
            {image ? 'Andere afbeelding kiezen' : 'Afbeelding uploaden of hierheen slepen'}
          </button>
          {imageUrl && (
            <div className="thumb">
              <div className="source-preview checkerboard">
                <img src={imageUrl} alt="bron" />
              </div>
              <span className="thumb-name">{image?.name}</span>
            </div>
          )}

          <h2>2 · Technieken</h2>
          <p className="hint">Voeg een losse edit toe of stapel er meerdere tot een chain.</p>

          <div className="palette-group">
            <h3>Generators <small>(maken een masker)</small></h3>
            {generators.map((def) => (
              <button key={def.type} className="chip" onClick={() => addStep(def)}>
                + {def.label}
              </button>
            ))}
          </div>

          <div className="palette-group">
            <h3>Modifiers <small>(verfijnen het masker)</small></h3>
            {modifiers.map((def) => (
              <button key={def.type} className="chip" onClick={() => addStep(def)}>
                + {def.label}
              </button>
            ))}
          </div>
        </section>

        {/* -------- Middle: presets + the pipeline -------- */}
        <section className="panel">
          <h2>Presets</h2>
          <p className="hint">Klik een preset om de pijplijn te vullen; pas de stappen daarna gerust aan.</p>

          {builtinPresets.length > 0 && (
            <div className="palette-group">
              <h3>Ingebouwd</h3>
              {builtinPresets.map((p) => (
                <button
                  key={p.id}
                  className="chip"
                  title={p.description}
                  onClick={() => applyPreset(p)}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}

          <div className="palette-group">
            <h3>Eigen presets</h3>
            {userPresets.length === 0 ? (
              <p className="hint">Nog geen eigen presets opgeslagen.</p>
            ) : (
              userPresets.map((p) => (
                <div key={p.id} className="preset-row">
                  <button
                    className="chip preset-apply"
                    title={p.description}
                    onClick={() => applyPreset(p)}
                  >
                    {p.name}
                  </button>
                  <button
                    className="icon-btn danger"
                    title="preset verwijderen"
                    onClick={() => deletePreset(p.id)}
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="preset-save">
            <input
              type="text"
              placeholder="Naam voor huidige pijplijn"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveCurrentAsPreset()}
            />
            <button
              className="btn"
              disabled={pipeline.length === 0 || presetName.trim() === ''}
              onClick={saveCurrentAsPreset}
            >
              Huidige pijplijn opslaan als preset
            </button>
            {pipeline.length === 0 && (
              <p className="hint">Bouw eerst een pijplijn om op te slaan.</p>
            )}
          </div>

          {presetError && <div className="banner banner-error">{presetError}</div>}

          <div className="panel-title-row">
            <h2>3 · Pijplijn</h2>
            {pipeline.length > 0 && (
              <button className="btn-link" onClick={() => setPipeline([])}>
                wissen
              </button>
            )}
          </div>

          {pipeline.length === 0 ? (
            <p className="empty">Nog geen stappen. Kies links een techniek.</p>
          ) : (
            <ol className="pipeline">
              {pipeline.map((step, i) => {
                const def = defByType(step.type)
                return (
                  <li key={step.id} className="pipeline-step">
                    <div className="step-head">
                      <span className="step-index">{i + 1}</span>
                      <span className="step-name">{def?.label ?? step.type}</span>
                      <div className="step-actions">
                        <button
                          className="icon-btn"
                          disabled={i === 0}
                          onClick={() => moveStep(i, -1)}
                          title="omhoog"
                        >
                          ↑
                        </button>
                        <button
                          className="icon-btn"
                          disabled={i === pipeline.length - 1}
                          onClick={() => moveStep(i, 1)}
                          title="omlaag"
                        >
                          ↓
                        </button>
                        <button
                          className="icon-btn danger"
                          onClick={() => removeStep(step.id)}
                          title="verwijderen"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    {def && Object.keys(def.params).length > 0 && (
                      <div className="step-params">
                        {Object.entries(def.params).map(([key, spec]) => (
                          <ParamControl
                            key={key}
                            name={key}
                            spec={spec}
                            value={step.params[key]}
                            onChange={(v) => updateParam(step.id, key, v)}
                          />
                        ))}
                      </div>
                    )}
                  </li>
                )
              })}
            </ol>
          )}

          <button className="btn btn-primary" disabled={!canRun} onClick={run}>
            {processing ? 'Bezig…' : 'Achtergrond verwijderen'}
          </button>
          {!image && <p className="hint">Upload eerst een afbeelding.</p>}
          {runError && <div className="banner banner-error">{runError}</div>}
        </section>

        {/* -------- Right: results -------- */}
        <section className="panel">
          <h2>4 · Resultaat</h2>
          {!result && !processing && <p className="empty">Nog geen resultaat.</p>}
          {processing && <p className="empty">Pijplijn wordt verwerkt…</p>}

          {result && (
            <>
              <div className="result-final checkerboard">
                <img src={pngDataUrl(result.final)} alt="resultaat" />
              </div>
              <a
                className="btn btn-primary"
                href={pngDataUrl(result.final)}
                download={`${image ? baseNoExt(image.name) : 'afbeelding'} background removed.png`}
              >
                PNG downloaden
              </a>
              <div className="tk-actions">
                <button
                  className="btn"
                  onClick={() => sendToPrintLayout(pngDataUrl(result.final), openTool)}
                >
                  Stuur naar Print layout
                </button>
              </div>

              {result.steps.length > 0 && (
                <>
                  <h3>Preview per stap</h3>
                  <div className="step-previews">
                    {result.steps.map((s, i) => (
                      <figure key={i} className="step-preview checkerboard">
                        <img src={pngDataUrl(s.preview)} alt={`stap ${i + 1}`} />
                        <figcaption>
                          {i + 1}. {defByType(s.type)?.label ?? s.type}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}

export default BackgroundRemover
