import { JSX, useState } from 'react'
import { ToolShell, TextInput, Segmented, Note, ErrorBanner } from './toolkit'

type Mode = 'linear' | 'quadratic'

// Format a number cleanly: integers without decimals, otherwise up to 6 sig.
function fmt(n: number): string {
  if (!isFinite(n)) return String(n)
  const r = Math.round(n * 1e10) / 1e10
  return Number.isInteger(r) ? String(r) : String(Number(r.toPrecision(8)))
}

interface Solved {
  steps: string[]
  solutions: string[]
}

function solveLinear(a: number, b: number): Solved {
  // a·x + b = 0
  if (a === 0) {
    return b === 0
      ? { steps: ['0 = 0 — elke waarde van x voldoet.'], solutions: ['Oneindig veel oplossingen'] }
      : { steps: [`${fmt(b)} = 0 is onwaar.`], solutions: ['Geen oplossing'] }
  }
  const x = -b / a
  return {
    steps: [
      `${fmt(a)}·x + ${fmt(b)} = 0`,
      `${fmt(a)}·x = ${fmt(-b)}`,
      `x = ${fmt(-b)} / ${fmt(a)}`,
      `x = ${fmt(x)}`
    ],
    solutions: [`x = ${fmt(x)}`]
  }
}

function solveQuadratic(a: number, b: number, c: number): Solved {
  // a·x² + b·x + c = 0
  if (a === 0) {
    const lin = solveLinear(b, c)
    return { steps: ['a = 0 → dit is een lineaire vergelijking.', ...lin.steps], solutions: lin.solutions }
  }
  const d = b * b - 4 * a * c
  const steps = [
    `${fmt(a)}·x² + ${fmt(b)}·x + ${fmt(c)} = 0`,
    `D = b² − 4·a·c = ${fmt(b)}² − 4·${fmt(a)}·${fmt(c)} = ${fmt(d)}`
  ]
  if (d > 0) {
    const s = Math.sqrt(d)
    const x1 = (-b + s) / (2 * a)
    const x2 = (-b - s) / (2 * a)
    steps.push(
      `D > 0 → twee reële oplossingen`,
      `x = (−b ± √D) / (2a) = (${fmt(-b)} ± ${fmt(s)}) / ${fmt(2 * a)}`
    )
    return { steps, solutions: [`x₁ = ${fmt(x1)}`, `x₂ = ${fmt(x2)}`] }
  }
  if (d === 0) {
    const x = -b / (2 * a)
    steps.push('D = 0 → één (dubbele) oplossing', `x = −b / (2a) = ${fmt(-b)} / ${fmt(2 * a)}`)
    return { steps, solutions: [`x = ${fmt(x)}`] }
  }
  const re = -b / (2 * a)
  const im = Math.sqrt(-d) / (2 * a)
  steps.push('D < 0 → twee complexe oplossingen', `x = (−b ± √D) / (2a)`)
  return {
    steps,
    solutions: [`x₁ = ${fmt(re)} + ${fmt(Math.abs(im))}i`, `x₂ = ${fmt(re)} − ${fmt(Math.abs(im))}i`]
  }
}

function EquationSolver(): JSX.Element {
  const [mode, setMode] = useState<Mode>('quadratic')
  const [a, setA] = useState('1')
  const [b, setB] = useState('-3')
  const [c, setC] = useState('2')

  const na = Number(a)
  const nb = Number(b)
  const nc = Number(c)

  const invalid =
    a.trim() === '' ||
    b.trim() === '' ||
    Number.isNaN(na) ||
    Number.isNaN(nb) ||
    (mode === 'quadratic' && (c.trim() === '' || Number.isNaN(nc)))

  let solved: Solved | null = null
  if (!invalid) {
    solved = mode === 'linear' ? solveLinear(na, nb) : solveQuadratic(na, nb, nc)
  }

  return (
    <ToolShell
      title="Vergelijking oplossen"
      subtitle="Los een lineaire of kwadratische vergelijking op, met tussenstappen."
    >
      <div className="panel tool-panel">
        <Segmented<Mode>
          options={[
            { value: 'linear', label: 'Lineair · a·x + b = 0' },
            { value: 'quadratic', label: 'Kwadratisch · a·x² + b·x + c = 0' }
          ]}
          value={mode}
          onChange={setMode}
        />
        <div className="tk-row" style={{ marginTop: 12 }}>
          <TextInput label="a" value={a} onChange={setA} mono />
          <TextInput label="b" value={b} onChange={setB} mono />
          {mode === 'quadratic' && <TextInput label="c" value={c} onChange={setC} mono />}
        </div>
        {invalid && <ErrorBanner message="Vul geldige getallen in voor de coëfficiënten." />}
        {solved && (
          <>
            <div className="tk-eq-steps">
              {solved.steps.map((s, i) => (
                <div className="tk-eq-step" key={i}>
                  {s}
                </div>
              ))}
            </div>
            <div className="tk-pills">
              {solved.solutions.map((s, i) => (
                <span className="tk-pill" key={i} style={{ fontWeight: 700 }}>
                  {s}
                </span>
              ))}
            </div>
          </>
        )}
        <Note>Coëfficiënten mogen decimaal of negatief zijn. Zet a = 0 om terug te vallen op lineair.</Note>
      </div>
    </ToolShell>
  )
}

export default EquationSolver
