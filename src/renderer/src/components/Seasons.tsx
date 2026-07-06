import { JSX, useState } from 'react'
import { ToolShell, Note } from './toolkit'
import { NumberField } from './ToolFields'
import { seasonsForYear } from '../lib/seasons'

const MAX_RANGE = 50
const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone

function formatLocal(d: Date): string {
  return d.toLocaleString('nl-NL', { dateStyle: 'full', timeStyle: 'short' })
}

const SEASONS_INFO = (
  <>
    <h4>Wat doet deze tool?</h4>
    <p>
      Toont de exacte astronomische momenten van de seizoenswisselingen: de lente- en
      herfstequinox en de zomer- en winterzonnewende. De tijden worden weergegeven in jouw
      lokale tijdzone en zijn benaderd tot op de minuut.
    </p>
    <h4>Opties</h4>
    <ul>
      <li>
        <b>Jaar</b> — het jaar waarvoor de vier seizoensmomenten worden berekend.
      </li>
      <li>
        <b>Van</b> en <b>Tot</b> — begin- en eindjaar van een bereik dat de seizoenen per jaar
        in een tabel zet. <code>Tot</code> moet gelijk zijn aan of groter dan <code>Van</code>.
      </li>
    </ul>
  </>
)

function Seasons(): JSX.Element {
  const now = new Date().getFullYear()
  const [year, setYear] = useState(now)
  const [van, setVan] = useState(now)
  const [tot, setTot] = useState(now + 4)

  const seasons = seasonsForYear(year)

  const rows: { year: number; seasons: ReturnType<typeof seasonsForYear> }[] = []
  let capped = false
  if (tot >= van) {
    let end = tot
    if (end - van + 1 > MAX_RANGE) {
      end = van + MAX_RANGE - 1
      capped = true
    }
    for (let y = van; y <= end; y++) rows.push({ year: y, seasons: seasonsForYear(y) })
  }

  return (
    <ToolShell
      title="Astronomische seizoenen"
      subtitle="De exacte momenten van de equinoxen en zonnewenden, in jouw tijdzone."
      info={SEASONS_INFO}
    >
      <div className="panel tool-panel">
        <NumberField label="Jaar" value={year} onChange={setYear} />
        <dl className="tk-kv">
          {seasons.map((s) => (
            <div key={s.name} style={{ display: 'contents' }}>
              <dt>{s.name}</dt>
              <dd>{formatLocal(s.date)}</dd>
            </div>
          ))}
        </dl>
        <Note>
          Dit zijn de astronomische momenten (equinoxen en zonnewenden), weergegeven in jouw
          tijdzone ({TZ}), benaderd tot op de minuut.
        </Note>
      </div>

      <div className="panel tool-panel">
        <div className="tk-row">
          <NumberField label="Van" value={van} onChange={setVan} />
          <NumberField label="Tot" value={tot} onChange={setTot} />
        </div>
        {tot < van ? (
          <Note>“Tot” moet gelijk zijn aan of groter dan “Van”.</Note>
        ) : (
          <>
            {capped && (
              <Note>
                Bereik beperkt tot de eerste {MAX_RANGE} jaar vanaf {van}.
              </Note>
            )}
            <div className="tk-table-wrap">
              <table className="tk-table">
                <thead>
                  <tr>
                    <th>Jaar</th>
                    <th>Lente</th>
                    <th>Zomer</th>
                    <th>Herfst</th>
                    <th>Winter</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.year}>
                      <td>{r.year}</td>
                      {r.seasons.map((s) => (
                        <td key={s.name}>{formatLocal(s.date)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </ToolShell>
  )
}

export default Seasons
