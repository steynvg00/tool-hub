import { JSX, useState } from 'react'
import { ToolShell, TextArea, CopyButton, Toggle, Note } from './toolkit'

/** Fisher-Yates shuffle returning a new array. */
function shuffle<T>(input: T[]): T[] {
  const arr = [...input]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

const SHUFFLE_INFO = (
  <>
    <h4>Wat doet deze tool?</h4>
    <p>
      Zet je items in een willekeurige volgorde. Het bovenste item is telkens &quot;aan de
      beurt&quot;. Handig om bijvoorbeeld een beurtvolgorde te bepalen.
    </p>
    <h4>Opties</h4>
    <ul>
      <li>
        <b>Items</b> — één item per regel; lege regels worden genegeerd.
      </li>
      <li>
        <b>Shuffle</b> — bepaalt een nieuwe willekeurige volgorde.
      </li>
      <li>
        <b>Nummeren bij kopiëren</b> — zet er nummers voor (1. 2. 3.) wanneer je de volgorde
        kopieert.
      </li>
      <li>
        <b>Kopiëer volgorde</b> — kopieert de geschudde lijst naar het klembord.
      </li>
    </ul>
  </>
)

function Shuffle(): JSX.Element {
  const [text, setText] = useState('')
  const [numbered, setNumbered] = useState(true)
  const [order, setOrder] = useState<string[]>([])

  const items = text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s !== '')

  const doShuffle = (): void => {
    setOrder(shuffle(items))
  }

  const copyValue = order.map((item, i) => (numbered ? `${i + 1}. ${item}` : item)).join('\n')

  return (
    <ToolShell
      title="Volgorde / shuffle"
      subtitle="Zet je items in een willekeurige volgorde."
      info={SHUFFLE_INFO}
    >
      <div className="panel">
        <TextArea
          label="Items (één per regel)"
          value={text}
          onChange={setText}
          rows={8}
          mono={false}
          placeholder={'Item 1\nItem 2\nItem 3'}
        />

        <div className="tk-actions">
          <button
            className="btn btn-primary"
            style={{ width: 'auto' }}
            onClick={doShuffle}
            disabled={items.length === 0}
          >
            Shuffle
          </button>
          <Toggle label="Nummeren bij kopiëren" checked={numbered} onChange={setNumbered} />
          {order.length > 0 && <CopyButton value={copyValue} label="Kopiëer volgorde" />}
        </div>

        {items.length === 0 && <Note>Voer minstens één item in om te shufflen.</Note>}

        {order.length > 0 && (
          <ol>
            {order.map((item, i) => (
              <li key={i} style={i === 0 ? { fontWeight: 800 } : undefined}>
                {item}
                {i === 0 && (
                  <span className="tk-badge" style={{ marginLeft: 8 }}>
                    aan de beurt
                  </span>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </ToolShell>
  )
}

export default Shuffle
