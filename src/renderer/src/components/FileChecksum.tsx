import { JSX, useState } from 'react'
import { formatBytes } from '../lib/api'
import { ToolShell, OutputArea, TextInput, ErrorBanner, Note } from './toolkit'
import { FileButton } from './ToolFields'

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function FileChecksum(): JSX.Element {
  const [file, setFile] = useState<File | null>(null)
  const [hash, setHash] = useState('')
  const [expected, setExpected] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pick = async (f: File | null): Promise<void> => {
    setFile(f)
    setHash('')
    setError(null)
    if (!f) return
    setBusy(true)
    try {
      const buf = await f.arrayBuffer()
      const digest = await crypto.subtle.digest('SHA-256', buf)
      setHash(toHex(digest))
    } catch (e) {
      setError(`Kon de checksum niet berekenen: ${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  const trimmed = expected.trim().toLowerCase()
  const match = hash && trimmed ? trimmed === hash.toLowerCase() : null

  return (
    <ToolShell
      title="Bestand-checksum"
      subtitle="Bereken de SHA-256-hash van een bestand en vergelijk met een verwachte waarde."
    >
      <>
        <div className="panel">
          <FileButton label="Bestand" accept="*/*" file={file} onPick={pick} />
          {file && (
            <Note>
              {file.name} — {formatBytes(file.size)}
            </Note>
          )}
          {busy && <Note>Bezig…</Note>}
          <ErrorBanner message={error} />
        </div>

        {hash && (
          <div className="panel">
            <OutputArea label="SHA-256" value={hash} rows={2} />
            <TextInput
              label="Verwachte hash (optioneel)"
              value={expected}
              onChange={setExpected}
              placeholder="Plak hier de verwachte SHA-256…"
              mono
            />
            {match !== null && (
              <p style={{ color: match ? '#3ecf8e' : '#e05a5a', fontWeight: 600, margin: '8px 0' }}>
                {match ? '✓ Komt overeen' : '✗ Komt niet overeen'}
              </p>
            )}
          </div>
        )}
      </>
    </ToolShell>
  )
}

export default FileChecksum
