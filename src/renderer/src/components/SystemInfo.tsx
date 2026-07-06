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

function SystemInfo(): JSX.Element {
  const [info, setInfo] = useState<Info>(collect)

  return (
    <ToolShell
      title="User-agent & systeeminfo"
      subtitle="Bekijk de gegevens die je browser over dit systeem prijsgeeft."
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
