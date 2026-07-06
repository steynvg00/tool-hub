import { JSX, useState } from 'react'
import { ToolShell, TextInput, StatRow, Note, ErrorBanner } from './toolkit'

function gcd(a: number, b: number): number {
  a = Math.abs(a)
  b = Math.abs(b)
  while (b) {
    ;[a, b] = [b, a % b]
  }
  return a || 1
}

const fmt = (n: number): string =>
  Number.isInteger(n) ? String(n) : String(Number(n.toPrecision(8)))

const RATIO_CALC_INFO = (
  <>
    <h4>Wat doet deze tool?</h4>
    <p>
      Lost een verhouding <code>a : b = c : d</code> op via kruisvermenigvuldiging. Vul drie velden in en
      laat er precies één leeg om de ontbrekende waarde te berekenen.
    </p>
    <h4>Opties</h4>
    <ul>
      <li>
        <b>a, b, c, d</b> — de vier termen van de verhouding. Laat precies één veld leeg; die waarde wordt
        berekend.
      </li>
    </ul>
    <p>
      Zijn <code>a</code> en <code>b</code> hele getallen, dan wordt de verhouding ook vereenvoudigd
      getoond, samen met de factor <code>a/b</code>. Handig voor schaal (bv. <code>1 : 100</code>) of
      recepten opschalen. Voorbeeld: <code>1 : 4 = 5 : ?</code> → 20.
    </p>
  </>
)

function RatioCalc(): JSX.Element {
  // Proportion a : b = c : d — leave exactly one field empty to solve it.
  const [a, setA] = useState('1')
  const [b, setB] = useState('4')
  const [c, setC] = useState('5')
  const [d, setD] = useState('')

  const fields = [a, b, c, d]
  const empties = fields.filter((f) => f.trim() === '').length
  const nums = fields.map((f) => (f.trim() === '' ? null : Number(f)))
  const anyNaN = nums.some((n) => n !== null && Number.isNaN(n))

  let error: string | null = null
  let solved: { label: string; value: number } | null = null

  if (anyNaN) {
    error = 'Vul geldige getallen in.'
  } else if (empties === 0) {
    error = 'Laat precies één veld leeg om de ontbrekende waarde te berekenen.'
  } else if (empties > 1) {
    error = 'Vul drie van de vier velden in; laat er één leeg.'
  } else {
    const [na, nb, nc, nd] = nums
    // a/b = c/d  ⇒  solve for the missing term.
    if (na === null && nb !== null && nc !== null && nd !== null) {
      if (nd === 0) error = 'Deling door nul.'
      else solved = { label: 'a', value: (nb * nc) / nd }
    } else if (nb === null && na !== null && nc !== null && nd !== null) {
      if (nc === 0) error = 'Deling door nul.'
      else solved = { label: 'b', value: (na * nd) / nc }
    } else if (nc === null && na !== null && nb !== null && nd !== null) {
      if (nb === 0) error = 'Deling door nul.'
      else solved = { label: 'c', value: (na * nd) / nb }
    } else if (nd === null && na !== null && nb !== null && nc !== null) {
      if (na === 0) error = 'Deling door nul.'
      else solved = { label: 'd', value: (nb * nc) / na }
    }
  }

  // Simplified form of the left ratio a : b when both are whole numbers.
  let simplified: string | null = null
  const ra = solved?.label === 'a' ? solved.value : nums[0]
  const rb = solved?.label === 'b' ? solved.value : nums[1]
  if (ra !== null && rb !== null && Number.isInteger(ra) && Number.isInteger(rb) && (ra || rb)) {
    const g = gcd(ra, rb)
    simplified = `${ra / g} : ${rb / g}`
  }
  const decimal = ra !== null && rb !== null && rb !== 0 ? fmt(ra / rb) : null

  return (
    <ToolShell
      title="Verhouding & schaal"
      subtitle="Los een verhouding a : b = c : d op — laat één veld leeg voor de ontbrekende waarde."
      info={RATIO_CALC_INFO}
    >
      <div className="panel tool-panel">
        <div className="tk-ratio">
          <TextInput label="a" value={a} onChange={setA} mono />
          <span className="tk-ratio-sep">:</span>
          <TextInput label="b" value={b} onChange={setB} mono />
          <span className="tk-ratio-sep">=</span>
          <TextInput label="c" value={c} onChange={setC} mono />
          <span className="tk-ratio-sep">:</span>
          <TextInput label="d" value={d} onChange={setD} mono />
        </div>
        <ErrorBanner message={error} />
        {solved && (
          <StatRow
            stats={[
              { label: `Ontbrekende waarde (${solved.label})`, value: fmt(solved.value) },
              ...(simplified ? [{ label: 'Vereenvoudigd a : b', value: simplified }] : []),
              ...(decimal ? [{ label: 'Als factor (a/b)', value: decimal }] : [])
            ]}
          />
        )}
        <Note>
          Handig voor schaal (bv. 1 : 100), recepten opschalen of het derde deel van een verhouding
          vinden. Voorbeeld: <code>1 : 4 = 5 : ?</code> → 20.
        </Note>
      </div>
    </ToolShell>
  )
}

export default RatioCalc
