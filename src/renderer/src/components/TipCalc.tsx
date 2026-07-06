import { JSX, useState } from 'react'
import { ToolShell, TextInput, Segmented, StatRow, Note } from './toolkit'

const eur = (n: number): string =>
  n.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const PRESETS = ['5', '10', '12.5', '15', '20']

function TipCalc(): JSX.Element {
  const [amount, setAmount] = useState('47.50')
  const [tip, setTip] = useState('10')
  const [people, setPeople] = useState('2')
  const [round, setRound] = useState<'off' | 'up'>('off')

  const a = Number(amount)
  const p = Number(tip)
  const n = Math.max(1, Math.floor(Number(people) || 1))
  const ok = amount.trim() && tip.trim() && !Number.isNaN(a) && !Number.isNaN(p)

  const tipAmount = ok ? (a * p) / 100 : 0
  let total = a + tipAmount
  if (round === 'up') total = Math.ceil(total)
  const perPerson = total / n
  const effectiveTip = a > 0 ? ((total - a) / a) * 100 : 0

  return (
    <ToolShell title="Fooi-calculator" subtitle="Bereken de fooi, het totaal en het bedrag per persoon.">
      <div className="panel tool-panel">
        <div className="tk-row">
          <TextInput label="Rekening (€)" value={amount} onChange={setAmount} mono />
          <TextInput label="Fooi (%)" value={tip} onChange={setTip} mono />
          <TextInput label="Aantal personen" value={people} onChange={setPeople} mono />
        </div>
        <div className="tk-pills">
          {PRESETS.map((v) => (
            <button
              key={v}
              className={'tk-pill' + (tip === v ? ' on' : '')}
              onClick={() => setTip(v)}
              style={{ cursor: 'pointer' }}
            >
              {v}%
            </button>
          ))}
        </div>
        <div className="tool-field" style={{ marginTop: 10 }}>
          <span className="tool-label">Afronden</span>
          <Segmented<'off' | 'up'>
            options={[
              { value: 'off', label: 'Niet afronden' },
              { value: 'up', label: 'Totaal naar boven' }
            ]}
            value={round}
            onChange={setRound}
          />
        </div>
        {ok && (
          <StatRow
            stats={[
              { label: 'Fooi', value: '€ ' + eur(total - a) },
              { label: 'Totaal', value: '€ ' + eur(total) },
              { label: `Per persoon (${n})`, value: '€ ' + eur(perPerson) },
              { label: 'Effectieve fooi', value: effectiveTip.toFixed(1) + ' %' }
            ]}
          />
        )}
        <Note>Bij afronden naar boven wordt het hele totaal afgerond; de effectieve fooi past zich aan.</Note>
      </div>
    </ToolShell>
  )
}

export default TipCalc
