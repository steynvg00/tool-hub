import { JSX, useEffect, useState } from 'react'
import { ToolShell, Note, StatRow } from './toolkit'

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
    <ToolShell title="Aftellen naar datum" subtitle="Tel live af naar een doeldatum en -tijd.">
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
