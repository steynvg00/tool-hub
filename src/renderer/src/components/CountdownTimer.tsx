import { JSX, useEffect, useRef, useState } from 'react'
import { ToolShell, TextInput, Note } from './toolkit'
import { NumberField } from './ToolFields'

interface Timer {
  id: number
  label: string
  remainingMs: number
  endAt: number
  running: boolean
  done: boolean
}

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

const COUNTDOWN_INFO = (
  <>
    <h4>Wat doet deze tool?</h4>
    <p>
      Maak meerdere afteltimers die onafhankelijk naast elkaar lopen. Als een timer op nul komt,
      klinkt er een geluidssignaal en toont de kaart &quot;Klaar!&quot;.
    </p>
    <h4>Opties</h4>
    <ul>
      <li>
        <b>Label</b> — een naam voor de timer; laat je dit leeg, dan krijgt de timer automatisch een
        naam.
      </li>
      <li>
        <b>Minuten</b> en <b>Seconden</b> — de duur van de timer.
      </li>
      <li>
        <b>Toevoegen &amp; starten</b> — voegt een nieuwe timer toe die meteen begint af te tellen.
      </li>
      <li>
        <b>Pauze / Hervat</b> — pauzeert een lopende timer of laat hem verdergaan.
      </li>
      <li>
        <b>Verwijderen</b> — haalt de timer uit de lijst.
      </li>
    </ul>
  </>
)

function CountdownTimer(): JSX.Element {
  const [label, setLabel] = useState('')
  const [minuten, setMinuten] = useState(5)
  const [seconden, setSeconden] = useState(0)
  const [timers, setTimers] = useState<Timer[]>([])

  const audioRef = useRef<AudioContext | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const idRef = useRef(0)

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

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const now = Date.now()
      setTimers((prev) => {
        let changed = false
        const next = prev.map((t) => {
          if (!t.running || t.done) return t
          const remainingMs = t.endAt - now
          if (remainingMs <= 0) {
            changed = true
            const ctx = ensureAudio()
            if (ctx) beep(ctx)
            return { ...t, remainingMs: 0, running: false, done: true }
          }
          changed = true
          return { ...t, remainingMs }
        })
        return changed ? next : prev
      })
    }, 200)
    return () => {
      clearInterval(intervalRef.current)
      if (audioRef.current) {
        void audioRef.current.close()
        audioRef.current = null
      }
    }
  }, [])

  const add = (): void => {
    const duration = (minuten * 60 + seconden) * 1000
    if (duration <= 0) return
    ensureAudio()
    idRef.current += 1
    const naam = label.trim() || `Timer ${idRef.current}`
    setTimers((prev) => [
      ...prev,
      {
        id: idRef.current,
        label: naam,
        remainingMs: duration,
        endAt: Date.now() + duration,
        running: true,
        done: false
      }
    ])
    setLabel('')
  }

  const togglePause = (id: number): void => {
    setTimers((prev) =>
      prev.map((t) => {
        if (t.id !== id || t.done) return t
        if (t.running) {
          return { ...t, running: false, remainingMs: Math.max(0, t.endAt - Date.now()) }
        }
        return { ...t, running: true, endAt: Date.now() + t.remainingMs }
      })
    )
  }

  const remove = (id: number): void => {
    setTimers((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <ToolShell
      title="Afteltimer"
      subtitle="Meerdere onafhankelijke timers naast elkaar."
      info={COUNTDOWN_INFO}
    >
      <div className="panel tool-panel">
        <div className="tk-row">
          <TextInput label="Label" value={label} onChange={setLabel} />
          <NumberField label="Minuten" value={minuten} min={0} onChange={setMinuten} />
          <NumberField label="Seconden" value={seconden} min={0} max={59} onChange={setSeconden} />
        </div>
        <div className="tk-actions">
          <button className="btn btn-primary" onClick={add}>
            Toevoegen &amp; starten
          </button>
        </div>
        {timers.length === 0 ? (
          <Note>Nog geen timers. Stel een duur in en voeg er een toe.</Note>
        ) : (
          <div style={{ marginTop: 12 }}>
            {timers.map((t) => (
              <div key={t.id} className={t.done ? 'tk-timer-card done' : 'tk-timer-card'}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12
                  }}
                >
                  <strong>{t.label}</strong>
                  <span className="tk-timer-display sm">
                    {t.done ? 'Klaar!' : formatMs(t.remainingMs)}
                  </span>
                </div>
                <div className="tk-actions">
                  <button className="btn" onClick={() => togglePause(t.id)} disabled={t.done}>
                    {t.running ? 'Pauze' : 'Hervat'}
                  </button>
                  <button className="btn" onClick={() => remove(t.id)}>
                    Verwijderen
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ToolShell>
  )
}

export default CountdownTimer
