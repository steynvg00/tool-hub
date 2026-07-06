import { JSX, useState } from 'react'
import { ToolShell, TextArea, OutputArea, Segmented, Toggle, ErrorBanner } from './toolkit'

type Dir = 'csv2json' | 'json2csv'

/** Robust CSV parser: handles quoted fields, escaped "" quotes and \r\n / \n. */
function parseCsv(input: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0
  const n = input.length
  while (i < n) {
    const c = input[i]
    if (inQuotes) {
      if (c === '"') {
        if (input[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      field += c
      i++
      continue
    }
    if (c === '"') {
      inQuotes = true
      i++
      continue
    }
    if (c === ',') {
      row.push(field)
      field = ''
      i++
      continue
    }
    if (c === '\r') {
      i++
      continue
    }
    if (c === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      i++
      continue
    }
    field += c
    i++
  }
  // flush trailing field/row (unless the input was completely empty)
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

function quoteCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function csvToJson(input: string, header: boolean): string {
  const rows = parseCsv(input)
  if (rows.length === 0) return '[]'
  if (!header) return JSON.stringify(rows, null, 2)
  const [head, ...body] = rows
  const objects = body.map((r) => {
    const obj: Record<string, string> = {}
    head.forEach((key, idx) => {
      obj[key] = r[idx] ?? ''
    })
    return obj
  })
  return JSON.stringify(objects, null, 2)
}

function cellToString(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

function jsonToCsv(input: string, header: boolean): string {
  let data: unknown
  try {
    data = JSON.parse(input)
  } catch {
    throw new Error('Ongeldige JSON — controleer de invoer.')
  }
  if (!Array.isArray(data)) {
    throw new Error('JSON moet een array zijn (van objecten of van arrays).')
  }
  if (data.length === 0) return ''

  // Array of arrays
  if (data.every((r) => Array.isArray(r))) {
    return (data as unknown[][])
      .map((r) => r.map((c) => quoteCell(cellToString(c))).join(','))
      .join('\r\n')
  }

  // Array of objects
  if (data.every((r) => r !== null && typeof r === 'object')) {
    const cols: string[] = []
    for (const obj of data as Record<string, unknown>[]) {
      for (const key of Object.keys(obj)) {
        if (!cols.includes(key)) cols.push(key)
      }
    }
    const lines: string[] = []
    if (header) lines.push(cols.map((c) => quoteCell(c)).join(','))
    for (const obj of data as Record<string, unknown>[]) {
      lines.push(cols.map((c) => quoteCell(cellToString(obj[c]))).join(','))
    }
    return lines.join('\r\n')
  }

  throw new Error('JSON-array moet enkel objecten of enkel arrays bevatten.')
}

const CSV_JSON_INFO = (
  <>
    <h4>Wat doet deze tool?</h4>
    <p>
      Zet CSV om naar JSON en omgekeerd. De CSV-parser gaat correct om met aanhalingstekens,
      escapes (<code>&quot;&quot;</code>) en regeleinden.
    </p>
    <h4>Opties</h4>
    <ul>
      <li>
        <b>Richting</b> — kies <code>CSV → JSON</code> of <code>JSON → CSV</code>.
      </li>
      <li>
        <b>Eerste rij is kop</b> — aan: de eerste CSV-rij bevat kolomnamen, zodat JSON een lijst van
        objecten wordt (en omgekeerd komt bij JSON → CSV een koprij boven de data). Uit: er wordt
        gewerkt met kale rijen, oftewel een lijst van arrays.
      </li>
    </ul>
    <p>
      Voor JSON → CSV moet de invoer een array zijn van uitsluitend objecten of uitsluitend arrays.
    </p>
  </>
)

function CsvJson(): JSX.Element {
  const [dir, setDir] = useState<Dir>('csv2json')
  const [header, setHeader] = useState(true)
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState<string | null>(null)

  const run = (): void => {
    setError(null)
    try {
      setOutput(dir === 'csv2json' ? csvToJson(input, header) : jsonToCsv(input, header))
    } catch (e) {
      setOutput('')
      setError((e as Error).message)
    }
  }

  return (
    <ToolShell
      title="CSV ↔ JSON"
      subtitle="Zet CSV om naar JSON en terug, met of zonder koprij."
      info={CSV_JSON_INFO}
    >
      <div className="panel">
        <div className="tool-field">
          <label className="tool-label">Richting</label>
          <Segmented
            options={[
              { value: 'csv2json', label: 'CSV → JSON' },
              { value: 'json2csv', label: 'JSON → CSV' }
            ]}
            value={dir}
            onChange={(v) => {
              setDir(v)
              setOutput('')
              setError(null)
            }}
          />
        </div>
        <Toggle label="Eerste rij is kop" checked={header} onChange={setHeader} />
        <TextArea
          label="Invoer"
          value={input}
          onChange={setInput}
          rows={10}
          placeholder={
            dir === 'csv2json' ? 'naam,leeftijd\nAnna,31' : '[{"naam":"Anna","leeftijd":31}]'
          }
        />
        <div className="tk-actions">
          <button className="btn btn-primary" onClick={run}>
            Omzetten
          </button>
        </div>
        <ErrorBanner message={error} />
      </div>
      <div className="panel">
        <OutputArea label="Resultaat" value={output} rows={10} />
      </div>
    </ToolShell>
  )
}

export default CsvJson
