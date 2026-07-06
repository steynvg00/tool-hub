import { JSX, useState } from 'react'
import { processToFile } from '../lib/api'
import { useFileResult } from '../lib/useFileResult'
import { FileButton, ResultDownload } from './ToolFields'
import { ToolShell, TextInput, ErrorBanner, Note } from './toolkit'

function AudioFade(): JSX.Element {
  const [file, setFile] = useState<File | null>(null)
  const [fadeIn, setFadeIn] = useState('2')
  const [fadeOut, setFadeOut] = useState('2')
  const [result, setResult] = useFileResult()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = (): void => {
    setResult(null)
    setError(null)
  }

  const run = async (): Promise<void> => {
    if (!file) return
    const fi = Number(fadeIn) || 0
    const fo = Number(fadeOut) || 0
    if (fi <= 0 && fo <= 0) {
      setError('Stel een fade-in of fade-out in (in seconden).')
      return
    }
    setBusy(true)
    reset()
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('fade_in', String(fi))
      form.append('fade_out', String(fo))
      setResult(await processToFile('/audio/fade', form, 'faded'))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <ToolShell
      title="Fades toevoegen"
      subtitle="Laat een fragment geleidelijk in- en uitfaden aan het begin en einde."
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
        <div className="tk-row">
          <TextInput label="Fade-in (seconden)" value={fadeIn} onChange={setFadeIn} mono />
          <TextInput label="Fade-out (seconden)" value={fadeOut} onChange={setFadeOut} mono />
        </div>
        <ErrorBanner message={error} />
        <button className="btn btn-primary" disabled={!file || busy} onClick={run}>
          {busy ? 'Bezig…' : 'Fades toepassen'}
        </button>
        {result && <ResultDownload result={result} />}
        <Note>Zet een waarde op 0 om die fade over te slaan.</Note>
      </div>
    </ToolShell>
  )
}

export default AudioFade
