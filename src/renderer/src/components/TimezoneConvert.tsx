import { JSX, useState } from 'react'
import { ToolShell, Note } from './toolkit'

const ZONES = [
  'UTC',
  'Europe/Amsterdam',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Moscow',
  'Europe/Istanbul',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'America/Mexico_City',
  'America/Toronto',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Asia/Singapore',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Jakarta',
  'Australia/Sydney',
  'Pacific/Auckland',
  'Africa/Johannesburg'
]

/** Offset (ms) of a timezone at a given instant: (wall-as-UTC) - instant. */
function tzOffsetMs(tz: string, instant: number): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
  const p = Object.fromEntries(
    dtf
      .formatToParts(new Date(instant))
      .filter((x) => x.type !== 'literal')
      .map((x) => [x.type, +x.value])
  ) as Record<string, number>
  const asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour === 24 ? 0 : p.hour, p.minute, p.second)
  return asUTC - instant
}

function fmt(instant: number, zone: string): string {
  return new Intl.DateTimeFormat('nl-NL', { timeZone: zone, dateStyle: 'full', timeStyle: 'long' }).format(
    new Date(instant)
  )
}

const TIMEZONE_CONVERT_INFO = (
  <>
    <h4>Wat doet deze tool?</h4>
    <p>
      Zet een tijd om van de ene tijdzone naar de andere. De tool houdt rekening met zomertijd en
      toont naast het resultaat ook het bijbehorende moment in UTC.
    </p>
    <h4>Opties</h4>
    <ul>
      <li>
        <b>Tijd</b> — de datum en tijd zoals die geldt in de bronzone.
      </li>
      <li>
        <b>Van zone</b> — de tijdzone waarin de opgegeven tijd geldt.
      </li>
      <li>
        <b>Naar zone</b> — de tijdzone waarnaar de tijd wordt omgezet.
      </li>
    </ul>
  </>
)

function TimezoneConvert(): JSX.Element {
  const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const [wall, setWall] = useState('')
  const [vanTz, setVanTz] = useState(ZONES.includes(localZone) ? localZone : 'Europe/Amsterdam')
  const [naarTz, setNaarTz] = useState('UTC')

  const zoneOptions = ZONES.includes(localZone) ? ZONES : [localZone, ...ZONES]

  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(wall)

  let content: JSX.Element
  if (!m) {
    content = <Note>Kies een tijd om om te zetten.</Note>
  } else {
    const y = +m[1]
    const mo = +m[2]
    const d = +m[3]
    const h = +m[4]
    const mi = +m[5]
    const guess = Date.UTC(y, mo - 1, d, h, mi)
    const off = tzOffsetMs(vanTz, guess)
    let utc = guess - off
    // refine once for DST edges
    utc = guess - tzOffsetMs(vanTz, utc)

    content = (
      <dl className="tk-kv">
        <dt>Bron ({vanTz})</dt>
        <dd>{fmt(utc, vanTz)}</dd>
        <dt>Resultaat ({naarTz})</dt>
        <dd>{fmt(utc, naarTz)}</dd>
        <dt>UTC ISO</dt>
        <dd className="tk-mono">{new Date(utc).toISOString()}</dd>
      </dl>
    )
  }

  return (
    <ToolShell
      title="Tijdzone-omzetter"
      subtitle="Zet een tijd om van de ene tijdzone naar de andere."
      info={TIMEZONE_CONVERT_INFO}
    >
      <div className="panel tool-panel">
        <label className="tool-field">
          <span className="tool-label">Tijd</span>
          <input type="datetime-local" value={wall} onChange={(e) => setWall(e.target.value)} />
        </label>
        <div className="tk-two">
          <label className="tool-field">
            <span className="tool-label">Van zone</span>
            <select value={vanTz} onChange={(e) => setVanTz(e.target.value)}>
              {zoneOptions.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </label>
          <label className="tool-field">
            <span className="tool-label">Naar zone</span>
            <select value={naarTz} onChange={(e) => setNaarTz(e.target.value)}>
              {zoneOptions.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </label>
        </div>
        {content}
      </div>
    </ToolShell>
  )
}

export default TimezoneConvert
