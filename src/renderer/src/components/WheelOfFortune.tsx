import { JSX, useEffect, useRef, useState } from 'react'
import { ToolShell, TextArea, Note } from './toolkit'

const SIZE = 300
const TAU = Math.PI * 2

const WHEEL_INFO = (
  <>
    <h4>Wat doet deze tool?</h4>
    <p>
      Vul je eigen opties in en draai aan het rad. Het rad komt willekeurig tot stilstand en de
      optie onder de pijl bovenaan is de winnaar.
    </p>
    <h4>Opties</h4>
    <ul>
      <li>
        <b>Opties</b> — één optie per regel; elke regel wordt een gekleurde taartpunt op het rad. Je
        hebt minstens twee opties nodig om te kunnen draaien.
      </li>
      <li>
        <b>Draai</b> — laat het rad draaien; na afloop verschijnt de gekozen optie.
      </li>
    </ul>
  </>
)

function WheelOfFortune(): JSX.Element {
  const [raw, setRaw] = useState('Ja\nNee\nMisschien\nOpnieuw')
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [winner, setWinner] = useState<string | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frame = useRef<number | undefined>(undefined)

  const options = raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s !== '')

  // Cancel any pending animation frame on unmount.
  useEffect(
    () => () => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current)
    },
    []
  )

  // Redraw whenever the options or the rotation change.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const cx = SIZE / 2
    const cy = SIZE / 2
    const r = SIZE / 2 - 6
    const n = options.length

    ctx.clearRect(0, 0, SIZE, SIZE)

    if (n === 0) {
      ctx.fillStyle = '#888'
      ctx.font = '14px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('Geen opties', cx, cy)
      return
    }

    const seg = TAU / n

    for (let i = 0; i < n; i++) {
      const start = rotation + i * seg
      const end = start + seg

      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, r, start, end)
      ctx.closePath()
      ctx.fillStyle = `hsl(${(i * 360) / n}, 70%, 55%)`
      ctx.fill()

      // Label drawn along the middle of the slice.
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(start + seg / 2)
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 14px sans-serif'
      const label = options[i]
      const shown = label.length > 18 ? label.slice(0, 17) + '…' : label
      ctx.fillText(shown, r - 12, 0)
      ctx.restore()
    }

    // Hub in the centre.
    ctx.beginPath()
    ctx.arc(cx, cy, 14, 0, TAU)
    ctx.fillStyle = '#fff'
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.2)'
    ctx.stroke()
  }, [options, rotation])

  const winnerFor = (rot: number): string => {
    const n = options.length
    const seg = TAU / n
    // Pointer sits at the top (12 o'clock) = absolute angle -π/2.
    // Convert to the wheel's own (unrotated) frame and normalise to [0, 2π).
    let a = (-Math.PI / 2 - rot) % TAU
    if (a < 0) a += TAU
    const idx = Math.floor(a / seg) % n
    return options[idx]
  }

  const spin = (): void => {
    if (spinning || options.length < 2) return
    setSpinning(true)
    setWinner(null)

    const start = rotation
    const turns = 4 + Math.random() * 3
    const target = start + turns * TAU + Math.random() * TAU
    const duration = 3500
    const startTime = performance.now()
    const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3)

    const step = (now: number): void => {
      const t = Math.min(1, (now - startTime) / duration)
      const current = start + (target - start) * easeOut(t)
      setRotation(current)
      if (t < 1) {
        frame.current = requestAnimationFrame(step)
      } else {
        frame.current = undefined
        setWinner(winnerFor(target))
        setSpinning(false)
      }
    }

    if (frame.current !== undefined) cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(step)
  }

  return (
    <ToolShell
      title="Rad van fortuin"
      subtitle="Voeg opties toe, draai aan het rad en zie wie wint."
      info={WHEEL_INFO}
    >
      <div className="panel">
        <TextArea
          label="Opties (één per regel)"
          value={raw}
          onChange={setRaw}
          rows={6}
          mono={false}
        />

        {options.length < 2 && <Note>Voeg minstens twee opties toe om te kunnen draaien.</Note>}

        <div className="tk-center">
          <div className="tk-wheel-wrap">
            <div className="tk-wheel-pointer" />
            <canvas ref={canvasRef} width={SIZE} height={SIZE} />
          </div>
        </div>

        <div className="tk-actions">
          <button
            className="btn btn-primary"
            onClick={spin}
            disabled={spinning || options.length < 2}
          >
            {spinning ? 'Draait…' : 'Draai'}
          </button>
        </div>

        {winner !== null && <div className="tk-result">{winner}</div>}
      </div>
    </ToolShell>
  )
}

export default WheelOfFortune
