import { JSX, useState } from 'react'
import { ToolShell, CopyButton, Note } from './toolkit'
import { complementary, invert, contrastText } from '../lib/colorHarmony'

function OppositeColor(): JSX.Element {
  const [hex, setHex] = useState('#4a6cd4')

  const comp = complementary(hex)
  const inv = invert(hex)
  const text = contrastText(hex)

  return (
    <ToolShell
      title="Tegenovergestelde kleur"
      subtitle="Vind de complementaire kleur, de RGB-inversie en de best leesbare tekstkleur."
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
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 14
          }}
        >
          <div>
            <label className="tool-label">Complementair</label>
            <div className="tk-color-preview" style={{ background: comp }} />
            <div className="tk-row" style={{ marginTop: 8 }}>
              <span className="tk-mono">{comp}</span>
              <CopyButton value={comp} />
            </div>
          </div>

          <div>
            <label className="tool-label">RGB-inversie</label>
            <div className="tk-color-preview" style={{ background: inv }} />
            <div className="tk-row" style={{ marginTop: 8 }}>
              <span className="tk-mono">{inv}</span>
              <CopyButton value={inv} />
            </div>
          </div>

          <div>
            <label className="tool-label">Beste leesbare tekstkleur</label>
            <div
              className="tk-color-preview"
              style={{
                background: hex,
                color: text,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                fontWeight: 600
              }}
            >
              Aa Tekst
            </div>
            <div className="tk-row" style={{ marginTop: 8 }}>
              <span className="tk-mono">{text}</span>
              <span>({text === '#000000' ? 'zwart' : 'wit'})</span>
              <CopyButton value={text} />
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <Note>
          De complementaire kleur (de design-tegenpool, 180° op het kleurenwiel) is iets ANDERS
          dan de RGB-inversie. Bij inversie wordt elk kanaal berekend als 255 − de waarde, wat
          meestal een andere kleur oplevert dan de complementaire tint.
        </Note>
      </div>
    </ToolShell>
  )
}

export default OppositeColor
