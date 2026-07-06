import { JSX, useState } from 'react'
import { ToolShell } from './toolkit'
import { harmony, type HarmonyType } from '../lib/colorHarmony'

const TYPES: { type: HarmonyType; label: string }[] = [
  { type: 'complementary', label: 'Complementair' },
  { type: 'analogous', label: 'Analoog' },
  { type: 'triadic', label: 'Triadisch' },
  { type: 'tetradic', label: 'Tetradisch' },
  { type: 'split-complementary', label: 'Split-complementair' },
  { type: 'monochromatic', label: 'Monochroom' }
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

const COLOR_HARMONIES_INFO = (
  <>
    <h4>Wat doet deze tool?</h4>
    <p>
      Toont de klassieke kleurharmonieën die horen bij één gekozen kleur. Elke harmonie is een
      vaste manier om kleuren op het kleurenwiel te combineren. Klik op een staal om de{' '}
      <code>hex</code>-code te kopiëren.
    </p>
    <h4>Harmonieën</h4>
    <ul>
      <li>
        <b>Complementair</b> — de kleur recht tegenover de jouwe (180°).
      </li>
      <li>
        <b>Analoog</b> — buurkleuren dicht bij de basiskleur.
      </li>
      <li>
        <b>Triadisch</b> — drie kleuren gelijkmatig verdeeld (120°).
      </li>
      <li>
        <b>Tetradisch</b> — vier kleuren in twee complementaire paren.
      </li>
      <li>
        <b>Split-complementair</b> — de basiskleur plus de twee buren van zijn complement.
      </li>
      <li>
        <b>Monochroom</b> — dezelfde tint in verschillende lichtheden.
      </li>
    </ul>
  </>
)

function ColorHarmonies(): JSX.Element {
  const [hex, setHex] = useState('#4a6cd4')

  return (
    <ToolShell
      title="Kleurharmonieën"
      subtitle="Bekijk klassieke kleurharmonieën op basis van één kleur."
      info={COLOR_HARMONIES_INFO}
    >
      <div className="panel">
        <div className="tool-field">
          <label className="tool-label">Kies een kleur</label>
          <input
            type="color"
            value={hex}
            onChange={(e) => setHex(e.target.value)}
            style={{ width: 64, height: 40, padding: 0, border: 'none', background: 'none' }}
          />
        </div>
      </div>

      <div className="panel">
        {TYPES.map(({ type, label }) => (
          <div className="tk-harmony-group" key={type}>
            <h3>{label}</h3>
            <div className="swatches">
              {harmony(hex, type).map((c, i) => (
                <CopySwatch key={`${type}-${c}-${i}`} hex={c} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </ToolShell>
  )
}

export default ColorHarmonies
