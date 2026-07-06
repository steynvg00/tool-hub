import { JSX, useEffect, useRef, useState } from 'react'
import { ToolShell, Segmented, Note } from './toolkit'
import { NumberField } from './ToolFields'

type Maatsoort = '2' | '3' | '4' | '6'

const METRONOME_INFO = (
  <>
    <h4>Wat doet deze tool?</h4>
    <p>
      Een metronoom die met een nauwkeurige audioklik de maat aangeeft. De eerste tel van elke maat
      krijgt een hogere accentklik, en de balletjes tonen welke tel op dat moment klinkt. BPM en
      maatsoort kun je aanpassen terwijl de metronoom loopt.
    </p>
    <h4>Opties</h4>
    <ul>
      <li>
        <b>BPM</b> — het tempo in slagen per minuut (30 tot 300).
      </li>
      <li>
        <b>Maatsoort</b> — het aantal tellen per maat (2, 3, 4 of 6); de eerste tel wordt
        geaccentueerd.
      </li>
      <li>
        <b>Start / Stop</b> — start of stopt de klik.
      </li>
    </ul>
  </>
)

function Metronome(): JSX.Element {
  const [bpm, setBpm] = useState(100)
  const [maatsoort, setMaatsoort] = useState<Maatsoort>('4')
  const [running, setRunning] = useState(false)
  const [currentBeat, setCurrentBeat] = useState(0)

  const audioRef = useRef<AudioContext | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const nextNoteTimeRef = useRef(0)
  const beatRef = useRef(0)

  // Live values read by the scheduler (so changes take effect while running).
  const bpmRef = useRef(bpm)
  const beatsRef = useRef(Number(maatsoort))
  useEffect(() => {
    bpmRef.current = bpm
    beatsRef.current = Number(maatsoort)
  }, [bpm, maatsoort])

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

  const playClick = (ctx: AudioContext, time: number, accent: boolean): void => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = accent ? 1500 : 800
    osc.connect(gain)
    gain.connect(ctx.destination)
    gain.gain.setValueAtTime(0.001, time)
    gain.gain.exponentialRampToValueAtTime(0.4, time + 0.001)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05)
    osc.start(time)
    osc.stop(time + 0.06)
  }

  const start = (): void => {
    if (running) {
      clear()
      setRunning(false)
      return
    }
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    if (!audioRef.current) audioRef.current = new Ctor()
    const ctx = audioRef.current
    if (ctx.state === 'suspended') void ctx.resume()

    beatRef.current = 0
    nextNoteTimeRef.current = ctx.currentTime + 0.1
    setRunning(true)

    const lookahead = 0.1 // schedule this far ahead (seconds)
    clear()
    intervalRef.current = setInterval(() => {
      const beats = beatsRef.current
      const secondsPerBeat = 60 / bpmRef.current
      while (nextNoteTimeRef.current < ctx.currentTime + lookahead) {
        const beat = beatRef.current % beats
        playClick(ctx, nextNoteTimeRef.current, beat === 0)
        const shown = beat
        setCurrentBeat(shown)
        nextNoteTimeRef.current += secondsPerBeat
        beatRef.current = (beatRef.current + 1) % beats
      }
    }, 25)
  }

  const beats = Number(maatsoort)

  return (
    <ToolShell
      title="Metronoom"
      subtitle="Houd de maat met een nauwkeurige audioklik."
      info={METRONOME_INFO}
    >
      <div className="panel tool-panel">
        <div className="tk-row">
          <NumberField label="BPM" value={bpm} min={30} max={300} onChange={setBpm} />
        </div>
        <label className="tool-field">
          <span className="tool-label">Maatsoort</span>
          <Segmented<Maatsoort>
            options={[
              { value: '2', label: '2' },
              { value: '3', label: '3' },
              { value: '4', label: '4' },
              { value: '6', label: '6' }
            ]}
            value={maatsoort}
            onChange={setMaatsoort}
          />
        </label>
        <div className="tk-pill-list">
          {Array.from({ length: beats }, (_, i) => (
            <span
              key={i}
              className="tk-badge"
              style={{
                background: running && i === currentBeat ? '#e6b450' : undefined,
                color: running && i === currentBeat ? '#3a2c00' : undefined,
                opacity: running ? 1 : 0.6
              }}
            >
              {i + 1}
            </span>
          ))}
        </div>
        <div className="tk-actions">
          <button className="btn btn-primary" onClick={start}>
            {running ? 'Stop' : 'Start'}
          </button>
        </div>
        <Note>
          Wijzig BPM of maatsoort terwijl de metronoom loopt; het effect is direct hoorbaar.
        </Note>
      </div>
    </ToolShell>
  )
}

export default Metronome
