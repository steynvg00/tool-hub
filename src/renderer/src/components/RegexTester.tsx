import { JSX, useMemo, useState } from 'react'
import { ToolShell, TextInput, TextArea, ErrorBanner, Note } from './toolkit'

type Match = { index: number; full: string; groups: string[] }

type Segment = { text: string; match: boolean }

const REGEX_INFO = (
  <>
    <h4>Wat doet deze tool?</h4>
    <p>
      Test een reguliere expressie live op je tekst. Matches worden gemarkeerd in het voorbeeld en
      in een tabel getoond, met een kolom per opgevangen groep.
    </p>
    <h4>Opties</h4>
    <ul>
      <li>
        <b>Patroon</b> — de reguliere expressie zelf (zonder omringende schuine strepen). Een
        ongeldig patroon wordt rood gemarkeerd.
      </li>
      <li>
        <b>Vlaggen</b> — de regex-vlaggen, zoals <code>g</code> (alle matches), <code>i</code>{' '}
        (hoofdletterongevoelig) en <code>m</code> (meerdere regels). De tool zoekt altijd naar alle
        matches, ook zonder <code>g</code>.
      </li>
      <li>
        <b>Testtekst</b> — de tekst waarop het patroon wordt toegepast.
      </li>
    </ul>
  </>
)

function RegexTester(): JSX.Element {
  const [pattern, setPattern] = useState('')
  const [flags, setFlags] = useState('g')
  const [text, setText] = useState('')

  const result = useMemo(() => {
    if (!pattern) {
      return { error: null as string | null, segments: [{ text, match: false }] as Segment[], matches: [] as Match[] }
    }
    let re: RegExp
    try {
      // Compile with user flags to validate them.
      new RegExp(pattern, flags)
      const iterFlags = flags.includes('g') ? flags : flags + 'g'
      re = new RegExp(pattern, iterFlags)
    } catch (e) {
      return { error: (e as Error).message, segments: [] as Segment[], matches: [] as Match[] }
    }

    const segments: Segment[] = []
    const matches: Match[] = []
    let last = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) segments.push({ text: text.slice(last, m.index), match: false })
      segments.push({ text: m[0], match: true })
      matches.push({ index: m.index, full: m[0], groups: m.slice(1).map((g) => g ?? '') })
      last = m.index + m[0].length
      if (m.index === re.lastIndex) re.lastIndex++
    }
    if (last < text.length) segments.push({ text: text.slice(last), match: false })

    return { error: null as string | null, segments, matches }
  }, [pattern, flags, text])

  const maxGroups = result.matches.reduce((n, m) => Math.max(n, m.groups.length), 0)

  return (
    <ToolShell
      title="Regex-tester"
      subtitle="Test reguliere expressies live op je tekst."
      info={REGEX_INFO}
    >
      <div className="panel tool-panel">
        <div className="tk-two">
          <label className="tool-field">
            <span className="tool-label">Patroon</span>
            <input
              className={result.error ? 'tk-mono rx-invalid' : 'tk-mono'}
              value={pattern}
              spellCheck={false}
              onChange={(e) => setPattern(e.target.value)}
            />
          </label>
          <TextInput label="Vlaggen" value={flags} onChange={setFlags} mono />
        </div>

        <TextArea label="Testtekst" value={text} onChange={setText} rows={6} mono={false} />

        <ErrorBanner message={result.error} />

        {!result.error && (
          <>
            <div className="tool-field">
              <span className="tool-label">Voorbeeld</span>
              <div className="tk-output tk-mono">
                {result.segments.map((s, i) =>
                  s.match ? (
                    <mark className="rx-mark" key={i}>
                      {s.text}
                    </mark>
                  ) : (
                    <span key={i}>{s.text}</span>
                  )
                )}
              </div>
            </div>

            {result.matches.length === 0 ? (
              <Note>Geen matches.</Note>
            ) : (
              <>
                <Note>
                  {result.matches.length} match{result.matches.length === 1 ? '' : 'es'} gevonden.
                </Note>
                <div className="tk-table-wrap">
                  <table className="tk-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Match</th>
                        {Array.from({ length: maxGroups }, (_, g) => (
                          <th key={g}>Groep {g + 1}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.matches.map((m, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td className="tk-mono">{m.full}</td>
                          {Array.from({ length: maxGroups }, (_, g) => (
                            <td className="tk-mono" key={g}>
                              {m.groups[g] ?? ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </ToolShell>
  )
}

export default RegexTester
