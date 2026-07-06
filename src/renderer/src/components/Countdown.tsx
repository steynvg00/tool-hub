import { JSX, useEffect, useState } from 'react'
import { ToolShell, Note, StatRow } from './toolkit'

const COUNTDOWN_INFO = (
  <>
    <h4>Wat doet deze tool?</h4>
    <p>
      Telt live af naar een gekozen doeldatum en -tijd en toont de resterende dagen, uren,
      minuten en seconden. Zodra het moment is bereikt, laat de tool zien hoeveel tijd er sindsdien
      verstreken is.
    </p>
    <h4>Opties</h4>
    <ul>
      <li>
        <b>Doeldatum</b> — de datum en tijd waarnaar wordt afgeteld, in je lokale tijdzone.
      </li>
    </ul>
  </>
)

function Countdown(): JSX.Element {
  const [target, setTarget] = useState('')
  const [now, setNow] = useState(() => Date.now())

  const targetMs = target ? new Date(target).getTime() : NaN
  const valid = Number.isFinite(targetMs)

  useEffect(() => {
    if (!valid) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [valid, target])

  let content: JSX.Element
  if (!valid) {
    content = <Note>Kies een geldige doeldatum en -tijd.</Note>
  } else {
    const ms = targetMs - now
    if (ms <= 0) {
      const elapsed = -ms
      const s = Math.floor(elapsed / 1000)
      const dagen = Math.floor(s / 86400)
      const uren = Math.floor((s % 86400) / 3600)
      const minuten = Math.floor((s % 3600) / 60)
      const seconden = s % 60
      content = (
        <>
          <div className="tk-readout tk-no">Verlopen</div>
          <StatRow
            stats={[
              { label: 'Dagen', value: dagen },
              { label: 'Uren', value: uren },
              { label: 'Minuten', value: minuten },
              { label: 'Seconden', value: seconden }
            ]}
          />
        </>
      )
    } else {
      const s = Math.floor(ms / 1000)
      const dagen = Math.floor(s / 86400)
      const uren = Math.floor((s % 86400) / 3600)
      const minuten = Math.floor((s % 3600) / 60)
      const seconden = s % 60
      content = (
        <>
          <div className="tk-readout">
            {dagen}d {uren}u {minuten}m {seconden}s
          </div>
          <StatRow
            stats={[
              { label: 'Dagen', value: dagen },
              { label: 'Uren', value: uren },
              { label: 'Minuten', value: minuten },
              { label: 'Seconden', value: seconden }
            ]}
          />
        </>
      )
    }
  }

  return (
    <ToolShell
      title="Aftellen naar datum"
      subtitle="Tel live af naar een doeldatum en -tijd."
      info={COUNTDOWN_INFO}
    >
      <div className="panel tool-panel">
        <label className="tool-field">
          <span className="tool-label">Doeldatum</span>
          <input type="datetime-local" value={target} onChange={(e) => setTarget(e.target.value)} />
        </label>
        {content}
      </div>
    </ToolShell>
  )
}

export default Countdown
