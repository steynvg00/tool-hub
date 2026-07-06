import { JSX, useState } from 'react'
import { ToolShell, TextArea, StatRow, CopyButton } from './toolkit'

function titleCaseLine(line: string): string {
  return line.replace(/\S+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
}

const TEXT_CLEANUP_INFO = (
  <>
    <h4>Wat doet deze tool?</h4>
    <p>
      Bewerkt tekst regel voor regel en toont live het aantal tekens, woorden en regels. Elke knop
      past een bewerking toe op de hele tekst.
    </p>
    <h4>Opties</h4>
    <ul>
      <li>
        <b>Trim regels</b> — verwijdert spaties en tabs aan het begin en einde van elke regel.
      </li>
      <li>
        <b>Dubbele spaties weg</b> — vervangt reeksen spaties of tabs door één enkele spatie.
      </li>
      <li>
        <b>Lege regels weg</b> — verwijdert regels die leeg zijn of alleen witruimte bevatten.
      </li>
      <li>
        <b>Sorteer A→Z / Z→A</b> — sorteert de regels alfabetisch, oplopend of aflopend.
      </li>
      <li>
        <b>Ontdubbel regels</b> — houdt alleen de eerste van elke identieke regel over.
      </li>
      <li>
        <b>UPPERCASE / kleine letters</b> — zet alle tekst om naar hoofdletters of kleine letters.
      </li>
      <li>
        <b>Title Case</b> — geeft elk woord een hoofdletter en de rest kleine letters.
      </li>
    </ul>
  </>
)

function TextCleanup(): JSX.Element {
  const [text, setText] = useState('')

  const mapLines = (fn: (lines: string[]) => string[]): void => {
    setText(fn(text.split(/\r?\n/)).join('\n'))
  }

  const tekens = text.length
  const woorden = (text.trim().match(/\S+/g) || []).length
  const regels = text === '' ? 0 : text.split(/\r?\n/).length

  return (
    <ToolShell
      title="Tekst opschonen & tellen"
      subtitle="Bewerk, tel en herstructureer tekst regel voor regel."
      info={TEXT_CLEANUP_INFO}
    >
      <div className="panel">
        <TextArea label="Tekst" value={text} onChange={setText} rows={12} mono={false} />

        <StatRow
          stats={[
            { label: 'tekens', value: tekens },
            { label: 'woorden', value: woorden },
            { label: 'regels', value: regels }
          ]}
        />

        <div className="tk-actions">
          <CopyButton value={text} />
          <button className="btn" onClick={() => mapLines((l) => l.map((s) => s.trim()))}>
            Trim regels
          </button>
          <button
            className="btn"
            onClick={() => mapLines((l) => l.map((s) => s.replace(/[ \t]+/g, ' ')))}
          >
            Dubbele spaties weg
          </button>
          <button className="btn" onClick={() => mapLines((l) => l.filter((s) => s.trim() !== ''))}>
            Lege regels weg
          </button>
          <button
            className="btn"
            onClick={() => mapLines((l) => [...l].sort((a, b) => a.localeCompare(b)))}
          >
            Sorteer A→Z
          </button>
          <button
            className="btn"
            onClick={() => mapLines((l) => [...l].sort((a, b) => b.localeCompare(a)))}
          >
            Sorteer Z→A
          </button>
          <button
            className="btn"
            onClick={() =>
              mapLines((l) => {
                const seen = new Set<string>()
                return l.filter((s) => (seen.has(s) ? false : (seen.add(s), true)))
              })
            }
          >
            Ontdubbel regels
          </button>
          <button className="btn" onClick={() => setText(text.toUpperCase())}>
            UPPERCASE
          </button>
          <button className="btn" onClick={() => setText(text.toLowerCase())}>
            kleine letters
          </button>
          <button className="btn" onClick={() => mapLines((l) => l.map(titleCaseLine))}>
            Title Case
          </button>
        </div>
      </div>
    </ToolShell>
  )
}

export default TextCleanup
