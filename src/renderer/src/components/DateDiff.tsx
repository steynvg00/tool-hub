import { JSX, useState } from 'react'
import { ToolShell, Note } from './toolkit'

const MS_DAY = 86400000
const MAX_DAYS = 200000

function todayISO(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** Parse 'YYYY-MM-DD' to a UTC-midnight timestamp, or null when invalid. */
function parseUTC(value: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!m) return null
  const y = +m[1]
  const mo = +m[2]
  const d = +m[3]
  const ts = Date.UTC(y, mo - 1, d)
  const check = new Date(ts)
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d)
    return null
  return ts
}

/** Calendar breakdown jaren/maanden/dagen, stepping from start toward end. */
function breakdown(start: Date, end: Date): { years: number; months: number; days: number } {
  let years = end.getUTCFullYear() - start.getUTCFullYear()
  let months = end.getUTCMonth() - start.getUTCMonth()
  let days = end.getUTCDate() - start.getUTCDate()
  if (days < 0) {
    months -= 1
    // days in the month before `end`
    const prev = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 0))
    days += prev.getUTCDate()
  }
  if (months < 0) {
    years -= 1
    months += 12
  }
  return { years, months, days }
}

function DateDiff(): JSX.Element {
  const [van, setVan] = useState(todayISO())
  const [tot, setTot] = useState(todayISO())

  const a = parseUTC(van)
  const b = parseUTC(tot)

  const dateField = (label: string, value: string, onChange: (v: string) => void): JSX.Element => (
    <label className="tool-field">
      <span className="tool-label">{label}</span>
      <input type="date" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  )

  let body: JSX.Element
  if (a === null || b === null) {
    body = <Note>Kies twee geldige datums om het verschil te berekenen.</Note>
  } else {
    const start = Math.min(a, b)
    const end = Math.max(a, b)
    const totalDays = Math.round((end - start) / MS_DAY)
    const weeks = (totalDays / 7).toFixed(1)
    const { years, months, days } = breakdown(new Date(start), new Date(end))

    // Total calendar months (whole) + remaining days for the "maanden" row.
    let totalMonths =
      (new Date(end).getUTCFullYear() - new Date(start).getUTCFullYear()) * 12 +
      (new Date(end).getUTCMonth() - new Date(start).getUTCMonth())
    let remDays = new Date(end).getUTCDate() - new Date(start).getUTCDate()
    if (remDays < 0) {
      totalMonths -= 1
      const prev = new Date(
        Date.UTC(new Date(end).getUTCFullYear(), new Date(end).getUTCMonth(), 0)
      )
      remDays += prev.getUTCDate()
    }

    let workdays: number | string
    if (totalDays > MAX_DAYS) {
      workdays = 'te groot bereik'
    } else {
      let count = 0
      // From the day after start through end inclusive.
      for (let t = start + MS_DAY; t <= end; t += MS_DAY) {
        const dow = new Date(t).getUTCDay()
        if (dow >= 1 && dow <= 5) count++
      }
      workdays = count
    }

    body = (
      <>
        <dl className="tk-kv">
          <dt>Totaal dagen</dt>
          <dd>{totalDays}</dd>
          <dt>Weken</dt>
          <dd>{weeks}</dd>
          <dt>Kalendermaanden</dt>
          <dd>
            {totalMonths} maand{totalMonths === 1 ? '' : 'en'} en {remDays} dag
            {remDays === 1 ? '' : 'en'}
          </dd>
          <dt>Kalenderjaren</dt>
          <dd>
            {years} jaar, {months} maand{months === 1 ? '' : 'en'} en {days} dag
            {days === 1 ? '' : 'en'}
          </dd>
          <dt>Werkdagen (ma–vr)</dt>
          <dd>{workdays}</dd>
        </dl>
        {totalDays > MAX_DAYS && (
          <Note>Werkdagen niet berekend: het bereik is groter dan {MAX_DAYS} dagen.</Note>
        )}
        <Note>Werkdagen worden geteld vanaf de dag ná “Van” tot en met “Tot”.</Note>
      </>
    )
  }

  return (
    <ToolShell title="Datumverschil" subtitle="Bereken het verschil tussen twee datums.">
      <div className="panel tool-panel">
        <div className="tk-row">
          {dateField('Van', van, setVan)}
          {dateField('Tot', tot, setTot)}
        </div>
        {body}
      </div>
    </ToolShell>
  )
}

export default DateDiff
