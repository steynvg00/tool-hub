import { JSX, useEffect, useRef, useState } from 'react'
import { formatBytes } from '../lib/api'
import { FILE_DRAG_MIME } from '../lib/collectedFiles'

type CollectedFile = Awaited<ReturnType<typeof window.api.files.list>>[number]

function iconFor(type: string): string {
  if (type.startsWith('image/')) return '🖼️'
  if (type.startsWith('audio/')) return '🎵'
  if (type.startsWith('video/')) return '🎬'
  if (type === 'application/pdf') return '📄'
  if (type === 'application/zip') return '🗜️'
  if (type.startsWith('text/') || type.includes('json') || type.includes('csv')) return '📃'
  return '📎'
}

/** Thumbnail for an image file (lazy-loaded bytes), or a type icon otherwise. */
function FileThumb({ file }: { file: CollectedFile }): JSX.Element {
  const isImage = file.type.startsWith('image/')
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!isImage) return
    let revoked = false
    let objectUrl: string | null = null
    window.api.files
      .read(file.id)
      .then((res) => {
        if (!res || revoked) return
        const ab = new ArrayBuffer(res.data.length)
        new Uint8Array(ab).set(res.data)
        objectUrl = URL.createObjectURL(new Blob([ab], { type: res.type }))
        setUrl(objectUrl)
      })
      .catch(() => {})
    return () => {
      revoked = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [file.id, isImage])

  if (isImage && url) return <img className="fp-thumb" src={url} alt={file.name} />
  return <div className="fp-thumb fp-thumb-icon">{iconFor(file.type)}</div>
}

function FilesPanel(): JSX.Element {
  const [files, setFiles] = useState<CollectedFile[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dragDepth = useRef(0)

  useEffect(() => {
    window.api.files
      .list()
      .then(setFiles)
      .catch(() => setError('Kon bestanden niet laden.'))
  }, [])

  const add = async (): Promise<void> => {
    setBusy(true)
    setError(null)
    try {
      setFiles(await window.api.files.addViaDialog())
    } catch {
      setError('Toevoegen mislukt.')
    } finally {
      setBusy(false)
    }
  }

  const onDrop = async (e: React.DragEvent): Promise<void> => {
    e.preventDefault()
    dragDepth.current = 0
    setDragOver(false)
    const dropped = Array.from(e.dataTransfer.files)
    if (dropped.length === 0) return
    const paths = dropped.map((f) => window.api.files.getPathForFile(f)).filter(Boolean)
    if (paths.length === 0) return
    setBusy(true)
    setError(null)
    try {
      setFiles(await window.api.files.addPaths(paths))
    } catch {
      setError('Toevoegen mislukt.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: string): Promise<void> => {
    setFiles(await window.api.files.remove(id))
  }
  const togglePin = async (f: CollectedFile): Promise<void> => {
    setFiles(await window.api.files.setPinned(f.id, !f.pinned))
  }

  const onDragStartItem = (e: React.DragEvent, f: CollectedFile): void => {
    e.dataTransfer.setData(FILE_DRAG_MIME, f.id)
    e.dataTransfer.setData('text/plain', f.name)
    e.dataTransfer.effectAllowed = 'copy'
  }

  // Only react to OS file drags (they carry Files); ignore internal item drags.
  const hasOsFiles = (e: React.DragEvent): boolean =>
    Array.from(e.dataTransfer.types).includes('Files')

  return (
    <div
      className={dragOver ? 'files-panel drag-over' : 'files-panel'}
      onDragEnter={(e) => {
        if (!hasOsFiles(e)) return
        e.preventDefault()
        dragDepth.current += 1
        setDragOver(true)
      }}
      onDragOver={(e) => {
        if (hasOsFiles(e)) e.preventDefault()
      }}
      onDragLeave={(e) => {
        if (!hasOsFiles(e)) return
        dragDepth.current = Math.max(0, dragDepth.current - 1)
        if (dragDepth.current === 0) setDragOver(false)
      }}
      onDrop={onDrop}
    >
      <div className="fp-actions">
        <button className="btn btn-primary" onClick={add} disabled={busy}>
          {busy ? 'Bezig…' : '+ Bestanden toevoegen'}
        </button>
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      {files.length === 0 ? (
        <div className="fp-empty">
          <p>Nog geen bestanden.</p>
          <p className="tk-note">
            Kies bestanden of een map, of sleep ze hierheen. Sleep een bestand daarna op de upload van
            een tool om het te laden.
          </p>
        </div>
      ) : (
        <ul className="fp-list">
          {files.map((f) => (
            <li
              key={f.id}
              className="fp-item"
              draggable
              onDragStart={(e) => onDragStartItem(e, f)}
              title={`${f.name} — sleep naar een tool`}
            >
              <FileThumb file={f} />
              <div className="fp-meta">
                <span className="fp-name">{f.name}</span>
                <span className="fp-size">{formatBytes(f.size)}</span>
              </div>
              <button
                className={f.pinned ? 'fp-btn fp-pin on' : 'fp-btn fp-pin'}
                title={f.pinned ? 'Losmaken' : 'Vastpinnen'}
                onClick={() => togglePin(f)}
              >
                {f.pinned ? '📌' : '📍'}
              </button>
              <button className="fp-btn fp-del" title="Verwijderen" onClick={() => remove(f.id)}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {dragOver && <div className="fp-drop-hint">Laat los om toe te voegen</div>}
    </div>
  )
}

export default FilesPanel
