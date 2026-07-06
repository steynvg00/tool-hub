import { JSX, useState } from 'react'
import { processToFile, type FileResult } from '../lib/api'
import { useFileResult } from '../lib/useFileResult'
import { runBulk } from '../lib/bulk'
import { MultiFileButton, ResultDownload } from './ToolFields'
import { ToolHeader, Note } from './toolkit'

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
  const [imgFiles, setImgFiles] = useState<File[]>([])
  const [fmt, setFmt] = useState('png')

  // images -> pdf
  const [files, setFiles] = useState<File[]>([])

  const [result, setResult] = useFileResult()
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reset = (): void => {
    setResult(null)
    setError(null)
  }

  const runConvert = async (): Promise<void> => {
    if (imgFiles.length === 0) return
    setBusy(true)
    reset()
    setProgress(null)
    const outName = (f: File): string => `${f.name.replace(/\.[^.]+$/, '')}.${fmt}`
    try {
      const processOne = async (f: File): Promise<FileResult> => {
        const form = new FormData()
        form.append('image', f)
        form.append('fmt', fmt)
        form.append('quality', String(LOSSY_QUALITY))
        const r = await processToFile('/image/convert', form, outName(f))
        return { ...r, filename: outName(f) }
      }
      setResult(await runBulk(imgFiles, processOne, (done, total) => setProgress({ done, total })))
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
            <MultiFileButton
              label="Afbeelding(en)"
              accept="image/*"
              files={imgFiles}
              onPick={(f) => {
                setImgFiles(f)
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
            <button className="btn btn-primary" disabled={imgFiles.length === 0 || busy} onClick={runConvert}>
              {busy
                ? progress && progress.total > 1
                  ? `Bezig… ${progress.done}/${progress.total}`
                  : 'Bezig…'
                : imgFiles.length > 1
                  ? `Zet ${imgFiles.length} afbeeldingen om`
                  : 'Omzetten'}
            </button>
            {imgFiles.length > 1 && <Note>Meerdere bestanden worden als één zip geleverd.</Note>}
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
