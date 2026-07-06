import { JSX, useEffect, useState } from 'react'
import { ToolShell, ErrorBanner, CopyButton, Note } from './toolkit'

async function localIps(): Promise<string[]> {
  return new Promise((resolve) => {
    const ips = new Set<string>()
    let pc: RTCPeerConnection
    try {
      pc = new RTCPeerConnection({ iceServers: [] })
    } catch {
      resolve([])
      return
    }
    pc.createDataChannel('')
    pc.onicecandidate = (e) => {
      if (!e.candidate) {
        pc.close()
        resolve([...ips])
        return
      }
      const m = /([0-9]{1,3}(?:\.[0-9]{1,3}){3}|[a-f0-9:]+)/i.exec(e.candidate.candidate)
      if (m) ips.add(m[1])
    }
    pc.createOffer()
      .then((o) => pc.setLocalDescription(o))
      .catch(() => resolve([]))
    setTimeout(() => {
      try {
        pc.close()
      } catch {
        /* already closed */
      }
      resolve([...ips])
    }, 1500)
  })
}

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
        externe dienst. Vereist een internetverbinding.
      </li>
      <li>
        <b>Lokaal IP</b> — je adres binnen het thuis- of kantoornetwerk, gevonden via WebRTC.
        Moderne browsers verbergen dit vaak achter een <code>.local</code>-naam, waardoor het niet
        altijd verschijnt.
      </li>
    </ul>
  </>
)

function MyIp(): JSX.Element {
  const [publicIp, setPublicIp] = useState('')
  const [local, setLocal] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fires only async setState (inside promise callbacks), safe to call from an effect.
  const fetchIps = (isCancelled: () => boolean): void => {
    fetch('https://api.ipify.org?format=json')
      .then((r) => r.json() as Promise<{ ip: string }>)
      .then((d) => {
        if (!isCancelled()) setPublicIp(d.ip)
      })
      .catch(() => {
        if (!isCancelled()) setError('Kon het publieke IP niet ophalen — geen internetverbinding?')
      })
      .finally(() => {
        if (!isCancelled()) setLoading(false)
      })
    localIps().then((ips) => {
      if (!isCancelled()) setLocal(ips)
    })
  }

  const refresh = (): void => {
    setLoading(true)
    setError(null)
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
          Moderne browsers verbergen het lokale adres vaak achter een mDNS-naam die eindigt op
          .local om je privacy te beschermen, waardoor het hier niet altijd verschijnt.
        </Note>
      </div>
    </ToolShell>
  )
}

export default MyIp
