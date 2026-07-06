import { JSX, useEffect, useRef, useState } from 'react'
import { ToolShell, StatRow, Note } from './toolkit'
import { NumberField } from './ToolFields'

type Phase = 'werk' | 'pauze'

function beep(ctx: AudioContext, freq = 880, ms = 180): void {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.frequency.value = freq
  osc.connect(gain)
  gain.connect(ctx.destination)
  gain.gain.setValueAtTime(0.001, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + ms / 1000)
  osc.start()
  osc.stop(ctx.currentTime + ms / 1000)
}

/** Format milliseconds as mm:ss. */
function formatMs(ms: number): string {
  const totaalSec = Math.max(0, Math.ceil(ms / 1000))
  const sec = totaalSec % 60
  const min = Math.floor(totaalSec / 60)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${pad(min)}:${pad(sec)}`
}

const POMODORO_INFO = (
  <>
    <h4>Wat doet deze tool?</h4>
    <p>
      Een pomodoro-timer die automatisch wisselt tussen werk- en pauzeperiodes. Bij elke overgang
      klinkt een geluidssignaal, en de teller houdt bij hoeveel werksessies je hebt voltooid.
    </p>
    <h4>Opties</h4>
    <ul>
      <li>
        <b>Werk (min)</b> — de lengte van een werkperiode in minuten.
      </li>
      <li>
        <b>Pauze (min)</b> — de lengte van een pauzeperiode in minuten.
      </li>
      <li>
        <b>Start / Pauze</b> — start de timer of pauzeert hem tijdelijk.
      </li>
      <li>
        <b>Reset</b> — zet terug naar het begin van een werkperiode.
      </li>
    </ul>
  </>
)

function Pomodoro(): JSX.Element {
  const [werkMin, setWerkMin] = useState(25)
  const [pauzeMin, setPauzeMin] = useState(5)
  const [phase, setPhase] = useState<Phase>('werk')
  const [running, setRunning] = useState(false)
  const [remainingMs, setRemainingMs] = useState(25 * 60 * 1000)
  const [sessies, setSessies] = useState(0)

  const audioRef = useRef<AudioContext | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const endAtRef = useRef(0)
  // Refs so the interval reads the current phase/durations without re-subscribing.
  const phaseRef = useRef<Phase>('werk')
  const werkMsRef = useRef(werkMin * 60 * 1000)
  const pauzeMsRef = useRef(pauzeMin * 60 * 1000)

  useEffect(() => {
    phaseRef.current = phase
    werkMsRef.current = Math.max(1, werkMin) * 60 * 1000
    pauzeMsRef.current = Math.max(1, pauzeMin) * 60 * 1000
  }, [phase, werkMin, pauzeMin])

  const ensureAudio = (): AudioContext | null => {
    if (!audioRef.current) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (Ctor) audioRef.current = new Ctor()
    }
    if (audioRef.current && audioRef.current.state === 'suspended') {
      void audioRef.current.resume()
    }
    return audioRef.current
  }

  const clear = (): void => {
    if (intervalRef.current !== undefined) {
      clearInterval(intervalRef.current)
      intervalRef.current = undefined
    }
  }

  useEffect(() => {
    return () => {
      clear()
      if (audioRef.current) {
        void audioRef.current.close()
        audioRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!running) return
    endAtRef.current = Date.now() + remainingMs
    clear()
    intervalRef.current = setInterval(() => {
      const left = endAtRef.current - Date.now()
      if (left > 0) {
        setRemainingMs(left)
        return
      }
      const ctx = ensureAudio()
      if (ctx) beep(ctx)
      if (phaseRef.current === 'werk') {
        setSessies((n) => n + 1)
        setPhase('pauze')
        const dur = pauzeMsRef.current
        endAtRef.current = Date.now() + dur
        setRemainingMs(dur)
      } else {
        setPhase('werk')
        const dur = werkMsRef.current
        endAtRef.current = Date.now() + dur
        setRemainingMs(dur)
      }
    }, 200)
    return clear
    // Only (re)start the loop when running toggles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  const start = (): void => {
    if (!running) ensureAudio()
    setRunning((r) => !r)
  }

  const reset = (): void => {
    setRunning(false)
    setPhase('werk')
    setRemainingMs(Math.max(1, werkMin) * 60 * 1000)
  }

  // When durations change while stopped, reflect them in the current phase.
  const changeWerk = (n: number): void => {
    setWerkMin(n)
    if (!running && phase === 'werk') setRemainingMs(Math.max(1, n) * 60 * 1000)
  }
  const changePauze = (n: number): void => {
    setPauzeMin(n)
    if (!running && phase === 'pauze') setRemainingMs(Math.max(1, n) * 60 * 1000)
  }

  return (
    <ToolShell
      title="Pomodoro"
      subtitle="Wissel automatisch tussen werk en pauze."
      info={POMODORO_INFO}
    >
      <div className="panel tool-panel">
        <div className="tk-row">
          <NumberField label="Werk (min)" value={werkMin} min={1} onChange={changeWerk} />
          <NumberField label="Pauze (min)" value={pauzeMin} min={1} onChange={changePauze} />
        </div>
        <div className="tk-center">
          <Note>{phase === 'werk' ? 'Werk' : 'Pauze'}</Note>
          <div className="tk-timer-display">{formatMs(remainingMs)}</div>
        </div>
        <div className="tk-actions">
          <button className="btn btn-primary" onClick={start}>
            {running ? 'Pauze' : 'Start'}
          </button>
          <button className="btn" onClick={reset}>
            Reset
          </button>
        </div>
        <StatRow stats={[{ label: 'Voltooide sessies', value: sessies }]} />
      </div>
    </ToolShell>
  )
}

export default Pomodoro
