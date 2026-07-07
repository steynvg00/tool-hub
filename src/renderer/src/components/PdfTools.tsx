import { JSX, useEffect, useRef, useState } from 'react'
import { processToFile } from '../lib/api'
import { useFileResult } from '../lib/useFileResult'
import { FileButton, MultiFileButton, ResultDownload } from './ToolFields'
import { ToolHeader } from './toolkit'
import { pdfjsLib, type PDFDocumentProxy } from '../lib/pdf'

type Action = 'merge' | 'split' | 'rotate' | 'compress'

/** One lazily-rendered page canvas; renders when it scrolls into view. */
function PdfPage({
  doc,
  num,
  active,
  onSelect
}: {
  doc: PDFDocumentProxy
  num: number
  active: boolean
  onSelect: (n: number) => void
}): JSX.Element {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    let cancelled = false
    let rendered = false
    const io = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting || rendered) return
      rendered = true
      io.disconnect()
      doc.getPage(num).then((page) => {
        if (cancelled) return
        const base = page.getViewport({ scale: 1 })
        const viewport = page.getViewport({ scale: 200 / base.width })
        const canvas = canvasRef.current
        if (!canvas) return
        canvas.width = viewport.width
        canvas.height = viewport.height
        page.render({ canvas, viewport }).promise.catch(() => {})
      })
    })
    io.observe(wrap)
    return () => {
      cancelled = true
      io.disconnect()
    }
  }, [doc, num])

  return (
    <div
      ref={wrapRef}
      className={active ? 'pdf-page active' : 'pdf-page'}
      onClick={() => onSelect(num)}
      title={`Pagina ${num} — klik om te selecteren`}
    >
      <canvas ref={canvasRef} />
      <span className="pdf-page-num">{num}</span>
    </div>
  )
}

/** Scrollable page preview for a single PDF, with click-to-select active page. */
function PdfPreview({
  file,
  active,
  onSelect,
  onCount
}: {
  file: File
  active: number
  onSelect: (n: number) => void
  onCount: (n: number) => void
}): JSX.Element {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let task: ReturnType<typeof pdfjsLib.getDocument> | null = null
    setDoc(null)
    setError(null)
    file
      .arrayBuffer()
      .then((buf) => {
        if (cancelled) return
        task = pdfjsLib.getDocument({ data: new Uint8Array(buf) })
        return task.promise.then((d) => {
          if (cancelled) return
          setDoc(d)
          onCount(d.numPages)
        })
      })
      .catch(() => {
        if (!cancelled) setError('Kon de PDF niet weergeven.')
      })
    return () => {
      cancelled = true
      // Destroying the loading task also tears down its document + worker port.
      task?.destroy()
    }
    // onCount is stable enough; re-run only when the file changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file])

  if (error) return <p className="hint">{error}</p>
  if (!doc) return <p className="hint">Preview laden…</p>

  return (
    <div className="pdf-preview">
      {Array.from({ length: doc.numPages }, (_, i) => (
        <PdfPage key={i + 1} doc={doc} num={i + 1} active={active === i + 1} onSelect={onSelect} />
      ))}
    </div>
  )
}

const PDF_TOOLS_INFO = (
  <>
    <h4>Wat doet deze tool?</h4>
    <p>
      Bewerkt PDF-bestanden op vier manieren. Kies eerst een actie; de bijbehorende opties
      verschijnen daaronder.
    </p>
    <h4>Acties</h4>
    <ul>
      <li>
        <b>Samenvoegen</b> &mdash; voegt meerdere PDF&apos;s samen tot één bestand, in de volgorde
        waarin je ze kiest.
      </li>
      <li>
        <b>Splitsen</b> &mdash; haalt pagina&apos;s uit een PDF. Met <b>Pagina&apos;s kiezen</b>
        geef je een bereik op (bijv. <code>1-3,5</code>) dat in één nieuwe PDF komt; met{' '}
        <b>Elke pagina (zip)</b> wordt <i>elke</i> pagina een apart PDF-bestand, samen ingepakt in
        één zip. Die zip is vooral handig wanneer het resultaat uit meerdere losse bestanden
        bestaat; wil je juist één paar pagina&apos;s als één document, gebruik dan Pagina&apos;s
        kiezen.
      </li>
      <li>
        <b>Preview &amp; actieve pagina</b> &mdash; bij één PDF verschijnt een scrollbare
        paginapreview. Klik een pagina om die als <b>actieve pagina</b> te kiezen; die kun je in één
        klik <b>draaien</b> of als los bestand <b>extraheren</b>.
      </li>
      <li>
        <b>Draaien</b> &mdash; draait pagina&apos;s met <b>Graden</b> (90° rechtsom, 180° of 270°).
        Vul bij <b>Pagina&apos;s</b> een bereik in of laat het leeg om alle pagina&apos;s te
        draaien.
      </li>
      <li>
        <b>Comprimeren</b> &mdash; verkleint het bestand. Met <b>Beeldkwaliteit</b> (1&ndash;100)
        bepaal je de kwaliteit van de afbeeldingen; lager geeft een kleiner bestand.
      </li>
    </ul>
  </>
)

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

  const [activePage, setActivePage] = useState(1)
  const [pageCount, setPageCount] = useState(0)

  const [result, setResult] = useFileResult()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = (): void => {
    setResult(null)
    setError(null)
  }

  const pickSingle = (f: File | null): void => {
    setFile(f)
    setActivePage(1)
    setPageCount(0)
    reset()
  }

  // Quick action on the active page: rotate it or extract it as its own PDF.
  const runOnActivePage = async (
    path: string,
    extra: Record<string, string>,
    fallback: string
  ): Promise<void> => {
    if (!file) return
    setBusy(true)
    reset()
    try {
      const form = new FormData()
      form.append('file', file)
      for (const [k, v] of Object.entries(extra)) form.append(k, v)
      setResult(await processToFile(path, form, fallback))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const rotateActivePage = (): Promise<void> =>
    runOnActivePage(
      '/pdf/rotate',
      { degrees: String(degrees), pages: String(activePage) },
      `pagina-${activePage}-gedraaid.pdf`
    )
  const extractActivePage = (): Promise<void> =>
    runOnActivePage(
      '/pdf/split',
      { mode: 'range', pages: String(activePage) },
      `pagina-${activePage}.pdf`
    )

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
      <ToolHeader
        title="PDF-gereedschap"
        subtitle="Voeg samen, splits, draai of comprimeer PDF-bestanden."
        info={PDF_TOOLS_INFO}
      />

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
          <FileButton label="PDF" accept="application/pdf" file={file} onPick={pickSingle} />
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

      {action !== 'merge' && file && (
        <div className="panel tool-panel">
          <div className="panel-title-row">
            <h2>Preview</h2>
            <span className="hint">
              {pageCount ? `Pagina ${activePage} van ${pageCount}` : ''}
            </span>
          </div>
          <div className="pdf-active-actions">
            <select value={degrees} onChange={(e) => setDegrees(+e.target.value)}>
              <option value={90}>90° rechtsom</option>
              <option value={180}>180°</option>
              <option value={270}>270° (90° linksom)</option>
            </select>
            <button className="btn" disabled={busy} onClick={rotateActivePage}>
              Draai pagina {activePage}
            </button>
            <button className="btn" disabled={busy} onClick={extractActivePage}>
              Extraheer pagina {activePage}
            </button>
          </div>
          <PdfPreview
            file={file}
            active={activePage}
            onSelect={setActivePage}
            onCount={setPageCount}
          />
        </div>
      )}
    </div>
  )
}

export default PdfTools
