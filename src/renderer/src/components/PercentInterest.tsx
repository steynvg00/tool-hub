import { JSX, useState } from 'react'
import { ToolShell, TextInput, Segmented, Note, StatRow } from './toolkit'

type Mode = 'of' | 'change' | 'compound'

const eur = (n: number): string =>
  n.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const pct = (n: number): string =>
  n.toLocaleString('nl-NL', { maximumFractionDigits: 4 }) + ' %'

function PercentOf(): JSX.Element {
  const [p, setP] = useState('15')
  const [base, setBase] = useState('80')
  const np = Number(p)
  const nb = Number(base)
  const ok = p.trim() && base.trim() && !Number.isNaN(np) && !Number.isNaN(nb)
  return (
    <>
      <div className="tk-row">
        <TextInput label="Percentage (%)" value={p} onChange={setP} mono />
        <TextInput label="Van waarde" value={base} onChange={setBase} mono />
      </div>
      {ok && (
        <StatRow
          stats={[
            { label: `${np}% van ${nb}`, value: (np / 100) * nb },
            { label: `${nb} is … % van 100`, value: nb === 0 ? '—' : pct((np / nb) * 100) },
            { label: 'Waarde + percentage', value: nb + (np / 100) * nb },
            { label: 'Waarde − percentage', value: nb - (np / 100) * nb }
          ]}
        />
      )}
    </>
  )
}

function PercentChange(): JSX.Element {
  const [from, setFrom] = useState('80')
  const [to, setTo] = useState('100')
  const nf = Number(from)
  const nt = Number(to)
  const ok = from.trim() && to.trim() && !Number.isNaN(nf) && !Number.isNaN(nt)
  const diff = nt - nf
  const change = nf === 0 ? NaN : (diff / Math.abs(nf)) * 100
  return (
    <>
      <div className="tk-row">
        <TextInput label="Van (oud)" value={from} onChange={setFrom} mono />
        <TextInput label="Naar (nieuw)" value={to} onChange={setTo} mono />
      </div>
      {ok && (
        <StatRow
          stats={[
            { label: 'Absoluut verschil', value: (diff >= 0 ? '+' : '') + diff },
            {
              label: 'Procentuele verandering',
              value: Number.isNaN(change) ? '—' : (change >= 0 ? '+' : '') + pct(change)
            },
            { label: 'Factor', value: nf === 0 ? '—' : Number((nt / nf).toPrecision(6)) + '×' }
          ]}
        />
      )}
    </>
  )
}

function Compound(): JSX.Element {
  const [principal, setPrincipal] = useState('1000')
  const [rate, setRate] = useState('4')
  const [years, setYears] = useState('10')
  const [perYear, setPerYear] = useState('12')
  const [deposit, setDeposit] = useState('0')

  const P = Number(principal)
  const r = Number(rate) / 100
  const t = Number(years)
  const n = Number(perYear)
  const d = Number(deposit)
  const ok =
    [P, r, t, n, d].every((v) => !Number.isNaN(v)) && n > 0 && t >= 0

  let final = P
  let contributed = P
  const rows: { period: string; balance: string }[] = []
  if (ok) {
    const periods = Math.round(n * t)
    const perRate = r / n
    let bal = P
    for (let i = 1; i <= periods; i++) {
      bal = bal * (1 + perRate) + d
      contributed += d
      // Snapshot the balance at the end of each whole year.
      if (i % n === 0) rows.push({ period: `Jaar ${i / n}`, balance: eur(bal) })
    }
    final = bal
  }
  const interest = final - contributed

  return (
    <>
      <div className="tk-row">
        <TextInput label="Startbedrag (€)" value={principal} onChange={setPrincipal} mono />
        <TextInput label="Rente per jaar (%)" value={rate} onChange={setRate} mono />
        <TextInput label="Looptijd (jaren)" value={years} onChange={setYears} mono />
      </div>
      <div className="tk-row">
        <TextInput label="Keer samengesteld / jaar" value={perYear} onChange={setPerYear} mono />
        <TextInput label="Inleg per periode (€)" value={deposit} onChange={setDeposit} mono />
      </div>
      {ok && (
        <>
          <StatRow
            stats={[
              { label: 'Eindbedrag', value: '€ ' + eur(final) },
              { label: 'Totaal ingelegd', value: '€ ' + eur(contributed) },
              { label: 'Rente / winst', value: '€ ' + eur(interest) }
            ]}
          />
          {rows.length > 0 && rows.length <= 60 && (
            <div className="tk-table-wrap" style={{ marginTop: 12, maxHeight: 260 }}>
              <table className="tk-table">
                <thead>
                  <tr>
                    <th>Periode</th>
                    <th>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.period}>
                      <td>{row.period}</td>
                      <td className="tk-mono">€ {row.balance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  )
}

const PERCENT_INTEREST_INFO = (
  <>
    <h4>Wat doet deze tool?</h4>
    <p>Drie rekenmodi rond percentages en rente, te kiezen met de knoppen bovenaan.</p>
    <h4>Modi</h4>
    <ul>
      <li>
        <b>Procent van</b> — met <b>Percentage (%)</b> en <b>Van waarde</b>: berekent het percentage van
        de waarde, welk percentage de waarde is, en de waarde plus/min dat percentage.
      </li>
      <li>
        <b>Verandering</b> — met <b>Van (oud)</b> en <b>Naar (nieuw)</b>: geeft het absolute verschil, de
        procentuele verandering en de vermenigvuldigingsfactor.
      </li>
      <li>
        <b>Samengestelde rente</b> — projecteert een spaarbedrag over de tijd. Elke periode wordt het
        saldo vermenigvuldigd met <code>(1 + rente/n)</code> en de inleg toegevoegd.
      </li>
    </ul>
    <h4>Velden bij samengestelde rente</h4>
    <ul>
      <li>
        <b>Startbedrag (€)</b> — het bedrag waarmee je begint.
      </li>
      <li>
        <b>Rente per jaar (%)</b> — het jaarlijkse rentepercentage.
      </li>
      <li>
        <b>Looptijd (jaren)</b> — het aantal jaren dat je rekent.
      </li>
      <li>
        <b>Keer samengesteld / jaar</b> — hoe vaak per jaar rente wordt bijgeschreven (<code>n</code>),
        bv. 12 voor maandelijks.
      </li>
      <li>
        <b>Inleg per periode (€)</b> — bedrag dat je elke periode extra inlegt; zet op <code>0</code>{' '}
        voor zuivere samengestelde rente.
      </li>
    </ul>
  </>
)

function PercentInterest(): JSX.Element {
  const [mode, setMode] = useState<Mode>('of')
  return (
    <ToolShell
      title="Percentage & rente"
      subtitle="Procent van een waarde, procentuele verandering en samengestelde rente."
      info={PERCENT_INTEREST_INFO}
    >
      <div className="panel tool-panel">
        <Segmented<Mode>
          options={[
            { value: 'of', label: 'Procent van' },
            { value: 'change', label: 'Verandering' },
            { value: 'compound', label: 'Samengestelde rente' }
          ]}
          value={mode}
          onChange={setMode}
        />
        <div style={{ marginTop: 12 }}>
          {mode === 'of' && <PercentOf />}
          {mode === 'change' && <PercentChange />}
          {mode === 'compound' && <Compound />}
        </div>
        {mode === 'compound' && (
          <Note>
            Formule: elke periode wordt het saldo vermenigvuldigd met (1 + rente/n) en de inleg
            toegevoegd. Zet inleg op 0 voor zuivere samengestelde rente.
          </Note>
        )}
      </div>
    </ToolShell>
  )
}

export default PercentInterest
