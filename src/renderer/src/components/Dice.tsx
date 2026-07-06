import { JSX, useState } from 'react'
import { ToolShell, StatRow } from './toolkit'
import { NumberField } from './ToolFields'

const DICE_INFO = (
  <>
    <h4>Wat doet deze tool?</h4>
    <p>
      Gooi een of meer dobbelstenen. Elke worp toont de afzonderlijke uitkomsten plus het aantal
      dobbelstenen en de som van alle ogen.
    </p>
    <h4>Opties</h4>
    <ul>
      <li>
        <b>Aantal zijden</b> — het aantal zijden per dobbelsteen (2 tot 1000), bijv. 6 voor een
        gewone dobbelsteen of 20 voor een D20.
      </li>
      <li>
        <b>Aantal dobbelstenen</b> — hoeveel dobbelstenen je tegelijk gooit (1 tot 100).
      </li>
    </ul>
  </>
)

function Dice(): JSX.Element {
  const [sides, setSides] = useState(6)
  const [dice, setDice] = useState(2)
  const [rolls, setRolls] = useState<number[]>([])

  const clamp = (n: number, min: number, max: number): number =>
    Math.min(max, Math.max(min, Math.round(n) || min))

  const roll = (): void => {
    const s = clamp(sides, 2, 1000)
    const d = clamp(dice, 1, 100)
    const next: number[] = []
    for (let i = 0; i < d; i++) {
      next.push(1 + Math.floor(Math.random() * s))
    }
    setRolls(next)
  }

  const total = rolls.reduce((a, b) => a + b, 0)

  return (
    <ToolShell
      title="Dobbelsteen"
      subtitle="Gooi een of meer dobbelstenen met een instelbaar aantal zijden."
      info={DICE_INFO}
    >
      <div className="panel">
        <NumberField label="Aantal zijden" value={sides} min={2} max={1000} onChange={setSides} />
        <NumberField
          label="Aantal dobbelstenen"
          value={dice}
          min={1}
          max={100}
          onChange={setDice}
        />

        <div className="tk-actions">
          <button className="btn btn-primary" onClick={roll}>
            Gooi
          </button>
        </div>

        {rolls.length > 0 && (
          <>
            <div className="tk-dice">
              {rolls.map((v, i) => (
                <div className="tk-die" key={i}>
                  {v}
                </div>
              ))}
            </div>

            <StatRow
              stats={[
                { label: 'Aantal', value: rolls.length },
                { label: 'Som', value: total }
              ]}
            />
          </>
        )}
      </div>
    </ToolShell>
  )
}

export default Dice
