import { JSX, useState } from 'react'
import { processToFile } from '../lib/api'
import { useFileResult } from '../lib/useFileResult'
import { FileButton, MultiFileButton, ResultDownload } from './ToolFields'

type Sub = 'image' | 'pdf'

function ImageConvert(): JSX.Element {
  const [sub, setSub] = useState<Sub>('image')

  // image -> image
  const [file, setFile] = useState<File | null>(null)
  const [fmt, setFmt] = useState('png')
  const [quality, setQuality] = useState(85)

  // images -> pdf
  const [files, setFiles] = useState<File[]>([])

  const [result, setResult] = useFileResult()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = (): void => {
    setResult(null)
    setError(null)
  }

  const runConvert = async (): Promise<void> => {
    if (!file) return
    setBusy(true)
    reset()
    try {
      const form = new FormData()
      form.append('image', file)
      form.append('fmt', fmt)
      form.append('quality', String(quality))
      setResult(await processToFile('/image/convert', form, `converted.${fmt}`))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const runToPdf = async (): Promise<void> => {
    if (files.length === 0) return
    setBusy(true)
    reset()
    try {
      const form = new FormData()
      for (const f of files) form.append('images', f)
      setResult(await processToFile('/image/to-pdf', form, 'images.pdf'))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="tool">
      <header className="tool-header">
        <h1>Formaat omzetten</h1>
        <p>Zet een afbeelding om naar een ander formaat, of bundel afbeeldingen tot één PDF.</p>
      </header>

      <div className="panel tool-panel">
        <div className="tool-field">
          <label className="tool-label">Doel</label>
          <div className="tool-seg">
            <button
              className={sub === 'image' ? 'on' : ''}
              onClick={() => {
                setSub('image')
                reset()
              }}
            >
              Afbeeldingsformaat
            </button>
            <button
              className={sub === 'pdf' ? 'on' : ''}
              onClick={() => {
                setSub('pdf')
                reset()
              }}
            >
              Naar PDF
            </button>
          </div>
        </div>

        {sub === 'image' ? (
          <>
            <FileButton
              label="Afbeelding"
              accept="image/*"
              file={file}
              onPick={(f) => {
                setFile(f)
                reset()
              }}
            />
            <label className="tool-field">
              <span className="tool-label">Doelformaat</span>
              <select value={fmt} onChange={(e) => setFmt(e.target.value)}>
                <option value="png">PNG</option>
                <option value="jpeg">JPEG</option>
                <option value="webp">WEBP</option>
              </select>
            </label>
            <div className="tool-field">
              <label className="tool-label">Kwaliteit: {quality}</label>
              <input
                type="range"
                min={1}
                max={100}
                value={quality}
                onChange={(e) => setQuality(+e.target.value)}
              />
            </div>
            <button className="btn btn-primary" disabled={!file || busy} onClick={runConvert}>
              {busy ? 'Bezig…' : 'Omzetten'}
            </button>
          </>
        ) : (
          <>
            <MultiFileButton
              label="Afbeeldingen (in volgorde)"
              accept="image/*"
              files={files}
              onPick={(f) => {
                setFiles(f)
                reset()
              }}
            />
            <button
              className="btn btn-primary"
              disabled={files.length === 0 || busy}
              onClick={runToPdf}
            >
              {busy ? 'Bezig…' : 'PDF maken'}
            </button>
          </>
        )}

        {error && <div className="banner banner-error">{error}</div>}
        {result && <ResultDownload result={result} />}
      </div>
    </div>
  )
}

export default ImageConvert
