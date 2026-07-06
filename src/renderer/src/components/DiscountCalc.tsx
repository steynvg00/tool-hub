import { JSX, useState } from 'react'
import { ToolShell, TextInput, StatRow, Note } from './toolkit'

const eur = (n: number): string =>
  n.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const PRESETS = ['10', '15', '20', '25', '50', '70']

function DiscountCalc(): JSX.Element {
  const [price, setPrice] = useState('79.99')
  const [discount, setDiscount] = useState('25')
  const [extra, setExtra] = useState('0')

  const p = Number(price)
  const d = Number(discount)
  const e = Number(extra)
  const ok = price.trim() && discount.trim() && !Number.isNaN(p) && !Number.isNaN(d)

  // Apply the main discount, then optionally a second (stacked) discount.
  const afterFirst = p * (1 - d / 100)
  const hasExtra = extra.trim() !== '' && !Number.isNaN(e) && e !== 0
  const final = hasExtra ? afterFirst * (1 - e / 100) : afterFirst
  const saved = p - final
  const effective = p > 0 ? (saved / p) * 100 : 0

  return (
    <ToolShell title="Korting-rekenaar" subtitle="Van originele prijs en korting naar eindprijs en besparing.">
      <div className="panel tool-panel">
        <div className="tk-row">
          <TextInput label="Originele prijs (€)" value={price} onChange={setPrice} mono />
          <TextInput label="Korting (%)" value={discount} onChange={setDiscount} mono />
          <TextInput label="Extra stapelkorting (%)" value={extra} onChange={setExtra} mono />
        </div>
        <div className="tk-pills">
          {PRESETS.map((v) => (
            <button
              key={v}
              className={'tk-pill' + (discount === v ? ' on' : '')}
              onClick={() => setDiscount(v)}
              style={{ cursor: 'pointer' }}
            >
              −{v}%
            </button>
          ))}
        </div>
        {ok && (
          <StatRow
            stats={[
              { label: 'Eindprijs', value: '€ ' + eur(final) },
              { label: 'Je bespaart', value: '€ ' + eur(saved) },
              {
                label: hasExtra ? 'Totale korting' : 'Korting',
                value: effective.toFixed(1) + ' %'
              }
            ]}
          />
        )}
        <Note>
          Stapelkorting rekent de tweede korting over de al verlaagde prijs — twee keer 20% is samen
          36%, niet 40%.
        </Note>
      </div>
    </ToolShell>
  )
}

export default DiscountCalc
