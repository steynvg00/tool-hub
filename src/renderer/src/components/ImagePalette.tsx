import { JSX, useEffect, useRef, useState } from 'react'
import { extractPalette, type PaletteColour } from '../lib/api'
import { FileButton } from './ToolFields'
import { ToolHeader, CopyButton } from './toolkit'
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

const toHex = (n: number): string => n.toString(16).padStart(2, '0')

const IMAGE_PALETTE_INFO = (
  <>
    <h4>Wat doet deze tool?</h4>
    <p>
      Analyseert een afbeelding en haalt de meest voorkomende kleuren eruit, óf laat je met de pipet
      een exacte kleur op een specifieke plek prikken.
    </p>
    <h4>Opties</h4>
    <ul>
      <li>
        <b>Aantal kleuren</b> &mdash; hoeveel dominante kleuren (1&ndash;12) je uit de hele
        afbeelding wilt terugkrijgen. Klik op een staaltje om de hex-code te kopiëren.
      </li>
      <li>
        <b>Pipet</b> &mdash; klik ergens in de voorbeeldweergave om de exacte kleur van díe pixel te
        samplen. De gekozen kleur verschijnt als hex en rgb met kopieerknoppen.
      </li>
    </ul>
  </>
)

function ImagePalette({ openTool }: { openTool: (id: string) => void }): JSX.Element {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [count, setCount] = useState(6)
  const [colours, setColours] = useState<PaletteColour[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [picked, setPicked] = useState<{ hex: string; rgb: [number, number, number] } | null>(null)

  const imgRef = useRef<HTMLImageElement>(null)
  // Full-resolution offscreen copy of the source, so the pipet samples the exact
  // source pixel regardless of how small the on-screen preview is drawn.
  const sampleCanvas = useRef<HTMLCanvasElement | null>(null)

  // Build the preview URL + the full-res sampling canvas whenever the file changes.
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      sampleCanvas.current = null
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = img.naturalWidth
      c.height = img.naturalHeight
      c.getContext('2d')?.drawImage(img, 0, 0)
      sampleCanvas.current = c
    }
    img.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])

  const pick = (f: File | null): void => {
    setFile(f)
    setColours(null)
    setPicked(null)
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

  // Sample the exact pixel under the click from the full-res canvas.
  const sampleAt = (e: React.MouseEvent<HTMLImageElement>): void => {
    const img = imgRef.current
    const canvas = sampleCanvas.current
    if (!img || !canvas) return
    const rect = img.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    const px = Math.min(canvas.width - 1, Math.floor(((e.clientX - rect.left) / rect.width) * canvas.width))
    const py = Math.min(canvas.height - 1, Math.floor(((e.clientY - rect.top) / rect.height) * canvas.height))
    const d = canvas.getContext('2d')?.getImageData(px, py, 1, 1).data
    if (!d) return
    const rgb: [number, number, number] = [d[0], d[1], d[2]]
    setPicked({ hex: `#${toHex(d[0])}${toHex(d[1])}${toHex(d[2])}`, rgb })
  }

  return (
    <div className="tool">
      <ToolHeader
        title="Color pick"
        subtitle="Haal de dominante kleuren op of prik met de pipet een exacte kleur uit de afbeelding."
        info={IMAGE_PALETTE_INFO}
      />

      <div className="panel tool-panel">
        <FileButton label="Afbeelding" accept="image/*" file={file} onPick={pick} />

        {previewUrl && (
          <div className="thumb">
            <div className="source-preview checkerboard">
              <img
                ref={imgRef}
                className="ip-sample"
                src={previewUrl}
                alt="bron"
                onClick={sampleAt}
                draggable={false}
              />
            </div>
            <span className="thumb-name">Klik in de afbeelding om een kleur te prikken (pipet).</span>
          </div>
        )}

        {picked && (
          <div className="ip-picked">
            <span className="ip-pick-chip" style={{ background: picked.hex }} />
            <div className="ip-pick-codes">
              <div className="ip-pick-row">
                <code>{picked.hex}</code>
                <CopyButton value={picked.hex} />
              </div>
              <div className="ip-pick-row">
                <code>rgb({picked.rgb.join(', ')})</code>
                <CopyButton value={`rgb(${picked.rgb.join(', ')})`} />
              </div>
            </div>
          </div>
        )}

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
