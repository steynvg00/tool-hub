import { JSX, useMemo, useState } from 'react'
import { evaluate, format } from 'mathjs'
import { ToolShell, TextArea, Note } from './toolkit'

// Each non-empty line is evaluated in order against a shared scope, so you can
// assign variables on one line and reuse them below — like a mini worksheet.
interface LineResult {
  line: string
  value?: string
  error?: string
}

function evaluateSheet(source: string): LineResult[] {
  const scope: Record<string, unknown> = {}
  return source.split(/\r?\n/).map((raw) => {
    const line = raw.trim()
    if (line === '' || line.startsWith('#') || line.startsWith('//')) {
      return { line: raw }
    }
    try {
      const result = evaluate(raw, scope)
      if (result === undefined || typeof result === 'function') {
        // Function definitions (f(x) = ...) and assignments to functions
        // produce nothing worth printing.
        return { line: raw }
      }
      return { line: raw, value: format(result, { precision: 12 }) }
    } catch (err) {
      return { line: raw, error: (err as Error).message }
    }
  })
}

const EXAMPLE = `# Variabelen en functies
straal = 2.5
oppervlak = pi * straal^2
btw(bedrag) = bedrag * 1.21
btw(100)

# Wetenschappelijk
sqrt(2)
sin(45 deg)
log(1000, 10)
2^10`

const MATH_EXPRESSION_INFO = (
  <>
    <h4>Wat doet deze tool?</h4>
    <p>
      Een werkblad-rekenmachine: elke regel is een aparte expressie die van boven naar beneden wordt
      berekend. Regels delen dezelfde scope, dus je kunt op een regel een variabele of functie
      definiëren en die daaronder hergebruiken.
    </p>
    <h4>Gebruik</h4>
    <ul>
      <li>
        <b>Variabelen</b> — met <code>naam = waarde</code> (bv. <code>straal = 2.5</code>) en verderop
        opnieuw gebruiken.
      </li>
      <li>
        <b>Eigen functies</b> — definieer met <code>f(x) = …</code> (bv. <code>btw(bedrag) = bedrag * 1.21</code>).
      </li>
      <li>
        <b>Functies &amp; constanten</b> — o.a. <code>pi</code>, <code>e</code>, <code>sqrt</code>,{' '}
        <code>sin/cos/tan</code> (gebruik <code>deg</code> voor graden), <code>log(x, grondtal)</code>,{' '}
        <code>ln</code>, <code>abs</code>, <code>round</code> en faculteit <code>5!</code>.
      </li>
      <li>
        <b>Eenheden</b> — omrekenen met bv. <code>3 cm to inch</code>.
      </li>
      <li>
        <b>Commentaar</b> — regels die met <code>#</code> of <code>//</code> beginnen worden overgeslagen.
      </li>
    </ul>
    <p>Onderaan staat het laatst berekende resultaat apart uitgelicht.</p>
  </>
)

function MathExpression(): JSX.Element {
  const [source, setSource] = useState(EXAMPLE)
  const results = useMemo(() => evaluateSheet(source), [source])

  const lastValue = [...results].reverse().find((r) => r.value !== undefined)?.value ?? '—'

  return (
    <ToolShell
      title="Expressie-rekenmachine"
      subtitle="Wetenschappelijke expressies met variabelen en eigen functies — elke regel bouwt voort op de vorige."
      info={MATH_EXPRESSION_INFO}
    >
      <div className="panel tool-panel">
        <div className="tk-two">
          <TextArea
            label="Werkblad (één expressie per regel)"
            value={source}
            onChange={setSource}
            rows={14}
            placeholder={'2 + 2\nx = 5\nx * pi'}
          />
          <div className="tool-field">
            <span className="tool-label">Resultaten</span>
            <div className="tk-mathsheet">
              {results.map((r, i) => (
                <div
                  key={i}
                  className={
                    'tk-mathrow' +
                    (r.error ? ' err' : '') +
                    (r.value === undefined && !r.error ? ' muted' : '')
                  }
                >
                  <code className="tk-mathrow-src">{r.line === '' ? ' ' : r.line}</code>
                  {r.value !== undefined && <code className="tk-mathrow-val">= {r.value}</code>}
                  {r.error && <code className="tk-mathrow-err">{r.error}</code>}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="tk-readout tk-mono">= {lastValue}</div>
        <Note>
          Ondersteunt o.a. <code>pi</code>, <code>e</code>, <code>sqrt</code>, <code>sin/cos/tan</code>{' '}
          (gebruik <code>deg</code> voor graden), <code>log(x, grondtal)</code>, <code>ln</code>,{' '}
          <code>abs</code>, <code>round</code>, faculteit <code>5!</code>, en eenheden zoals{' '}
          <code>3 cm to inch</code>. Definieer functies met <code>f(x) = …</code>. Regels die met{' '}
          <code>#</code> beginnen zijn commentaar.
        </Note>
      </div>
    </ToolShell>
  )
}

export default MathExpression
