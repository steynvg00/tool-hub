import { JSX, useState } from 'react'
import { processToFile } from '../lib/api'
import { useFileResult } from '../lib/useFileResult'
import { FileButton, MultiFileButton, ResultDownload } from './ToolFields'

type Action = 'merge' | 'split' | 'rotate' | 'compress'

const ACTIONS: { id: Action; label: string }[] = [
  { id: 'merge', label: 'Samenvoegen' },
  { id: 'split', label: 'Splitsen' },
  { id: 'rotate', label: 'Draaien' },
  { id: 'compress', label: 'Comprimeren' }
]

function PdfTools(): JSX.Element {
  const [action, setAction] = useState<Action>('merge')

  const [files, setFiles] = useState<File[]>([]) // merge
  const [file, setFile] = useState<File | null>(null) // split/rotate/compress

  const [splitMode, setSplitMode] = useState<'range' | 'each'>('range')
  const [pages, setPages] = useState('1-3,5')
  const [degrees, setDegrees] = useState(90)
  const [rotatePages, setRotatePages] = useState('')
  const [imageQuality, setImageQuality] = useState(60)

  const [result, setResult] = useFileResult()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = (): void => {
    setResult(null)
    setError(null)
  }

  const switchAction = (a: Action): void => {
    setAction(a)
    reset()
  }

  const run = async (): Promise<void> => {
    setBusy(true)
    reset()
    try {
      const form = new FormData()
      let path: string
      let fallback: string

      if (action === 'merge') {
        if (files.length === 0) throw new Error('Kies minstens één PDF.')
        for (const f of files) form.append('files', f)
        path = '/pdf/merge'
        fallback = 'merged.pdf'
      } else {
        if (!file) throw new Error('Kies een PDF.')
        form.append('file', file)
        if (action === 'split') {
          form.append('mode', splitMode)
          if (splitMode === 'range') form.append('pages', pages)
          path = '/pdf/split'
          fallback = splitMode === 'each' ? 'pages.zip' : 'extracted.pdf'
        } else if (action === 'rotate') {
          form.append('degrees', String(degrees))
          if (rotatePages.trim()) form.append('pages', rotatePages.trim())
          path = '/pdf/rotate'
          fallback = 'rotated.pdf'
        } else {
          form.append('image_quality', String(imageQuality))
          path = '/pdf/compress'
          fallback = 'compressed.pdf'
        }
      }

      setResult(await processToFile(path, form, fallback))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const canRun = !busy && (action === 'merge' ? files.length > 0 : !!file)

  return (
    <div className="tool">
      <header className="tool-header">
        <h1>PDF-gereedschap</h1>
        <p>Voeg samen, splits, draai of comprimeer PDF-bestanden.</p>
      </header>

      <div className="panel tool-panel">
        <div className="tool-field">
          <label className="tool-label">Actie</label>
          <div className="tool-seg">
            {ACTIONS.map((a) => (
              <button key={a.id} className={action === a.id ? 'on' : ''} onClick={() => switchAction(a.id)}>
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {action === 'merge' ? (
          <MultiFileButton
            label="PDF's (in volgorde)"
            accept="application/pdf"
            files={files}
            onPick={(f) => {
              setFiles(f)
              reset()
            }}
          />
        ) : (
          <FileButton
            label="PDF"
            accept="application/pdf"
            file={file}
            onPick={(f) => {
              setFile(f)
              reset()
            }}
          />
        )}

        {action === 'split' && (
          <>
            <div className="tool-field">
              <label className="tool-label">Modus</label>
              <div className="tool-seg">
                <button
                  className={splitMode === 'range' ? 'on' : ''}
                  onClick={() => setSplitMode('range')}
                >
                  Pagina's kiezen
                </button>
                <button
                  className={splitMode === 'each' ? 'on' : ''}
                  onClick={() => setSplitMode('each')}
                >
                  Elke pagina (zip)
                </button>
              </div>
            </div>
            {splitMode === 'range' && (
              <label className="tool-field">
                <span className="tool-label">Pagina's (bijv. 1-3,5)</span>
                <input type="text" value={pages} onChange={(e) => setPages(e.target.value)} />
              </label>
            )}
          </>
        )}

        {action === 'rotate' && (
          <>
            <label className="tool-field">
              <span className="tool-label">Graden</span>
              <select value={degrees} onChange={(e) => setDegrees(+e.target.value)}>
                <option value={90}>90° rechtsom</option>
                <option value={180}>180°</option>
                <option value={270}>270° (90° linksom)</option>
              </select>
            </label>
            <label className="tool-field">
              <span className="tool-label">Pagina's (leeg = alle)</span>
              <input
                type="text"
                placeholder="bijv. 1-3,5"
                value={rotatePages}
                onChange={(e) => setRotatePages(e.target.value)}
              />
            </label>
          </>
        )}

        {action === 'compress' && (
          <div className="tool-field">
            <label className="tool-label">Beeldkwaliteit: {imageQuality}</label>
            <input
              type="range"
              min={1}
              max={100}
              value={imageQuality}
              onChange={(e) => setImageQuality(+e.target.value)}
            />
          </div>
        )}

        <button className="btn btn-primary" disabled={!canRun} onClick={run}>
          {busy ? 'Bezig…' : 'Uitvoeren'}
        </button>

        {error && <div className="banner banner-error">{error}</div>}
        {result && <ResultDownload result={result} />}
      </div>
    </div>
  )
}

export default PdfTools
