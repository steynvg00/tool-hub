import { JSX, useState } from 'react'
import { extractPalette, type PaletteColour } from '../lib/api'
import { FileButton } from './ToolFields'
import { ToolHeader } from './toolkit'
import { sendToPrintLayout } from '../lib/printHandoff'

// Render the palette as a clean printable image: a colour block per row with
// its hex code and share of the image.
function paletteToDataUrl(colours: PaletteColour[]): string {
  const rowH = 64
  const W = 460
  const pad = 16
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = pad * 2 + colours.length * rowH
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  colours.forEach((c, i) => {
    const y = pad + i * rowH
    ctx.fillStyle = c.hex
    ctx.fillRect(pad, y + 6, 120, rowH - 12)
    ctx.strokeStyle = '#ddd'
    ctx.strokeRect(pad, y + 6, 120, rowH - 12)
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#111'
    ctx.font = 'bold 22px ui-monospace, monospace'
    ctx.fillText(c.hex.toUpperCase(), pad + 140, y + rowH / 2 - 9)
    ctx.fillStyle = '#666'
    ctx.font = '14px sans-serif'
    ctx.fillText(`${Math.round(c.fraction * 100)}% van de afbeelding`, pad + 140, y + rowH / 2 + 14)
  })
  return canvas.toDataURL('image/png')
}

const IMAGE_PALETTE_INFO = (
  <>
    <h4>Wat doet deze tool?</h4>
    <p>
      Analyseert een afbeelding en haalt de meest voorkomende kleuren eruit. Elke kleur toont zijn
      hex-code en het percentage van het beeld dat die kleur beslaat. Klik op een staaltje om de
      hex-code naar het klembord te kopiëren.
    </p>
    <h4>Opties</h4>
    <ul>
      <li>
        <b>Afbeelding</b> &mdash; het bestand waaruit de kleuren worden gehaald.
      </li>
      <li>
        <b>Aantal kleuren</b> &mdash; hoeveel dominante kleuren (1&ndash;12) je wilt terugkrijgen.
      </li>
    </ul>
  </>
)

function ImagePalette({ openTool }: { openTool: (id: string) => void }): JSX.Element {
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
      <ToolHeader
        title="Color pick"
        subtitle="Haal de dominante kleuren op. Klik op een staaltje om de hex-code te kopiëren."
        info={IMAGE_PALETTE_INFO}
      />

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
          <>
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
            <div className="tk-actions">
              <button
                className="btn"
                style={{ width: 'auto' }}
                onClick={() => sendToPrintLayout(paletteToDataUrl(colours), openTool)}
              >
                Stuur palet naar Print layout
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ImagePalette
