import { JSX, useState } from 'react'
import { processToFile } from '../lib/api'
import { useFileResult } from '../lib/useFileResult'
import { FileButton, ResultDownload } from './ToolFields'
import { ToolShell, ErrorBanner, Note } from './toolkit'

function AudioNormalize(): JSX.Element {
  const [file, setFile] = useState<File | null>(null)
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
      setResult(await processToFile('/audio/normalize', form, 'normalized'))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <ToolShell
      title="Audio normaliseren"
      subtitle="Breng het volume naar een consistent, standaard luidheidsniveau."
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
        <ErrorBanner message={error} />
        <button className="btn btn-primary" disabled={!file || busy} onClick={run}>
          {busy ? 'Bezig…' : 'Normaliseren'}
        </button>
        {result && <ResultDownload result={result} />}
        <Note>
          Loudness-normalisatie (EBU R128) tilt of dempt het hele fragment naar een doelluidheid van
          −16 LUFS. Anders dan gewoon versterken houdt het rekening met hoe hard geluid <em>klinkt</em>,
          zodat verschillende bestanden even hard aanvoelen — ideaal voor een afspeellijst of podcast.
        </Note>
      </div>
    </ToolShell>
  )
}

export default AudioNormalize
