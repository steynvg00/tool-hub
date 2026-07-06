import { JSX, useState } from 'react'
import { processToFile, formatBytes, type FileResult } from '../lib/api'
import { useFileResult } from '../lib/useFileResult'
import { runBulk } from '../lib/bulk'
import { MultiFileButton, ResultDownload } from './ToolFields'
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
  const [files, setFiles] = useState<File[]>([])
  const [format, setFormat] = useState('mp3')
  const [bitrate, setBitrate] = useState('192')
  const [result, setResult] = useFileResult()
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reset = (): void => {
    setResult(null)
    setError(null)
  }

  const run = async (): Promise<void> => {
    if (files.length === 0) return
    setBusy(true)
    reset()
    setProgress(null)
    const outName = (f: File): string => `${f.name.replace(/\.[^.]+$/, '')}.${format}`
    try {
      const processOne = async (f: File): Promise<FileResult> => {
        const form = new FormData()
        form.append('file', f)
        form.append('format', format)
        if (LOSSY.has(format) && bitrate.trim()) form.append('bitrate', String(Number(bitrate)))
        const r = await processToFile('/audio/convert', form, outName(f))
        return { ...r, filename: outName(f) }
      }
      setResult(await runBulk(files, processOne, (done, total) => setProgress({ done, total })))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <ToolShell
      title="Audio converteren"
      subtitle="Zet audiobestanden om naar een ander formaat, met instelbare bitrate."
      info={AUDIO_CONVERT_INFO}
    >
      <div className="panel tool-panel">
        <MultiFileButton
          label="Audiobestand(en)"
          accept="audio/*"
          files={files}
          onPick={(fs) => {
            setFiles(fs)
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
        <button className="btn btn-primary" disabled={files.length === 0 || busy} onClick={run}>
          {busy
            ? progress && progress.total > 1
              ? `Bezig… ${progress.done}/${progress.total}`
              : 'Bezig…'
            : files.length > 1
              ? `Converteer ${files.length} bestanden`
              : 'Converteren'}
        </button>
        {result && (
          <>
            {files.length === 1 ? (
              <StatRow
                stats={[
                  { label: 'Voor', value: formatBytes(files[0].size) },
                  { label: 'Na', value: formatBytes(result.size) },
                  {
                    label: 'Verschil',
                    value:
                      files[0].size > 0
                        ? `${result.size <= files[0].size ? '−' : '+'}${Math.abs(
                            Math.round((1 - result.size / files[0].size) * 100)
                          )}%`
                        : '—'
                  }
                ]}
              />
            ) : (
              <Note>{files.length} bestanden geconverteerd en gebundeld in één zip.</Note>
            )}
            <ResultDownload result={result} />
          </>
        )}
        <Note>WAV en FLAC zijn verliesvrij; MP3/M4A/AAC/OGG comprimeren met de gekozen bitrate.</Note>
      </div>
    </ToolShell>
  )
}

export default AudioConvert
