import { JSX, useState } from 'react'
import { ToolShell, Note } from './toolkit'
import { NumberField } from './ToolFields'

function isLeap(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
}

const MAX_RANGE = 500

const LEAP_YEAR_INFO = (
  <>
    <h4>Wat doet deze tool?</h4>
    <p>
      Controleert of een jaar een schrikkeljaar is en toont alle schrikkeljaren binnen een
      opgegeven bereik. Een jaar is een schrikkeljaar als het deelbaar is door 4, behalve
      eeuwjaren die niet door 400 deelbaar zijn.
    </p>
    <h4>Opties</h4>
    <ul>
      <li>
        <b>Jaar</b> — het jaar dat je wilt controleren op schrikkeljaar.
      </li>
      <li>
        <b>Van</b> en <b>Tot</b> — begin- en eindjaar van het bereik waarin schrikkeljaren
        worden opgesomd. <code>Tot</code> moet gelijk zijn aan of groter dan <code>Van</code>.
      </li>
    </ul>
  </>
)

function LeapYear(): JSX.Element {
  const now = new Date().getFullYear()
  const [year, setYear] = useState(now)
  const [van, setVan] = useState(now)
  const [tot, setTot] = useState(now + 20)

  const leap = isLeap(year)

  const years: number[] = []
  let capped = false
  if (tot >= van) {
    let end = tot
    if (end - van + 1 > MAX_RANGE) {
      end = van + MAX_RANGE - 1
      capped = true
    }
    for (let y = van; y <= end; y++) if (isLeap(y)) years.push(y)
  }

  return (
    <ToolShell
      title="Schrikkeljaar-checker"
      subtitle="Controleer of een jaar een schrikkeljaar is."
      info={LEAP_YEAR_INFO}
    >
      <div className="panel tool-panel">
        <NumberField label="Jaar" value={year} onChange={setYear} />
        <div className={`tk-readout ${leap ? 'tk-yes' : 'tk-no'}`}>
          {year} is {leap ? 'een schrikkeljaar' : 'geen schrikkeljaar'}
        </div>
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
            {years.length === 0 ? (
              <Note>Geen schrikkeljaren in dit bereik.</Note>
            ) : (
              <div className="tk-pills">
                {years.map((y) => (
                  <span className="tk-pill" key={y}>
                    {y}
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </ToolShell>
  )
}

export default LeapYear
