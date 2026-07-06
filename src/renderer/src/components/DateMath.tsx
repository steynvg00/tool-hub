import { JSX, useState } from 'react'
import { ToolShell, Segmented, Note } from './toolkit'
import { NumberField } from './ToolFields'

type Op = 'add' | 'sub'
type Unit = 'days' | 'weeks' | 'months' | 'years'

function todayISO(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** Parse 'YYYY-MM-DD' into a local Date, or null when invalid. */
function parseLocal(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!m) return null
  const d = new Date(+m[1], +m[2] - 1, +m[3])
  if (d.getFullYear() !== +m[1] || d.getMonth() !== +m[2] - 1 || d.getDate() !== +m[3]) return null
  return d
}

/** ISO 8601 week number and week-year for a date. */
function isoWeek(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1)
  const week = Math.ceil(((d.getTime() - yearStart) / 86400000 + 1) / 7)
  return { week, year: d.getUTCFullYear() }
}

function compute(start: Date, op: Op, amount: number, unit: Unit): Date {
  const sign = op === 'sub' ? -1 : 1
  const n = sign * amount
  const d = new Date(start)
  if (unit === 'days') d.setDate(d.getDate() + n)
  else if (unit === 'weeks') d.setDate(d.getDate() + n * 7)
  else if (unit === 'months') d.setMonth(d.getMonth() + n)
  else d.setFullYear(d.getFullYear() + n)
  return d
}

function DateMath(): JSX.Element {
  const [startStr, setStartStr] = useState(todayISO())
  const [op, setOp] = useState<Op>('add')
  const [amount, setAmount] = useState(7)
  const [unit, setUnit] = useState<Unit>('days')

  const start = parseLocal(startStr)

  let body: JSX.Element
  if (start === null) {
    body = <Note>Kies een geldige startdatum.</Note>
  } else {
    const d = compute(start, op, amount, unit)
    const { week, year } = isoWeek(d)
    body = (
      <dl className="tk-kv">
        <dt>Resultaatdatum</dt>
        <dd>{d.toLocaleDateString('nl-NL', { dateStyle: 'full' })}</dd>
        <dt>Weekdag</dt>
        <dd>{d.toLocaleDateString('nl-NL', { weekday: 'long' })}</dd>
        <dt>ISO-weeknummer</dt>
        <dd>
          week {week} ({year})
        </dd>
      </dl>
    )
  }

  return (
    <ToolShell
      title="Datum-rekenen"
      subtitle="Tel een periode op bij of trek deze af van een datum."
    >
      <div className="panel tool-panel">
        <label className="tool-field">
          <span className="tool-label">Startdatum</span>
          <input type="date" value={startStr} onChange={(e) => setStartStr(e.target.value)} />
        </label>

        <div className="tool-field">
          <span className="tool-label">Bewerking</span>
          <Segmented<Op>
            options={[
              { value: 'add', label: 'Optellen' },
              { value: 'sub', label: 'Aftrekken' }
            ]}
            value={op}
            onChange={setOp}
          />
        </div>

        <NumberField label="Aantal" value={amount} min={0} onChange={setAmount} />

        <div className="tool-field">
          <span className="tool-label">Eenheid</span>
          <Segmented<Unit>
            options={[
              { value: 'days', label: 'Dagen' },
              { value: 'weeks', label: 'Weken' },
              { value: 'months', label: 'Maanden' },
              { value: 'years', label: 'Jaren' }
            ]}
            value={unit}
            onChange={setUnit}
          />
        </div>

        {body}
      </div>
    </ToolShell>
  )
}

export default DateMath
