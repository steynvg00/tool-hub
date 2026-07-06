import { JSX, useState } from 'react'
import { ToolShell, Note } from './toolkit'

function todayLocalDate(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Parse a 'YYYY-MM-DD' string into UTC parts, or null. */
function parseDate(v: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v)
  if (!m) return null
  return { y: +m[1], m: +m[2], d: +m[3] }
}

function daysInMonth(y: number, m: number): number {
  // m is 1-based; day 0 of next month = last day of this month
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

function AgeCalc(): JSX.Element {
  const [birth, setBirth] = useState('')
  const [ref, setRef] = useState(todayLocalDate())

  const b = parseDate(birth)
  const r = parseDate(ref)

  let content: JSX.Element
  if (!b || !r) {
    content = <Note>Vul een geldige geboortedatum en referentiedatum in.</Note>
  } else {
    const bMs = Date.UTC(b.y, b.m - 1, b.d)
    const rMs = Date.UTC(r.y, r.m - 1, r.d)
    if (bMs > rMs) {
      content = <Note>De geboortedatum ligt na de referentiedatum.</Note>
    } else {
      let years = r.y - b.y
      let months = r.m - b.m
      let days = r.d - b.d

      if (days < 0) {
        // borrow from the month before the reference month
        months -= 1
        const pm = r.m - 1 === 0 ? 12 : r.m - 1
        const pmYear = r.m - 1 === 0 ? r.y - 1 : r.y
        days += daysInMonth(pmYear, pm)
      }
      if (months < 0) {
        months += 12
        years -= 1
      }

      const totalDays = Math.round((rMs - bMs) / 86400000)

      content = (
        <>
          <div className="tk-readout">
            {years} jaar, {months} maanden, {days} dagen
          </div>
          <dl className="tk-kv">
            <dt>Jaren</dt>
            <dd>{years}</dd>
            <dt>Maanden</dt>
            <dd>{months}</dd>
            <dt>Dagen</dt>
            <dd>{days}</dd>
            <dt>Totaal dagen geleefd</dt>
            <dd>{totalDays.toLocaleString('nl-NL')}</dd>
          </dl>
        </>
      )
    }
  }

  return (
    <ToolShell title="Leeftijd-calculator" subtitle="Bereken de exacte leeftijd in jaren, maanden en dagen.">
      <div className="panel tool-panel">
        <label className="tool-field">
          <span className="tool-label">Geboortedatum</span>
          <input type="date" value={birth} onChange={(e) => setBirth(e.target.value)} />
        </label>
        <label className="tool-field">
          <span className="tool-label">Op datum</span>
          <input type="date" value={ref} onChange={(e) => setRef(e.target.value)} />
        </label>
        {content}
      </div>
    </ToolShell>
  )
}

export default AgeCalc
