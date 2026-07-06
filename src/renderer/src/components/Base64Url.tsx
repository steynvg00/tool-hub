import { JSX, useState } from 'react'
import { ToolShell, TextArea, OutputArea, Segmented, ErrorBanner } from './toolkit'

type Mode = 'base64' | 'url'
type Direction = 'encode' | 'decode'

function encodeBase64(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

function decodeBase64(b64: string): string {
  return new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)))
}

const BASE64_URL_INFO = (
  <>
    <h4>Wat doet deze tool?</h4>
    <p>
      Codeert en decodeert tekst als Base64 of als URL-codering. De uitvoer wordt live berekend
      terwijl je typt.
    </p>
    <h4>Opties</h4>
    <ul>
      <li>
        <b>Type</b> — <code>Base64</code> zet tekst om in Base64; <code>URL</code> gebruikt
        percent-codering (<code>encodeURIComponent</code>) voor gebruik in URL&apos;s.
      </li>
      <li>
        <b>Richting</b> — <code>Coderen</code> zet gewone tekst om; <code>Decoderen</code> zet een
        gecodeerde waarde terug naar tekst.
      </li>
    </ul>
  </>
)

function Base64Url(): JSX.Element {
  const [mode, setMode] = useState<Mode>('base64')
  const [direction, setDirection] = useState<Direction>('encode')
  const [input, setInput] = useState('')

  let output = ''
  let error = ''
  try {
    if (mode === 'base64') {
      output =
        direction === 'encode' ? encodeBase64(input) : input === '' ? '' : decodeBase64(input)
    } else {
      output = direction === 'encode' ? encodeURIComponent(input) : decodeURIComponent(input)
    }
  } catch {
    error = mode === 'base64' ? 'Ongeldige Base64-invoer' : 'Ongeldige URL-codering'
  }

  return (
    <ToolShell title="Base64 & URL" subtitle="Coderen en decoderen van tekst." info={BASE64_URL_INFO}>
      <div className="panel">
        <div className="tk-row">
          <div className="tool-field">
            <span className="tool-label">Type</span>
            <Segmented<Mode>
              options={[
                { value: 'base64', label: 'Base64' },
                { value: 'url', label: 'URL' }
              ]}
              value={mode}
              onChange={setMode}
            />
          </div>
          <div className="tool-field">
            <span className="tool-label">Richting</span>
            <Segmented<Direction>
              options={[
                { value: 'encode', label: 'Coderen' },
                { value: 'decode', label: 'Decoderen' }
              ]}
              value={direction}
              onChange={setDirection}
            />
          </div>
        </div>
      </div>

      <div className="tk-two">
        <div className="panel">
          <TextArea label="Invoer" value={input} onChange={setInput} rows={12} />
        </div>
        <div className="panel">
          <OutputArea label="Uitvoer" value={error ? '' : output} rows={12} />
          <ErrorBanner message={error} />
        </div>
      </div>
    </ToolShell>
  )
}

export default Base64Url
