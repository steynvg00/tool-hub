import { JSX, useEffect, useRef, useState } from 'react'
import { compile, type EvalFunction } from 'mathjs'
import { ToolShell, TextInput, Note, ErrorBanner } from './toolkit'

interface Range {
  xMin: number
  xMax: number
}

// "Nice" tick step for a given rough spacing (1, 2, 5 × 10^n).
function niceStep(rough: number): number {
  if (rough <= 0 || !isFinite(rough)) return 1
  const pow = Math.pow(10, Math.floor(Math.log10(rough)))
  const f = rough / pow
  const nice = f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10
  return nice * pow
}

function FunctionPlotter(): JSX.Element {
  const [expr, setExpr] = useState('sin(x) * x')
  const [xMinS, setXMinS] = useState('-10')
  const [xMaxS, setXMaxS] = useState('10')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const xMin = Number(xMinS)
  const xMax = Number(xMaxS)

  let error: string | null = null
  let compiled: EvalFunction | null = null
  if (Number.isNaN(xMin) || Number.isNaN(xMax) || xMin >= xMax) {
    error = 'Ongeldig bereik: x-min moet kleiner zijn dan x-max.'
  } else if (expr.trim() === '') {
    error = 'Voer een functie f(x) in.'
  } else {
    try {
      compiled = compile(expr)
      compiled.evaluate({ x: 0 }) // probe for obvious errors
    } catch (err) {
      error = `Ongeldige functie: ${(err as Error).message}`
      compiled = null
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const cssW = canvas.clientWidth || 640
    const cssH = 380
    canvas.width = Math.round(cssW * dpr)
    canvas.height = Math.round(cssH * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cssW, cssH)

    if (!compiled || error) return
    const range: Range = { xMin, xMax }

    // Sample the function across the width, tracking the y extent.
    const N = Math.max(200, Math.floor(cssW))
    const pts: { x: number; y: number | null }[] = []
    let yLo = Infinity
    let yHi = -Infinity
    for (let i = 0; i <= N; i++) {
      const x = range.xMin + ((range.xMax - range.xMin) * i) / N
      let y: number | null
      try {
        const v = compiled.evaluate({ x })
        y = typeof v === 'number' && isFinite(v) ? v : null
      } catch {
        y = null
      }
      if (y !== null) {
        yLo = Math.min(yLo, y)
        yHi = Math.max(yHi, y)
      }
      pts.push({ x, y })
    }
    if (!isFinite(yLo) || !isFinite(yHi)) {
      yLo = -1
      yHi = 1
    }
    if (yLo === yHi) {
      yLo -= 1
      yHi += 1
    }
    // Pad the y-range a touch so the curve doesn't touch the edges.
    const pad = (yHi - yLo) * 0.08
    yLo -= pad
    yHi += pad

    const sx = (x: number): number => ((x - range.xMin) / (range.xMax - range.xMin)) * cssW
    const sy = (y: number): number => cssH - ((y - yLo) / (yHi - yLo)) * cssH

    // Grid
    const gridStepX = niceStep((range.xMax - range.xMin) / 10)
    const gridStepY = niceStep((yHi - yLo) / 8)
    ctx.lineWidth = 1
    ctx.font = '11px ui-monospace, monospace'
    ctx.fillStyle = 'rgba(140,140,150,0.9)'
    ctx.strokeStyle = 'rgba(140,140,150,0.18)'
    for (let gx = Math.ceil(range.xMin / gridStepX) * gridStepX; gx <= range.xMax; gx += gridStepX) {
      const px = sx(gx)
      ctx.beginPath()
      ctx.moveTo(px, 0)
      ctx.lineTo(px, cssH)
      ctx.stroke()
      if (Math.abs(gx) > 1e-9) ctx.fillText(String(Number(gx.toPrecision(4))), px + 3, cssH - 4)
    }
    for (let gy = Math.ceil(yLo / gridStepY) * gridStepY; gy <= yHi; gy += gridStepY) {
      const py = sy(gy)
      ctx.beginPath()
      ctx.moveTo(0, py)
      ctx.lineTo(cssW, py)
      ctx.stroke()
      if (Math.abs(gy) > 1e-9) ctx.fillText(String(Number(gy.toPrecision(4))), 3, py - 3)
    }

    // Axes
    ctx.strokeStyle = 'rgba(140,140,150,0.6)'
    ctx.lineWidth = 1.5
    if (yLo <= 0 && yHi >= 0) {
      const py = sy(0)
      ctx.beginPath()
      ctx.moveTo(0, py)
      ctx.lineTo(cssW, py)
      ctx.stroke()
    }
    if (range.xMin <= 0 && range.xMax >= 0) {
      const px = sx(0)
      ctx.beginPath()
      ctx.moveTo(px, 0)
      ctx.lineTo(px, cssH)
      ctx.stroke()
    }

    // Curve
    ctx.strokeStyle = '#4a6cd4'
    ctx.lineWidth = 2
    ctx.beginPath()
    let drawing = false
    for (const p of pts) {
      if (p.y === null) {
        drawing = false
        continue
      }
      const px = sx(p.x)
      const py = sy(p.y)
      if (!drawing) {
        ctx.moveTo(px, py)
        drawing = true
      } else {
        ctx.lineTo(px, py)
      }
    }
    ctx.stroke()
  }, [expr, xMin, xMax, compiled, error])

  return (
    <ToolShell
      title="Functie-plotter"
      subtitle="Voer f(x) in en teken de grafiek met een instelbaar bereik."
    >
      <div className="panel tool-panel">
        <TextInput
          label="f(x) ="
          value={expr}
          onChange={setExpr}
          mono
          placeholder="bijv. sin(x) * x  of  x^2 - 3"
        />
        <div className="tk-row">
          <TextInput label="x-min" value={xMinS} onChange={setXMinS} mono />
          <TextInput label="x-max" value={xMaxS} onChange={setXMaxS} mono />
        </div>
        <ErrorBanner message={error} />
        <div className="tk-plot">
          <canvas ref={canvasRef} />
        </div>
        <Note>
          De y-as schaalt automatisch mee. Gebruik dezelfde functies als de expressie-rekenmachine (
          <code>sin</code>, <code>sqrt</code>, <code>abs</code>, <code>exp</code>, <code>log</code>, …).
          Delen door nul of onderbrekingen laten een gat in de lijn.
        </Note>
      </div>
    </ToolShell>
  )
}

export default FunctionPlotter
