import { JSX, useState } from 'react'
import { ToolShell, TextArea, Segmented, OutputArea, ErrorBanner } from './toolkit'

type Indent = '2' | '4' | 'tab'

function JsonTool(): JSX.Element {
  const [input, setInput] = useState('')
  const [indent, setIndent] = useState<Indent>('2')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [valid, setValid] = useState(false)

  const parse = (): unknown => JSON.parse(input)

  const handleError = (e: unknown): void => {
    const err = e as Error
    let msg = `Ongeldige JSON: ${err.message}`
    const m = err.message.match(/position (\d+)/)
    if (m) {
      const n = Number(m[1])
      const line = (input.substring(0, n).match(/\n/g) || []).length + 1
      const col = n - input.lastIndexOf('\n', n - 1)
      msg += ` (regel ${line}, kolom ${col})`
    }
    setError(msg)
    setOutput('')
    setValid(false)
  }

  const format = (): void => {
    try {
      const ind: number | string = indent === 'tab' ? '\t' : Number(indent)
      setOutput(JSON.stringify(parse(), null, ind))
      setError('')
      setValid(false)
    } catch (e) {
      handleError(e)
    }
  }

  const minify = (): void => {
    try {
      setOutput(JSON.stringify(parse()))
      setError('')
      setValid(false)
    } catch (e) {
      handleError(e)
    }
  }

  const validate = (): void => {
    try {
      parse()
      setError('')
      setValid(true)
    } catch (e) {
      handleError(e)
    }
  }

  return (
    <ToolShell title="JSON-gereedschap" subtitle="Opmaken, minificeren en valideren van JSON.">
      <div className="tk-two">
        <div className="panel">
          <TextArea label="JSON" value={input} onChange={setInput} rows={14} />

          <div className="tool-field">
            <span className="tool-label">Inspringing</span>
            <Segmented<Indent>
              options={[
                { value: '2', label: '2' },
                { value: '4', label: '4' },
                { value: 'tab', label: 'tab' }
              ]}
              value={indent}
              onChange={setIndent}
            />
          </div>

          <div className="tk-actions">
            <button className="btn" onClick={format}>
              Opmaken
            </button>
            <button className="btn" onClick={minify}>
              Minify
            </button>
            <button className="btn" onClick={validate}>
              Valideren
            </button>
          </div>

          <ErrorBanner message={error} />
          {valid && <p style={{ color: '#3ecf8e' }}>Geldige JSON</p>}
        </div>

        <div className="panel">
          <OutputArea label="Resultaat" value={output} rows={14} />
        </div>
      </div>
    </ToolShell>
  )
}

export default JsonTool
