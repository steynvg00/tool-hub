import { JSX, useState } from 'react'
import { ToolShell, TextInput, Segmented, ErrorBanner, CopyButton } from './toolkit'

type Unit = 's' | 'ms'

function toDatetimeLocal(d: Date): string {
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

function UnixTime(): JSX.Element {
  const [ts, setTs] = useState('')
  const [unit, setUnit] = useState<Unit>('s')
  const [dt, setDt] = useState('')

  // Direction A: timestamp -> datum
  let aError: string | null = null
  let aUtc = ''
  let aLocal = ''
  if (ts.trim()) {
    const n = Number(ts.trim())
    if (!Number.isFinite(n)) {
      aError = 'Ongeldig getal.'
    } else {
      const ms = unit === 's' ? n * 1000 : n
      const d = new Date(ms)
      if (Number.isNaN(d.getTime())) {
        aError = 'Timestamp buiten bereik.'
      } else {
        aUtc = d.toUTCString()
        aLocal = d.toLocaleString('nl-NL', { dateStyle: 'full', timeStyle: 'long' })
      }
    }
  }

  // Direction B: datum -> timestamp
  let bSec = ''
  let bMs = ''
  if (dt) {
    const t = new Date(dt).getTime()
    if (Number.isFinite(t)) {
      bSec = String(Math.floor(t / 1000))
      bMs = String(t)
    }
  }

  const nu = (): void => {
    const d = new Date()
    setTs(unit === 's' ? String(Math.floor(d.getTime() / 1000)) : String(d.getTime()))
    setDt(toDatetimeLocal(d))
  }

  return (
    <ToolShell title="Unix-timestamp ↔ datum" subtitle="Zet timestamps om naar data en andersom.">
      <div className="panel tool-panel">
        <div className="tk-actions">
          <button className="btn" onClick={nu}>
            Nu
          </button>
        </div>
      </div>

      <div className="panel tool-panel">
        <h2 style={{ fontSize: 16, margin: 0 }}>Timestamp → datum</h2>
        <TextInput label="Timestamp" value={ts} onChange={setTs} mono placeholder="1700000000" />
        <label className="tool-field">
          <span className="tool-label">Eenheid</span>
          <Segmented<Unit>
            options={[
              { value: 's', label: 'Seconden' },
              { value: 'ms', label: 'Milliseconden' }
            ]}
            value={unit}
            onChange={setUnit}
          />
        </label>
        <ErrorBanner message={aError} />
        {aUtc && (
          <dl className="tk-kv">
            <dt>UTC</dt>
            <dd>{aUtc}</dd>
            <dt>Lokaal</dt>
            <dd>{aLocal}</dd>
          </dl>
        )}
      </div>

      <div className="panel tool-panel">
        <h2 style={{ fontSize: 16, margin: 0 }}>Datum → timestamp</h2>
        <label className="tool-field">
          <span className="tool-label">Datum en tijd</span>
          <input type="datetime-local" value={dt} onChange={(e) => setDt(e.target.value)} />
        </label>
        {bSec && (
          <>
            <div className="tk-row">
              <TextInput label="Seconden" value={bSec} onChange={() => {}} mono />
              <CopyButton value={bSec} />
            </div>
            <div className="tk-row">
              <TextInput label="Milliseconden" value={bMs} onChange={() => {}} mono />
              <CopyButton value={bMs} />
            </div>
          </>
        )}
      </div>
    </ToolShell>
  )
}

export default UnixTime
