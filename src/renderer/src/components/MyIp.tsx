import { JSX, useEffect, useState } from 'react'
import { ToolShell, ErrorBanner, CopyButton, Note } from './toolkit'

const MY_IP_INFO = (
  <>
    <h4>Wat doet deze tool?</h4>
    <p>
      Toont zowel je publieke als je lokale IP-adres. Met <b>Vernieuwen</b> haal je de gegevens
      opnieuw op.
    </p>
    <h4>Wat je ziet</h4>
    <ul>
      <li>
        <b>Publiek IP</b> — het adres waarmee je op internet zichtbaar bent, opgehaald via een
        externe dienst (met meerdere back-ups). Vereist een internetverbinding.
      </li>
      <li>
        <b>Lokaal IP</b> — je adres(sen) binnen het thuis- of kantoornetwerk, rechtstreeks uit de
        netwerkadapters van je apparaat gelezen.
      </li>
    </ul>
  </>
)

function MyIp(): JSX.Element {
  const [publicIp, setPublicIp] = useState('')
  const [local, setLocal] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchIps = (isCancelled: () => boolean): void => {
    window.api.network
      .getPublicIp()
      .then((ip) => {
        if (!isCancelled()) setPublicIp(ip)
      })
      .catch((e: Error) => {
        if (!isCancelled()) setError(e?.message || 'Kon het publieke IP niet ophalen.')
      })
      .finally(() => {
        if (!isCancelled()) setLoading(false)
      })
    window.api.network
      .getLocalIps()
      .then((ips) => {
        if (!isCancelled()) setLocal(ips)
      })
      .catch(() => {
        if (!isCancelled()) setLocal([])
      })
  }

  const refresh = (): void => {
    setLoading(true)
    setError(null)
    setPublicIp('')
    fetchIps(() => false)
  }

  useEffect(() => {
    let cancelled = false
    fetchIps(() => cancelled)
    return () => {
      cancelled = true
    }
  }, [])

  const localText = local.length ? local.join(', ') : ''

  return (
    <ToolShell
      title="Mijn IP"
      subtitle="Bekijk je publieke en lokale IP-adres."
      info={MY_IP_INFO}
    >
      <div className="panel tool-panel">
        <div className="tk-actions">
          <button className="btn" onClick={refresh} disabled={loading}>
            {loading ? 'Bezig…' : 'Vernieuwen'}
          </button>
        </div>
        <ErrorBanner message={error} />
        <dl className="tk-kv">
          <dt>Publiek IP</dt>
          <dd>
            {publicIp ? (
              <span className="tk-mono" style={{ marginRight: 8 }}>
                {publicIp}
                <span style={{ display: 'inline-block', marginLeft: 8 }}>
                  <CopyButton value={publicIp} />
                </span>
              </span>
            ) : loading ? (
              'Ophalen…'
            ) : (
              'onbekend'
            )}
          </dd>
          <dt>Lokaal IP</dt>
          <dd>
            {localText ? (
              <span className="tk-mono">
                {localText}
                <span style={{ display: 'inline-block', marginLeft: 8 }}>
                  <CopyButton value={localText} />
                </span>
              </span>
            ) : (
              'niet gevonden'
            )}
          </dd>
        </dl>
        <Note>
          Het lokale adres wordt rechtstreeks uit je netwerkadapters gelezen. Zie je er meerdere, dan
          heb je bijvoorbeeld zowel wifi als ethernet, of een VPN/virtuele adapter actief.
        </Note>
      </div>
    </ToolShell>
  )
}

export default MyIp
