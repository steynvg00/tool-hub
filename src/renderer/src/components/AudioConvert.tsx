import { JSX, useState } from 'react'
import { processToFile, formatBytes } from '../lib/api'
import { useFileResult } from '../lib/useFileResult'
import { FileButton, ResultDownload } from './ToolFields'
import { ToolShell, StatRow, ErrorBanner, Note } from './toolkit'

const FORMATS = ['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg']
const LOSSY = new Set(['mp3', 'm4a', 'aac', 'ogg'])

const AUDIO_CONVERT_INFO = (
  <>
    <h4>Wat doet deze tool?</h4>
    <p>
      Zet een audiobestand om naar een ander formaat. Na afloop zie je de grootte voor en na de
      conversie en het procentuele verschil.
    </p>
    <h4>Opties</h4>
    <ul>
      <li>
        <b>Doelformaat</b> — het uitvoerformaat. <code>wav</code> en <code>flac</code> zijn
        verliesvrij (lossless): ze bewaren de volledige kwaliteit maar zijn groter.{' '}
        <code>mp3</code>, <code>m4a</code>, <code>aac</code> en <code>ogg</code> zijn lossy: ze
        comprimeren door detail weg te laten, wat kleinere bestanden geeft.
      </li>
      <li>
        <b>Bitrate (kbps)</b> — alleen bij lossy formaten. Meer kbps betekent hogere kwaliteit en
        een groter bestand. <code>192</code> is een goede middenweg; <code>320</code> is de hoogste
        kwaliteit.
      </li>
    </ul>
  </>
)

function AudioConvert(): JSX.Element {
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
      if (LOSSY.has(format) && bitrate.trim()) form.append('bitrate', String(Number(bitrate)))
      setResult(await processToFile('/audio/convert', form, `converted.${format}`))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <ToolShell
      title="Audio converteren"
      subtitle="Zet een audiobestand om naar een ander formaat, met instelbare bitrate."
      info={AUDIO_CONVERT_INFO}
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
          {busy ? 'Bezig…' : 'Converteren'}
        </button>
        {result && (
          <>
            <StatRow
              stats={[
                { label: 'Voor', value: file ? formatBytes(file.size) : '—' },
                { label: 'Na', value: formatBytes(result.size) },
                {
                  label: 'Verschil',
                  value:
                    file && file.size > 0
                      ? `${result.size <= file.size ? '−' : '+'}${Math.abs(
                          Math.round((1 - result.size / file.size) * 100)
                        )}%`
                      : '—'
                }
              ]}
            />
            <ResultDownload result={result} />
          </>
        )}
        <Note>WAV en FLAC zijn verliesvrij; MP3/M4A/AAC/OGG comprimeren met de gekozen bitrate.</Note>
      </div>
    </ToolShell>
  )
}

export default AudioConvert
