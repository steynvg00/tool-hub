import { JSX, useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { ToolShell, TextInput, Segmented, Toggle, ErrorBanner, Note } from './toolkit'

type Security = 'WPA' | 'WEP' | 'nopass'

/** Escape the special characters that carry meaning inside a WIFI: payload. */
function escape(input: string): string {
  return input.replace(/([\\;,:"])/g, '\\$1')
}

const WIFI_QR_INFO = (
  <>
    <h4>Wat doet deze tool?</h4>
    <p>
      Maakt een QR-code waarmee een telefoon direct verbinding maakt met je wifi: de camera scant
      de code en biedt aan om verbinding te maken, zonder het wachtwoord te typen. Je kunt de
      QR-code als <code>PNG</code> downloaden.
    </p>
    <h4>Opties</h4>
    <ul>
      <li>
        <b>Netwerknaam (SSID)</b> — de naam van het wifi-netwerk. Verplicht om een code te maken.
      </li>
      <li>
        <b>Wachtwoord</b> — het wifi-wachtwoord. Niet nodig bij beveiliging <code>Geen</code>.
      </li>
      <li>
        <b>Beveiliging</b> — het type versleuteling: <code>WPA/WPA2</code> (gangbaar),{' '}
        <code>WEP</code> (oud) of <code>Geen</code> voor een open netwerk.
      </li>
      <li>
        <b>Verborgen netwerk</b> — zet aan als het netwerk zijn SSID niet uitzendt.
      </li>
    </ul>
    <p>Let op: het wachtwoord staat als leesbare tekst in de QR-code verwerkt.</p>
  </>
)

function WifiQr(): JSX.Element {
  const [ssid, setSsid] = useState('')
  const [password, setPassword] = useState('')
  const [security, setSecurity] = useState<Security>('WPA')
  const [hidden, setHidden] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [drawn, setDrawn] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const payload =
    security === 'nopass'
      ? `WIFI:T:nopass;S:${escape(ssid)};H:${hidden ? 'true' : 'false'};;`
      : `WIFI:T:${security};S:${escape(ssid)};P:${escape(password)};H:${hidden ? 'true' : 'false'};;`

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (!ssid) {
      const ctx = canvas.getContext('2d')
      ctx?.clearRect(0, 0, canvas.width, canvas.height)
      return
    }
    let cancelled = false
    QRCode.toCanvas(canvas, payload, { width: 256, margin: 2 })
      .then(() => {
        if (!cancelled) {
          setDrawn(true)
          setError(null)
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setDrawn(false)
          setError(`Kon geen QR-code maken: ${(e as Error).message}`)
        }
      })
    return () => {
      cancelled = true
    }
  }, [payload, ssid])

  const ready = Boolean(ssid) && drawn && !error

  const download = (): void => {
    const canvas = canvasRef.current
    if (!canvas || !ready) return
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = 'wifi-qr.png'
    a.click()
  }

  return (
    <ToolShell
      title="Wifi-QR"
      subtitle="Maak een scanbare QR-code waarmee een telefoon direct verbinding maakt met je wifi."
      info={WIFI_QR_INFO}
    >
      <div className="panel tool-panel">
        <TextInput
          label="Netwerknaam (SSID)"
          value={ssid}
          onChange={setSsid}
          placeholder="MijnWifi"
        />
        <TextInput
          label="Wachtwoord"
          value={password}
          onChange={setPassword}
          type="text"
          placeholder="wachtwoord"
        />
        <label className="tool-field">
          <span className="tool-label">Beveiliging</span>
          <Segmented<Security>
            options={[
              { value: 'WPA', label: 'WPA/WPA2' },
              { value: 'WEP', label: 'WEP' },
              { value: 'nopass', label: 'Geen' }
            ]}
            value={security}
            onChange={setSecurity}
          />
        </label>
        <Toggle label="Verborgen netwerk" checked={hidden} onChange={setHidden} />
        <ErrorBanner message={ssid ? error : null} />
      </div>

      <div className="panel tool-panel">
        <div className="tk-qr" style={{ display: ready ? 'inline-block' : 'none' }}>
          <canvas ref={canvasRef} />
        </div>
        {!ssid && <Note>Voer een netwerknaam (SSID) in om een QR-code te maken.</Note>}
        {ready && (
          <>
            <div className="tk-actions">
              <button className="btn btn-primary" onClick={download}>
                Download als PNG
              </button>
            </div>
            <div className="tk-mono" style={{ marginTop: 10, wordBreak: 'break-all' }}>
              {payload}
            </div>
            <Note>Let op: het wachtwoord staat als leesbare tekst in de QR-code verwerkt.</Note>
          </>
        )}
      </div>
    </ToolShell>
  )
}

export default WifiQr
