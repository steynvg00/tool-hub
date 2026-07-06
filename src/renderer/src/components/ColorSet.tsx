import { JSX, useState } from 'react'
import { ToolShell, Segmented, Note } from './toolkit'
import { NumberField } from './ToolFields'
import { palette, type PaletteMode } from '../lib/colorHarmony'

const MODES: { value: PaletteMode; label: string }[] = [
  { value: 'harmonious', label: 'Harmonisch' },
  { value: 'analogous', label: 'Analoog' },
  { value: 'monochromatic', label: 'Monochroom' }
]

/** Klikbare swatch die zijn hex kopieert. */
function CopySwatch({ hex }: { hex: string }): JSX.Element {
  const [copied, setCopied] = useState(false)
  const copy = (): void => {
    navigator.clipboard.writeText(hex).then(
      () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1000)
      },
      () => undefined
    )
  }
  return (
    <button className="swatch" onClick={copy} title="Klik om te kopiëren">
      <span className="swatch-chip" style={{ background: hex, height: 64 }} />
      <span className="swatch-hex">
        {hex}
        {copied && <span className="tk-copied-hint">gekopieerd</span>}
      </span>
    </button>
  )
}

function ColorSet(): JSX.Element {
  const [hex, setHex] = useState('#4a6cd4')
  const [count, setCount] = useState(5)
  const [mode, setMode] = useState<PaletteMode>('harmonious')

  const colors = palette(hex, count, mode)

  return (
    <ToolShell
      title="Kleurenset-generator"
      subtitle="Genereer een set passende kleuren op basis van één basiskleur."
    >
      <div className="panel">
        <div className="tool-field">
          <label className="tool-label">Basiskleur</label>
          <input
            type="color"
            value={hex}
            onChange={(e) => setHex(e.target.value)}
            style={{ width: 64, height: 40, padding: 0, border: 'none', background: 'none' }}
          />
        </div>
        <NumberField label="Aantal" value={count} min={1} max={12} onChange={setCount} />
        <div className="tool-field">
          <label className="tool-label">Modus</label>
          <Segmented options={MODES} value={mode} onChange={setMode} />
        </div>
      </div>

      <div className="panel">
        <div className="swatches">
          {colors.map((c, i) => (
            <CopySwatch key={`${c}-${i}`} hex={c} />
          ))}
        </div>
        <Note>Klik op een kleur om de hex-code te kopiëren.</Note>
      </div>
    </ToolShell>
  )
}

export default ColorSet
