import { JSX, useState } from 'react'
import { ToolShell, OutputArea, Note } from './toolkit'
import { NumberField } from './ToolFields'

const UUID_INFO = (
  <>
    <h4>Wat doet deze tool?</h4>
    <p>
      Genereert willekeurige versie-4 UUID&apos;s (RFC 4122) via de Web Crypto API. Elke UUID komt
      op een eigen regel te staan.
    </p>
    <h4>Opties</h4>
    <ul>
      <li>
        <b>Aantal</b> — hoeveel UUID&apos;s je genereert (tussen <code>1</code> en{' '}
        <code>1000</code>).
      </li>
    </ul>
  </>
)

/** Generate one or more RFC 4122 version-4 UUIDs via the Web Crypto API. */
function UuidGen(): JSX.Element {
  const [count, setCount] = useState(1)
  const [uuids, setUuids] = useState<string[]>([])

  const generate = (): void => {
    const n = Math.max(1, Math.min(1000, Math.floor(count) || 1))
    setUuids(Array.from({ length: n }, () => crypto.randomUUID()))
  }

  return (
    <ToolShell
      title="UUID-generator"
      subtitle="Genereer willekeurige versie-4 UUID's."
      info={UUID_INFO}
    >
      <div className="panel tool-panel">
        <div className="tk-row">
          <NumberField label="Aantal" value={count} min={1} max={1000} onChange={setCount} />
          <button className="btn btn-primary" style={{ width: 'auto' }} onClick={generate}>
            Genereren
          </button>
        </div>

        {uuids.length > 0 ? (
          <OutputArea
            label={`${uuids.length} UUID${uuids.length > 1 ? "'s" : ''}`}
            value={uuids.join('\n')}
            rows={Math.min(12, Math.max(2, uuids.length))}
          />
        ) : (
          <Note>Klik op “Genereren” voor één of meer UUID’s (v4).</Note>
        )}
      </div>
    </ToolShell>
  )
}

export default UuidGen
