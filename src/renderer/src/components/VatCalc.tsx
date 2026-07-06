import { JSX, useState } from 'react'
import { ToolShell, TextInput, Segmented, StatRow, Note } from './toolkit'

// "incl" = the entered amount already contains VAT; "excl" = add VAT to it.
type Basis = 'excl' | 'incl'

const eur = (n: number): string =>
  n.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const RATES = ['0', '9', '21']

const VAT_CALC_INFO = (
  <>
    <h4>Wat doet deze tool?</h4>
    <p>
      Splitst een bedrag in netto (exclusief btw), de btw zelf en bruto (inclusief btw) — of je nu een
      bedrag met of zonder btw invoert.
    </p>
    <h4>Opties</h4>
    <ul>
      <li>
        <b>Het ingevoerde bedrag is…</b> — <code>Exclusief btw</code> telt de btw bij het bedrag op;{' '}
        <code>Inclusief btw</code> rekent de btw uit een bedrag dat de btw al bevat.
      </li>
      <li>
        <b>Bedrag (€)</b> — het bedrag dat je invoert.
      </li>
      <li>
        <b>Btw-tarief (%)</b> — het tarief; met de snelknoppen kies je de Nederlandse tarieven 0, 9 of
        21%.
      </li>
    </ul>
    <p>Nederlandse tarieven: 21% (algemeen), 9% (o.a. eten, boeken), 0% (bepaalde diensten).</p>
  </>
)

function VatCalc(): JSX.Element {
  const [amount, setAmount] = useState('100')
  const [rate, setRate] = useState('21')
  const [basis, setBasis] = useState<Basis>('excl')

  const a = Number(amount)
  const r = Number(rate) / 100
  const ok = amount.trim() && rate.trim() && !Number.isNaN(a) && !Number.isNaN(r)

  let net: number
  let vat: number
  let gross: number
  if (basis === 'excl') {
    net = a
    vat = a * r
    gross = a + vat
  } else {
    gross = a
    net = a / (1 + r)
    vat = gross - net
  }

  return (
    <ToolShell
      title="BTW-rekenaar"
      subtitle="Reken tussen bedragen in- en exclusief btw, met instelbaar tarief."
      info={VAT_CALC_INFO}
    >
      <div className="panel tool-panel">
        <div className="tool-field">
          <span className="tool-label">Het ingevoerde bedrag is…</span>
          <Segmented<Basis>
            options={[
              { value: 'excl', label: 'Exclusief btw' },
              { value: 'incl', label: 'Inclusief btw' }
            ]}
            value={basis}
            onChange={setBasis}
          />
        </div>
        <div className="tk-row" style={{ marginTop: 10 }}>
          <TextInput label="Bedrag (€)" value={amount} onChange={setAmount} mono />
          <TextInput label="Btw-tarief (%)" value={rate} onChange={setRate} mono placeholder="eigen %" />
        </div>
        <div className="tk-pills">
          {RATES.map((v) => (
            <button
              key={v}
              className={'tk-pill' + (rate === v ? ' on' : '')}
              onClick={() => setRate(v)}
              style={{ cursor: 'pointer' }}
            >
              {v}%
            </button>
          ))}
        </div>
        {ok && (
          <StatRow
            stats={[
              { label: 'Exclusief btw', value: '€ ' + eur(net) },
              { label: `Btw (${Number(rate)}%)`, value: '€ ' + eur(vat) },
              { label: 'Inclusief btw', value: '€ ' + eur(gross) }
            ]}
          />
        )}
        <Note>Nederlandse tarieven: 21% (algemeen), 9% (o.a. eten, boeken), 0% (bepaalde diensten).</Note>
      </div>
    </ToolShell>
  )
}

export default VatCalc
