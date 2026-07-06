import { JSX, useEffect, useState } from 'react'
import { ToolShell, TextArea, OutputArea } from './toolkit'

type Hashes = { sha1: string; sha256: string; sha512: string }

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function HashText(): JSX.Element {
  const [text, setText] = useState('')
  const [hashes, setHashes] = useState<Hashes>({ sha1: '', sha256: '', sha512: '' })

  useEffect(() => {
    let cancelled = false
    const bytes = new TextEncoder().encode(text)
    Promise.all([
      crypto.subtle.digest('SHA-1', bytes),
      crypto.subtle.digest('SHA-256', bytes),
      crypto.subtle.digest('SHA-512', bytes)
    ]).then(([a, b, c]) => {
      if (!cancelled) setHashes({ sha1: toHex(a), sha256: toHex(b), sha512: toHex(c) })
    })
    return () => {
      cancelled = true
    }
  }, [text])

  return (
    <ToolShell title="Hash-generator" subtitle="Live SHA-1, SHA-256 en SHA-512 van je tekst.">
      <div className="panel">
        <TextArea label="Tekst" value={text} onChange={setText} rows={8} mono={false} />
      </div>
      <div className="panel">
        <OutputArea label="SHA-1" value={hashes.sha1} rows={2} />
        <OutputArea label="SHA-256" value={hashes.sha256} rows={2} />
        <OutputArea label="SHA-512" value={hashes.sha512} rows={2} />
      </div>
    </ToolShell>
  )
}

export default HashText
