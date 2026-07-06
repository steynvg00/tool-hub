import { JSX, useState } from 'react'
import { extractPalette, type PaletteColour } from '../lib/api'
import { FileButton } from './ToolFields'

function ImagePalette(): JSX.Element {
  const [file, setFile] = useState<File | null>(null)
  const [count, setCount] = useState(6)
  const [colours, setColours] = useState<PaletteColour[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const pick = (f: File | null): void => {
    setFile(f)
    setColours(null)
    setError(null)
  }

  const run = async (): Promise<void> => {
    if (!file) return
    setBusy(true)
    setError(null)
    setColours(null)
    try {
      setColours(await extractPalette(file, count))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const copy = async (hex: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(hex)
      setCopied(hex)
      window.setTimeout(() => setCopied((c) => (c === hex ? null : c)), 1200)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="tool">
      <header className="tool-header">
        <h1>Color pick</h1>
        <p>Haal de dominante kleuren op. Klik op een staaltje om de hex-code te kopiëren.</p>
      </header>

      <div className="panel tool-panel">
        <FileButton label="Afbeelding" accept="image/*" file={file} onPick={pick} />

        <div className="tool-field">
          <label className="tool-label">Aantal kleuren: {count}</label>
          <input
            type="range"
            min={1}
            max={12}
            value={count}
            onChange={(e) => setCount(+e.target.value)}
          />
        </div>

        <button className="btn btn-primary" disabled={!file || busy} onClick={run}>
          {busy ? 'Bezig…' : 'Kleuren ophalen'}
        </button>

        {error && <div className="banner banner-error">{error}</div>}

        {colours && (
          <div className="swatches">
            {colours.map((c) => (
              <button
                key={c.hex}
                className="swatch"
                title="Klik om te kopiëren"
                onClick={() => copy(c.hex)}
              >
                <span className="swatch-chip" style={{ background: c.hex }} />
                <span className="swatch-hex">{copied === c.hex ? 'Gekopieerd!' : c.hex}</span>
                <span className="swatch-pct">{Math.round(c.fraction * 100)}%</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ImagePalette
