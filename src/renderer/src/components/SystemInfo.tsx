import { Fragment, JSX, useState } from 'react'
import { ToolShell, OutputArea } from './toolkit'

interface ExtraNav {
  deviceMemory?: number
  platform?: string
}

interface Info {
  userAgent: string
  rows: { label: string; value: string }[]
}

function collect(): Info {
  const nav = navigator as Navigator & ExtraNav
  const userAgent = nav.userAgent
  const languages = nav.languages && nav.languages.length ? nav.languages.join(', ') : nav.language

  const rows: { label: string; value: string }[] = [
    { label: 'Platform', value: nav.platform ?? 'onbekend' },
    { label: 'Talen', value: languages || 'onbekend' },
    {
      label: 'Schermresolutie',
      value: `${screen.width}×${screen.height} @${window.devicePixelRatio}x`
    },
    { label: 'Venstergrootte', value: `${window.innerWidth}×${window.innerHeight}` },
    { label: 'Tijdzone', value: Intl.DateTimeFormat().resolvedOptions().timeZone },
    {
      label: 'Kleurschema',
      value: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'donker' : 'licht'
    },
    { label: 'Online', value: nav.onLine ? 'ja' : 'nee' },
    {
      label: 'CPU-kernen',
      value: nav.hardwareConcurrency ? String(nav.hardwareConcurrency) : 'onbekend'
    },
    { label: 'Geheugen', value: nav.deviceMemory ? `${nav.deviceMemory} GB` : 'onbekend' }
  ]

  return { userAgent, rows }
}

const SYSTEM_INFO_INFO = (
  <>
    <h4>Wat doet deze tool?</h4>
    <p>
      Toont de gegevens die je browser over dit systeem prijsgeeft: platform, talen,
      schermresolutie, venstergrootte, tijdzone, kleurschema, online-status, aantal CPU-kernen en
      geheugen, plus de volledige user-agent-tekst. Met <b>Vernieuwen</b> lees je de waarden opnieuw
      uit.
    </p>
    <p>
      Dit is dezelfde informatie die websites kunnen zien; sommige velden tonen <code>onbekend</code>{' '}
      als je browser ze afschermt.
    </p>
  </>
)

function SystemInfo(): JSX.Element {
  const [info, setInfo] = useState<Info>(collect)

  return (
    <ToolShell
      title="User-agent & systeeminfo"
      subtitle="Bekijk de gegevens die je browser over dit systeem prijsgeeft."
      info={SYSTEM_INFO_INFO}
    >
      <div className="panel tool-panel">
        <div className="tk-actions">
          <button className="btn" onClick={() => setInfo(collect())}>
            Vernieuwen
          </button>
        </div>
        <dl className="tk-kv">
          {info.rows.map((r) => (
            <Fragment key={r.label}>
              <dt>{r.label}</dt>
              <dd>{r.value}</dd>
            </Fragment>
          ))}
        </dl>
        <OutputArea label="User-agent" value={info.userAgent} rows={3} />
      </div>
    </ToolShell>
  )
}

export default SystemInfo
