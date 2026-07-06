import { JSX, useEffect, useRef, useState } from 'react'
import { ToolShell, Note } from './toolkit'

interface Lap {
  nummer: number
  split: number
  totaal: number
}

/** Format milliseconds as mm:ss.cs (centiseconds). */
function formatCs(ms: number): string {
  const totaalCs = Math.floor(ms / 10)
  const cs = totaalCs % 100
  const totaalSec = Math.floor(totaalCs / 100)
  const sec = totaalSec % 60
  const min = Math.floor(totaalSec / 60)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${pad(min)}:${pad(sec)}.${pad(cs)}`
}

const STOPWATCH_INFO = (
  <>
    <h4>Wat doet deze tool?</h4>
    <p>
      Een stopwatch die de tijd meet in minuten, seconden en honderdsten. Tijdens het lopen kun je
      rondes vastleggen, met per ronde de tussentijd en de totale tijd.
    </p>
    <h4>Opties</h4>
    <ul>
      <li>
        <b>Start / Stop</b> — start de stopwatch of pauzeert hem; bij opnieuw starten telt hij
        verder.
      </li>
      <li>
        <b>Ronde</b> — legt de huidige tijd vast als ronde met de tussentijd sinds de vorige ronde.
      </li>
      <li>
        <b>Reset</b> — zet de tijd en alle rondes terug op nul.
      </li>
    </ul>
  </>
)

function Stopwatch(): JSX.Element {
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [laps, setLaps] = useState<Lap[]>([])

  // Accumulated ms before the current run, and the performance.now() at start.
  const accumulatedRef = useRef(0)
  const startRef = useRef(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  const clear = (): void => {
    if (intervalRef.current !== undefined) {
      clearInterval(intervalRef.current)
      intervalRef.current = undefined
    }
  }

  useEffect(() => clear, [])

  useEffect(() => {
    if (!running) return
    startRef.current = performance.now()
    clear()
    intervalRef.current = setInterval(() => {
      setElapsed(accumulatedRef.current + (performance.now() - startRef.current))
    }, 50)
    return clear
  }, [running])

  const toggle = (): void => {
    if (running) {
      accumulatedRef.current += performance.now() - startRef.current
      setElapsed(accumulatedRef.current)
      setRunning(false)
    } else {
      setRunning(true)
    }
  }

  const reset = (): void => {
    setRunning(false)
    accumulatedRef.current = 0
    setElapsed(0)
    setLaps([])
  }

  const ronde = (): void => {
    const totaal = accumulatedRef.current + (performance.now() - startRef.current)
    setLaps((prev) => {
      const vorigTotaal = prev.length > 0 ? prev[prev.length - 1].totaal : 0
      return [...prev, { nummer: prev.length + 1, split: totaal - vorigTotaal, totaal }]
    })
  }

  return (
    <ToolShell
      title="Stopwatch"
      subtitle="Meet tijd met rondes en tussentijden."
      info={STOPWATCH_INFO}
    >
      <div className="panel tool-panel">
        <div className="tk-center">
          <div className="tk-timer-display">{formatCs(elapsed)}</div>
        </div>
        <div className="tk-actions">
          <button className="btn btn-primary" onClick={toggle}>
            {running ? 'Stop' : 'Start'}
          </button>
          <button className="btn" onClick={ronde} disabled={!running}>
            Ronde
          </button>
          <button className="btn" onClick={reset} disabled={elapsed === 0 && laps.length === 0}>
            Reset
          </button>
        </div>
        {laps.length > 0 ? (
          <ul className="tk-laps">
            {[...laps].reverse().map((lap) => (
              <li key={lap.nummer}>
                <span>
                  Ronde {lap.nummer} · +{formatCs(lap.split)}
                </span>
                <span>{formatCs(lap.totaal)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <Note>Nog geen rondes. Start de stopwatch en druk op Ronde.</Note>
        )}
      </div>
    </ToolShell>
  )
}

export default Stopwatch
