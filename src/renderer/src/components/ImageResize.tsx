import { JSX, useEffect, useState } from 'react'
import { processToFile, formatBytes, type FileResult } from '../lib/api'
import { useFileResult } from '../lib/useFileResult'
import { runBulk } from '../lib/bulk'
import { MultiFileButton, NumberField, ResultDownload } from './ToolFields'
import { ToolHeader, Note } from './toolkit'
import { sendToPrintLayout } from '../lib/printHandoff'

const baseNoExt = (name: string): string => name.replace(/\.[^.]+$/, '')

const IMAGE_RESIZE_INFO = (
  <>
    <h4>Wat doet deze tool?</h4>
    <p>
      Schaalt een afbeelding naar nieuwe afmetingen en slaat het resultaat op in het gekozen
      formaat. Vul een breedte en/of hoogte in; het slotje ertussen bepaalt of de verhouding
      behouden blijft.
    </p>
    <h4>Opties</h4>
    <ul>
      <li>
        <b>Breedte / Hoogte (px)</b> &mdash; de doelafmetingen. Met het <b>slot gesloten</b> 🔒 volgt
        de andere waarde automatisch zodat de verhouding klopt; met het <b>slot open</b> 🔓 stel je
        beide vrij in (de afbeelding wordt dan uitgerekt).
      </li>
      <li>
        <b>Meerdere bestanden</b> &mdash; met het slot gesloten wordt elk bestand op zijn eigen
        verhouding geschaald op basis van de as die je instelt; het resultaat komt als één zip.
      </li>
      <li>
        <b>Kwaliteit</b> &mdash; compressiekwaliteit (1&ndash;100) voor formaten met verlies zoals
        JPEG en WEBP; hoger is mooier maar groter.
      </li>
      <li>
        <b>Uitvoerformaat</b> &mdash; bewaar het originele formaat of converteer naar PNG, JPEG of
        WEBP.
      </li>
    </ul>
  </>
)

function ImageResize({ openTool }: { openTool: (id: string) => void }): JSX.Element {
  const [files, setFiles] = useState<File[]>([])
  const [width, setWidth] = useState(800)
  const [height, setHeight] = useState(600)
  const [locked, setLocked] = useState(true)
  // Which axis the user is driving while locked, so bulk resizes stay
  // aspect-correct per file (backend derives the other axis from each source).
  const [driver, setDriver] = useState<'w' | 'h'>('w')
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [quality, setQuality] = useState(85)
  const [fmt, setFmt] = useState('') // '' = keep source format
  const [result, setResult] = useFileResult()
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load a large preview + the natural dimensions of the first picked file, and
  // seed the width/height fields with the original size.
  useEffect(() => {
    const f = files[0]
    if (!f) {
      setPreviewUrl(null)
      setNat(null)
      return
    }
    const url = URL.createObjectURL(f)
    setPreviewUrl(url)
    const img = new Image()
    img.onload = () => {
      setNat({ w: img.naturalWidth, h: img.naturalHeight })
      setWidth(img.naturalWidth)
      setHeight(img.naturalHeight)
    }
    img.src = url
    return () => URL.revokeObjectURL(url)
  }, [files])

  const pick = (fs: File[]): void => {
    setFiles(fs)
    setResult(null)
    setError(null)
  }

  const ratio = nat && nat.h > 0 ? nat.w / nat.h : null

  const onWidth = (v: number): void => {
    setWidth(v)
    setDriver('w')
    if (locked && ratio) setHeight(Math.max(1, Math.round(v / ratio)))
  }
  const onHeight = (v: number): void => {
    setHeight(v)
    setDriver('h')
    if (locked && ratio) setWidth(Math.max(1, Math.round(v * ratio)))
  }
  const toggleLock = (): void => {
    setLocked((was) => {
      const next = !was
      // Re-snap the derived axis so the ratio is consistent when re-locking.
      if (next && ratio) {
        if (driver === 'w') setHeight(Math.max(1, Math.round(width / ratio)))
        else setWidth(Math.max(1, Math.round(height * ratio)))
      }
      return next
    })
  }

  const run = async (): Promise<void> => {
    if (files.length === 0) return
    setBusy(true)
    setError(null)
    setResult(null)
    setProgress(null)
    const outName = (f: File): string =>
      `${baseNoExt(f.name)}.${fmt || (f.name.split('.').pop() || 'png').toLowerCase()}`
    try {
      const processOne = async (f: File): Promise<FileResult> => {
        const form = new FormData()
        form.append('image', f)
        // Locked → send only the driven axis so each file keeps its own ratio.
        // Unlocked → send both for an exact (stretched) size.
        if (locked) {
          if (driver === 'w') form.append('width', String(width))
          else form.append('height', String(height))
        } else {
          form.append('width', String(width))
          form.append('height', String(height))
        }
        form.append('quality', String(quality))
        if (fmt) form.append('fmt', fmt)
        const r = await processToFile('/image/resize', form, outName(f))
        return { ...r, filename: outName(f) }
      }
      setResult(await runBulk(files, processOne, (done, total) => setProgress({ done, total })))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  // Hand the (single) resized image to the Print layout tool. The blob is read
  // as a data: URL because the renderer CSP blocks blob: URLs for <img>.
  const toPrintLayout = (): void => {
    if (!result) return
    const reader = new FileReader()
    reader.onload = () => sendToPrintLayout(reader.result as string, openTool)
    reader.readAsDataURL(result.blob)
  }

  return (
    <div className="tool">
      <ToolHeader
        title="Afbeelding schalen"
        subtitle="Schaal een afbeelding naar nieuwe afmetingen, met of zonder verhouding vast."
        info={IMAGE_RESIZE_INFO}
      />

      <div className="panel tool-panel">
        <MultiFileButton label="Afbeelding(en)" accept="image/*" files={files} onPick={pick} />

        {previewUrl && (
          <div className="thumb">
            <div className="source-preview checkerboard">
              <img src={previewUrl} alt="bron" />
            </div>
            <span className="thumb-name">
              {nat ? `Origineel: ${nat.w} × ${nat.h} px` : 'Afmetingen laden…'}
              {files.length > 1 && ` · +${files.length - 1} meer`}
            </span>
          </div>
        )}

        <div className="ir-dims">
          <NumberField label="Breedte (px)" value={width} min={1} max={20000} onChange={onWidth} />
          <button
            type="button"
            className={locked ? 'ir-lock on' : 'ir-lock'}
            onClick={toggleLock}
            title={locked ? 'Verhouding vergrendeld — klik om vrij te maken' : 'Verhouding vrij — klik om te vergrendelen'}
            aria-pressed={locked}
          >
            {locked ? '🔒' : '🔓'}
          </button>
          <NumberField label="Hoogte (px)" value={height} min={1} max={20000} onChange={onHeight} />
        </div>

        <Note>
          Nieuw formaat: {width} × {height} px
          {locked && ratio ? ' (verhouding behouden)' : ''}
        </Note>

        <div className="tool-field">
          <label className="tool-label">Kwaliteit: {quality}</label>
          <input
            type="range"
            min={1}
            max={100}
            value={quality}
            onChange={(e) => setQuality(+e.target.value)}
          />
        </div>

        <label className="tool-field">
          <span className="tool-label">Uitvoerformaat</span>
          <select value={fmt} onChange={(e) => setFmt(e.target.value)}>
            <option value="">Zelfde als origineel</option>
            <option value="png">PNG</option>
            <option value="jpeg">JPEG</option>
            <option value="webp">WEBP</option>
          </select>
        </label>

        <button className="btn btn-primary" disabled={files.length === 0 || busy} onClick={run}>
          {busy
            ? progress && progress.total > 1
              ? `Bezig… ${progress.done}/${progress.total}`
              : 'Bezig…'
            : files.length > 1
              ? `Verklein ${files.length} afbeeldingen`
              : 'Verkleinen'}
        </button>

        {error && <div className="banner banner-error">{error}</div>}

        {result && (
          <>
            {files.length === 1 ? (
              <div className="size-compare">
                <span>Voor: {formatBytes(files[0].size)}</span>
                <span className="arrow">→</span>
                <span>Na: {formatBytes(result.size)}</span>
              </div>
            ) : (
              <Note>{files.length} afbeeldingen verwerkt en gebundeld in één zip.</Note>
            )}
            <ResultDownload result={result} />
            {files.length === 1 && (
              <div className="tk-actions">
                <button className="btn" onClick={toPrintLayout}>
                  Stuur naar Print layout
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default ImageResize
