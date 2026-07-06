import { JSX, useState } from 'react'
import { processToFile } from '../lib/api'
import { useFileResult } from '../lib/useFileResult'
import { FileButton, MultiFileButton, ResultDownload } from './ToolFields'
import { ToolHeader } from './toolkit'

type Sub = 'image' | 'pdf'

// Lossy formats always encode at a high fixed quality — high enough that any
// further increase is visually indistinguishable but noticeably larger.
const LOSSY_QUALITY = 92

const CONVERT_INFO = (
  <>
    <h4>Wat doet deze tool?</h4>
    <p>
      Zet een afbeelding om naar een ander bestandsformaat (PNG, JPEG of WEBP), of bundelt meerdere
      afbeeldingen tot één PDF.
    </p>
    <h4>Opties</h4>
    <ul>
      <li>
        <b>Doelformaat</b> — <code>PNG</code> is verliesvrij (lossless): perfect voor schermafbeeldingen,
        logo&apos;s en transparantie, maar grotere bestanden. <code>JPEG</code> en <code>WEBP</code> zijn
        lossy: kleiner, ideaal voor foto&apos;s.
      </li>
      <li>
        <b>Kwaliteit</b> — die stel je niet meer in: de tool gebruikt automatisch een hoge vaste
        kwaliteit ({LOSSY_QUALITY}) voor JPEG/WEBP, waarboven je vrijwel geen zichtbare winst meer
        haalt maar het bestand wél groeit. Bij PNG speelt kwaliteit geen rol — dat formaat is per
        definitie verliesvrij.
      </li>
    </ul>
  </>
)

function ImageConvert(): JSX.Element {
  const [sub, setSub] = useState<Sub>('image')

  // image -> image
  const [file, setFile] = useState<File | null>(null)
  const [fmt, setFmt] = useState('png')

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
      form.append('quality', String(LOSSY_QUALITY))
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
      <ToolHeader
        title="Formaat omzetten"
        subtitle="Zet een afbeelding om naar een ander formaat, of bundel afbeeldingen tot één PDF."
        info={CONVERT_INFO}
      />

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
                <option value="png">PNG (verliesvrij)</option>
                <option value="jpeg">JPEG (kleiner)</option>
                <option value="webp">WEBP (kleiner)</option>
              </select>
            </label>
            {fmt !== 'png' && (
              <p className="tk-note">Wordt opgeslagen op hoge vaste kwaliteit ({LOSSY_QUALITY}).</p>
            )}
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
