import { JSX, useState } from 'react'
import { processToFile } from '../lib/api'
import { useFileResult } from '../lib/useFileResult'
import { FileButton, ResultDownload } from './ToolFields'
import { ToolShell, ErrorBanner, Note } from './toolkit'

function AudioVolume(): JSX.Element {
  const [file, setFile] = useState<File | null>(null)
  const [db, setDb] = useState(0)
  const [result, setResult] = useFileResult()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = (): void => {
    setResult(null)
    setError(null)
  }

  const run = async (): Promise<void> => {
    if (!file) return
    setBusy(true)
    reset()
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('db', String(db))
      setResult(await processToFile('/audio/volume', form, 'volume'))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <ToolShell
      title="Volume aanpassen"
      subtitle="Maak een audiobestand luider of zachter met een instelbare versterking in decibel."
    >
      <div className="panel tool-panel">
        <FileButton
          label="Audiobestand"
          accept="audio/*"
          file={file}
          onPick={(f) => {
            setFile(f)
            reset()
          }}
        />
        <div className="tool-field">
          <label className="tool-label">
            Versterking: {db > 0 ? '+' : ''}
            {db} dB
          </label>
          <input
            type="range"
            min={-30}
            max={30}
            step={1}
            value={db}
            onChange={(e) => setDb(Number(e.target.value))}
          />
        </div>
        <ErrorBanner message={error} />
        <button className="btn btn-primary" disabled={!file || busy} onClick={run}>
          {busy ? 'Bezig…' : 'Volume aanpassen'}
        </button>
        {result && <ResultDownload result={result} />}
        <Note>
          +6 dB verdubbelt ongeveer de luidheid, −6 dB halveert die. Let op: te veel versterking kan
          vervorming (clipping) geven.
        </Note>
      </div>
    </ToolShell>
  )
}

export default AudioVolume
