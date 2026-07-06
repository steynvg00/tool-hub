import { JSX, useState } from 'react'
import { processToFile, formatBytes } from '../lib/api'
import { useFileResult } from '../lib/useFileResult'
import { FileButton, NumberField, ResultDownload } from './ToolFields'
import { ToolHeader } from './toolkit'

type Mode = 'max' | 'exact'

const IMAGE_RESIZE_INFO = (
  <>
    <h4>Wat doet deze tool?</h4>
    <p>
      Schaalt een afbeelding naar een kleinere maat of naar exacte afmetingen en slaat het
      resultaat op in het gekozen formaat.
    </p>
    <h4>Opties</h4>
    <ul>
      <li>
        <b>Modus &mdash; Langste zijde</b> &mdash; verkleint de afbeelding zodat de langste zijde
        de opgegeven grootte krijgt; de verhouding blijft behouden.
      </li>
      <li>
        <b>Modus &mdash; Exacte maat</b> &mdash; forceert een exacte breedte en hoogte in pixels.
      </li>
      <li>
        <b>Max. zijde (px)</b> &mdash; maximale lengte van de langste zijde in de modus Langste
        zijde.
      </li>
      <li>
        <b>Breedte / Hoogte (px)</b> &mdash; de doelafmetingen in de modus Exacte maat.
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

function ImageResize(): JSX.Element {
  const [file, setFile] = useState<File | null>(null)
  const [mode, setMode] = useState<Mode>('max')
  const [maxDim, setMaxDim] = useState(1200)
  const [width, setWidth] = useState(800)
  const [height, setHeight] = useState(600)
  const [quality, setQuality] = useState(85)
  const [fmt, setFmt] = useState('') // '' = keep source format
  const [result, setResult] = useFileResult()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pick = (f: File | null): void => {
    setFile(f)
    setResult(null)
    setError(null)
  }

  const run = async (): Promise<void> => {
    if (!file) return
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const form = new FormData()
      form.append('image', file)
      if (mode === 'max') form.append('max_dim', String(maxDim))
      else {
        form.append('width', String(width))
        form.append('height', String(height))
      }
      form.append('quality', String(quality))
      if (fmt) form.append('fmt', fmt)
      setResult(await processToFile('/image/resize', form, 'resized'))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="tool">
      <ToolHeader
        title="Afbeelding schalen"
        subtitle="Schaal een afbeelding naar een kleinere maat of exacte afmetingen."
        info={IMAGE_RESIZE_INFO}
      />

      <div className="panel tool-panel">
        <FileButton label="Afbeelding" accept="image/*" file={file} onPick={pick} />

        <div className="tool-field">
          <label className="tool-label">Modus</label>
          <div className="tool-seg">
            <button className={mode === 'max' ? 'on' : ''} onClick={() => setMode('max')}>
              Langste zijde
            </button>
            <button className={mode === 'exact' ? 'on' : ''} onClick={() => setMode('exact')}>
              Exacte maat
            </button>
          </div>
        </div>

        {mode === 'max' ? (
          <NumberField label="Max. zijde (px)" value={maxDim} min={16} max={8000} onChange={setMaxDim} />
        ) : (
          <div className="field-row">
            <NumberField label="Breedte (px)" value={width} min={1} max={10000} onChange={setWidth} />
            <NumberField label="Hoogte (px)" value={height} min={1} max={10000} onChange={setHeight} />
          </div>
        )}

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

        <button className="btn btn-primary" disabled={!file || busy} onClick={run}>
          {busy ? 'Bezig…' : 'Verkleinen'}
        </button>

        {error && <div className="banner banner-error">{error}</div>}

        {result && file && (
          <>
            <div className="size-compare">
              <span>Voor: {formatBytes(file.size)}</span>
              <span className="arrow">→</span>
              <span>Na: {formatBytes(result.size)}</span>
            </div>
            <ResultDownload result={result} />
          </>
        )}
      </div>
    </div>
  )
}

export default ImageResize
