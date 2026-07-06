import { JSX, useState } from 'react'
import { ToolShell, LineListEditor, Segmented, Note } from './toolkit'
import { NumberField } from './ToolFields'

type Mode = 'winner' | 'teams'

/** Fisher-Yates shuffle returning a new array. */
function shuffle<T>(input: T[]): T[] {
  const arr = [...input]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

const NAMETEAM_INFO = (
  <>
    <h4>Wat doet deze tool?</h4>
    <p>
      Voer een lijst met namen in (één per regel) en trek willekeurig een winnaar, of verdeel de
      namen eerlijk en willekeurig over een aantal teams.
    </p>
    <h4>Opties</h4>
    <ul>
      <li>
        <b>Namen</b> — vul één naam per regel in; zodra je typt verschijnt er een lege regel eronder,
        en met het kruisje verwijder je een naam.
      </li>
      <li>
        <b>Eén winnaar</b> — kiest één willekeurige naam uit de lijst.
      </li>
      <li>
        <b>Verdeel in teams</b> — schudt de namen en verdeelt ze om de beurt over de teams, zodat de
        teams zo gelijk mogelijk zijn.
      </li>
      <li>
        <b>Aantal teams</b> — het aantal teams (2 tot 20) waarover verdeeld wordt.
      </li>
    </ul>
  </>
)

function NameTeamDraw(): JSX.Element {
  const [names, setNames] = useState<string[]>([])
  const [mode, setMode] = useState<Mode>('winner')
  const [teamCount, setTeamCount] = useState(2)
  const [winner, setWinner] = useState<string | null>(null)
  const [teams, setTeams] = useState<string[][]>([])

  const clampedTeams = Math.max(2, Math.min(20, Math.floor(teamCount) || 2))

  const drawWinner = (): void => {
    setWinner(names[Math.floor(Math.random() * names.length)])
  }

  const distribute = (): void => {
    const shuffled = shuffle(names)
    const result: string[][] = Array.from({ length: clampedTeams }, () => [])
    shuffled.forEach((name, i) => {
      result[i % clampedTeams].push(name)
    })
    setTeams(result)
  }

  return (
    <ToolShell
      title="Naam- & teamtrekker"
      subtitle="Trek een winnaar of verdeel namen eerlijk over teams."
      info={NAMETEAM_INFO}
    >
      <div className="panel">
        <label className="tool-label">Namen</label>
        <LineListEditor initial={[]} onChange={setNames} placeholder="naam toevoegen…" />

        <div className="tk-field" style={{ marginTop: 12 }}>
          <Segmented<Mode>
            options={[
              { value: 'winner', label: 'Eén winnaar' },
              { value: 'teams', label: 'Verdeel in teams' }
            ]}
            value={mode}
            onChange={setMode}
          />
        </div>

        {mode === 'winner' ? (
          <>
            <div className="tk-actions">
              <button
                className="btn btn-primary"
                style={{ width: 'auto' }}
                onClick={drawWinner}
                disabled={names.length < 1}
              >
                Trek winnaar
              </button>
            </div>
            {names.length < 1 && <Note>Voer minstens één naam in.</Note>}
            {names.length >= 1 && winner !== null && <div className="tk-result">{winner}</div>}
          </>
        ) : (
          <>
            <div className="tk-row" style={{ marginTop: 12 }}>
              <NumberField
                label="Aantal teams"
                value={teamCount}
                min={2}
                max={20}
                onChange={setTeamCount}
              />
              <button
                className="btn btn-primary"
                style={{ width: 'auto' }}
                onClick={distribute}
                disabled={names.length < clampedTeams}
              >
                Verdelen
              </button>
            </div>
            {names.length < clampedTeams && (
              <Note>
                Je hebt minstens {clampedTeams} namen nodig voor {clampedTeams} teams (nu{' '}
                {names.length}).
              </Note>
            )}
            {names.length >= clampedTeams && teams.length > 0 && (
              <div className="tk-teams">
                {teams.map((members, i) => (
                  <div className="tk-team" key={i}>
                    <h3>Team {i + 1}</h3>
                    <ul>
                      {members.map((m, j) => (
                        <li key={j}>{m}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </ToolShell>
  )
}

export default NameTeamDraw
