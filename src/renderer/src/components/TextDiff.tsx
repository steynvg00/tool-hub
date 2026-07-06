import { JSX, useMemo, useState } from 'react'
import { ToolShell, TextArea, StatRow, Note } from './toolkit'

type Op = { kind: 'same' | 'del' | 'add'; text: string }

function diffLines(a: string[], b: string[]): Op[] {
  const n = a.length
  const m = b.length
  // LCS length table
  const lcs: number[][] = []
  for (let i = 0; i <= n; i++) lcs.push(new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (a[i] === b[j]) lcs[i][j] = lcs[i + 1][j + 1] + 1
      else lcs[i][j] = Math.max(lcs[i + 1][j], lcs[i][j + 1])
    }
  }
  const ops: Op[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ kind: 'same', text: a[i] })
      i++
      j++
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      ops.push({ kind: 'del', text: a[i] })
      i++
    } else {
      ops.push({ kind: 'add', text: b[j] })
      j++
    }
  }
  while (i < n) {
    ops.push({ kind: 'del', text: a[i] })
    i++
  }
  while (j < m) {
    ops.push({ kind: 'add', text: b[j] })
    j++
  }
  return ops
}

const DIFF_INFO = (
  <>
    <h4>Wat doet deze tool?</h4>
    <p>
      Vergelijkt twee teksten regel voor regel en toont welke regels zijn toegevoegd, verwijderd of
      gelijk gebleven. Toegevoegde regels krijgen een <code>+</code>, verwijderde een{' '}
      <code>−</code>.
    </p>
    <h4>Opties</h4>
    <ul>
      <li>
        <b>Origineel</b> — de oorspronkelijke tekst waarmee je vergelijkt.
      </li>
      <li>
        <b>Gewijzigd</b> — de nieuwe tekst; verschillen ten opzichte van het origineel worden
        gemarkeerd.
      </li>
    </ul>
  </>
)

function TextDiff(): JSX.Element {
  const [a, setA] = useState('')
  const [b, setB] = useState('')

  const ops = useMemo(() => {
    if (!a && !b) return []
    return diffLines(a.split(/\r?\n/), b.split(/\r?\n/))
  }, [a, b])

  const counts = useMemo(() => {
    let add = 0
    let del = 0
    let same = 0
    for (const op of ops) {
      if (op.kind === 'add') add++
      else if (op.kind === 'del') del++
      else same++
    }
    return { add, del, same }
  }, [ops])

  return (
    <ToolShell
      title="Tekst-diff"
      subtitle="Vergelijk twee teksten regel voor regel."
      info={DIFF_INFO}
    >
      <div className="panel tool-panel">
        <div className="tk-two">
          <TextArea label="Origineel" value={a} onChange={setA} rows={10} mono={false} />
          <TextArea label="Gewijzigd" value={b} onChange={setB} rows={10} mono={false} />
        </div>

        {!a && !b ? (
          <Note>Voer in beide velden tekst in om de verschillen te zien.</Note>
        ) : (
          <>
            <StatRow
              stats={[
                { label: 'toegevoegd', value: counts.add },
                { label: 'verwijderd', value: counts.del },
                { label: 'gelijk', value: counts.same }
              ]}
            />
            <div className="tk-diff">
              {ops.map((op, idx) => (
                <div
                  key={idx}
                  className={
                    'tk-diff-line' +
                    (op.kind === 'add' ? ' diff-add' : op.kind === 'del' ? ' diff-del' : '')
                  }
                >
                  <span className="tk-diff-gutter">
                    {op.kind === 'add' ? '+' : op.kind === 'del' ? '−' : ' '}
                  </span>
                  {op.text}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </ToolShell>
  )
}

export default TextDiff
