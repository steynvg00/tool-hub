import { JSX, useEffect, useRef, useState } from 'react'
import { FILE_DRAG_MIME } from '../lib/collectedFiles'

type DirEntry = Awaited<ReturnType<typeof window.api.browser.list>>['entries'][number]
type Shortcut = Awaited<ReturnType<typeof window.api.browser.shortcuts>>[number]

function iconFor(type: string): string {
  if (type.startsWith('image/')) return '🖼️'
  if (type.startsWith('audio/')) return '🎵'
  if (type.startsWith('video/')) return '🎬'
  if (type === 'application/pdf') return '📄'
  if (type === 'application/zip') return '🗜️'
  if (type.startsWith('text/') || type.includes('json') || type.includes('csv')) return '📃'
  return '📎'
}

const basename = (p: string): string => p.split(/[\\/]/).pop() || p

/** A file row: draggable onto a tool, with a lazy thumbnail for images. */
function FileNode({ entry, depth }: { entry: DirEntry; depth: number }): JSX.Element {
  const isImage = entry.type.startsWith('image/')
  const [thumb, setThumb] = useState<string | null>(null)
  const rowRef = useRef<HTMLDivElement>(null)

  // Only fetch a thumbnail once the row scrolls into view — keeps big folders fast.
  useEffect(() => {
    if (!isImage || !rowRef.current) return
    let url: string | null = null
    let cancelled = false
    const io = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting) return
      io.disconnect()
      window.api.browser
        .thumbnail(entry.path)
        .then((buf) => {
          if (!buf || cancelled) return
          const ab = new ArrayBuffer(buf.length)
          new Uint8Array(ab).set(buf)
          url = URL.createObjectURL(new Blob([ab], { type: 'image/png' }))
          setThumb(url)
        })
        .catch(() => {})
    })
    io.observe(rowRef.current)
    return () => {
      cancelled = true
      io.disconnect()
      if (url) URL.revokeObjectURL(url)
    }
  }, [entry.path, isImage])

  const onDragStart = (e: React.DragEvent): void => {
    // Carry only the path — bytes are read at drop time, not now.
    e.dataTransfer.setData(FILE_DRAG_MIME, entry.path)
    e.dataTransfer.setData('text/plain', entry.name)
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div
      ref={rowRef}
      className="fb-row fb-file"
      style={{ paddingLeft: 8 + depth * 14 }}
      draggable
      onDragStart={onDragStart}
      title={`${entry.path}\nSleep naar de upload van een tool`}
    >
      {isImage && thumb ? (
        <img className="fb-thumb" src={thumb} alt="" />
      ) : (
        <span className="fb-icon">{iconFor(entry.type)}</span>
      )}
      <span className="fb-name">{entry.name}</span>
    </div>
  )
}

/** An expandable folder row; children are loaded lazily on first open. */
function FolderNode({
  path,
  name,
  depth,
  onUnpin
}: {
  path: string
  name: string
  depth: number
  onUnpin?: () => void
}): JSX.Element {
  const [open, setOpen] = useState(false)
  const [entries, setEntries] = useState<DirEntry[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggle = async (): Promise<void> => {
    if (open) {
      setOpen(false)
      return
    }
    setOpen(true)
    void window.api.browser.setLastDir(path)
    if (entries === null) {
      setLoading(true)
      setError(null)
      try {
        const res = await window.api.browser.list(path)
        setEntries(res.entries)
      } catch {
        setError('Kon deze map niet openen (geen toegang?).')
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <div className="fb-node">
      <div className="fb-row fb-folder" style={{ paddingLeft: 8 + depth * 14 }} onClick={toggle}>
        <span className="fb-chevron">{open ? '▾' : '▸'}</span>
        <span className="fb-icon">{open ? '📂' : '📁'}</span>
        <span className="fb-name">{name}</span>
        {onUnpin && (
          <button
            className="fb-unpin"
            title="Snelkoppeling verwijderen"
            onClick={(e) => {
              e.stopPropagation()
              onUnpin()
            }}
          >
            ×
          </button>
        )}
      </div>
      {open && (
        <div className="fb-children">
          {loading && <div className="fb-note" style={{ paddingLeft: 8 + (depth + 1) * 14 }}>Laden…</div>}
          {error && <div className="fb-note" style={{ paddingLeft: 8 + (depth + 1) * 14 }}>{error}</div>}
          {!loading && !error && entries?.length === 0 && (
            <div className="fb-note" style={{ paddingLeft: 8 + (depth + 1) * 14 }}>Leeg</div>
          )}
          {entries?.map((e) =>
            e.isDirectory ? (
              <FolderNode key={e.path} path={e.path} name={e.name} depth={depth + 1} />
            ) : (
              <FileNode key={e.path} entry={e} depth={depth + 1} />
            )
          )}
        </div>
      )}
    </div>
  )
}

function FilesPanel(): JSX.Element {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([])
  const [pinned, setPinned] = useState<string[]>([])
  const [lastDir, setLastDir] = useState<string | null>(null)

  useEffect(() => {
    window.api.browser.shortcuts().then(setShortcuts).catch(() => {})
    window.api.browser
      .getState()
      .then((s) => {
        setPinned(s.pinned)
        setLastDir(s.lastDir)
      })
      .catch(() => {})
  }, [])

  const pin = async (): Promise<void> => {
    setPinned(await window.api.browser.pinViaDialog())
  }
  const unpin = async (path: string): Promise<void> => {
    setPinned(await window.api.browser.unpin(path))
  }

  const shortcutPaths = new Set(shortcuts.map((s) => s.path))
  const showLastDir = lastDir && !shortcutPaths.has(lastDir) && !pinned.includes(lastDir)

  return (
    <div className="file-browser">
      <div className="fb-actions">
        <button className="btn" onClick={pin}>
          + Map vastpinnen
        </button>
      </div>

      <div className="fb-section-label">Snelkoppelingen</div>
      {shortcuts.map((s) => (
        <FolderNode key={s.path} path={s.path} name={s.label} depth={0} />
      ))}
      {showLastDir && (
        <FolderNode key={`last:${lastDir}`} path={lastDir} name={`Laatst bekeken · ${basename(lastDir)}`} depth={0} />
      )}

      {pinned.length > 0 && <div className="fb-section-label">Vastgepind</div>}
      {pinned.map((p) => (
        <FolderNode key={p} path={p} name={basename(p)} depth={0} onUnpin={() => unpin(p)} />
      ))}

      <p className="tk-note" style={{ padding: '10px 6px 0' }}>
        Blader door je mappen; sleep een bestand op de upload van een tool om het te laden. Er wordt
        niets gekopieerd.
      </p>
    </div>
  )
}

export default FilesPanel
