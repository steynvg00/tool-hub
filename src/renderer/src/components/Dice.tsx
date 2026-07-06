import { JSX, useState } from 'react'
import { ToolShell, StatRow } from './toolkit'
import { NumberField } from './ToolFields'

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
