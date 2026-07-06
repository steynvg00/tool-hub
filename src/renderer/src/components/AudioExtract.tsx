import { JSX, useState } from 'react'
import { processToFile } from '../lib/api'
import { useFileResult } from '../lib/useFileResult'
import { FileButton, ResultDownload } from './ToolFields'
import { ToolShell, ErrorBanner, Note } from './toolkit'

const FORMATS = ['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg']
const LOSSY = new Set(['mp3', 'm4a', 'aac', 'ogg'])

function AudioExtract(): JSX.Element {
  const [file, setFile] = useState<File | null>(null)
  const [format, setFormat] = useState('mp3')
  const [bitrate, setBitrate] = useState('192')
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
      form.append('format', format)
      form.append('bitrate', String(Number(bitrate) || 192))
      setResult(await processToFile('/audio/extract', form, `audio.${format}`))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <ToolShell
      title="Audio uit video"
      subtitle="Haal de audiotrack uit een videobestand en sla die op als los audiobestand."
    >
      <div className="panel tool-panel">
        <FileButton
          label="Videobestand"
          accept="video/*"
          file={file}
          onPick={(f) => {
            setFile(f)
            reset()
          }}
        />
        <div className="tk-row">
          <label className="tool-field">
            <span className="tool-label">Doelformaat</span>
            <select value={format} onChange={(e) => setFormat(e.target.value)}>
              {FORMATS.map((f) => (
                <option key={f} value={f}>
                  {f.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          {LOSSY.has(format) && (
            <label className="tool-field">
              <span className="tool-label">Bitrate (kbps)</span>
              <select value={bitrate} onChange={(e) => setBitrate(e.target.value)}>
                {['96', '128', '192', '256', '320'].map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <ErrorBanner message={error} />
        <button className="btn btn-primary" disabled={!file || busy} onClick={run}>
          {busy ? 'Bezig…' : 'Audio eruit halen'}
        </button>
        {result && <ResultDownload result={result} />}
        <Note>Werkt met MP4, MOV, MKV, WEBM en meer — alleen de audiotrack wordt geëxporteerd.</Note>
      </div>
    </ToolShell>
  )
}

export default AudioExtract
