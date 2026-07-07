import { JSX, createContext, useContext, useEffect, useRef, useState } from 'react'
import { FILE_DRAG_MIME } from '../lib/collectedFiles'

type DirEntry = Awaited<ReturnType<typeof window.api.browser.list>>['entries'][number]
type Shortcut = Awaited<ReturnType<typeof window.api.browser.shortcuts>>[number]
export type Sort = 'name' | 'recent'
export type FilterKey = 'all' | 'image' | 'audio' | 'video' | 'pdf' | 'doc'

const FILTERS: { key: FilterKey; label: string; test: (type: string) => boolean }[] = [
  { key: 'all', label: 'Alles', test: () => true },
  { key: 'image', label: 'Afbeeldingen', test: (t) => t.startsWith('image/') },
  { key: 'audio', label: 'Audio', test: (t) => t.startsWith('audio/') },
  { key: 'video', label: 'Video', test: (t) => t.startsWith('video/') },
  { key: 'pdf', label: 'PDF', test: (t) => t === 'application/pdf' },
  {
    key: 'doc',
    label: 'Documenten',
    test: (t) => t.startsWith('text/') || t.includes('json') || t.includes('csv') || t.includes('markdown')
  }
]

// Sort + active file-type filter, shared with every node in the tree.
const BrowserCtx = createContext<{ sort: Sort; filterTest: (type: string) => boolean }>({
  sort: 'name',
  filterTest: () => true
})

// Multi-file selection, shared with every file row so range/toggle selection
// works across the whole (currently rendered) tree.
const SelectCtx = createContext<{
  selected: Set<string>
  onFileClick: (path: string, e: React.MouseEvent) => void
}>({ selected: new Set(), onFileClick: () => {} })

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

/** A file row: selectable + draggable onto a tool, with a lazy thumbnail for images. */
function FileNode({ entry, depth }: { entry: DirEntry; depth: number }): JSX.Element {
  const isImage = entry.type.startsWith('image/')
  const [thumb, setThumb] = useState<string | null>(null)
  const rowRef = useRef<HTMLDivElement>(null)
  const { selected, onFileClick } = useContext(SelectCtx)
  const isSelected = selected.has(entry.path)

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
      className={isSelected ? 'fb-row fb-file selected' : 'fb-row fb-file'}
      data-path={entry.path}
      style={{ paddingLeft: 8 + depth * 14 }}
      draggable
      onClick={(e) => onFileClick(entry.path, e)}
      onDragStart={onDragStart}
      title={`${entry.path}\nKlik om te selecteren (shift/⌘ voor meerdere) · sleep naar de upload van een tool`}
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

/** An expandable folder row; children are (re)loaded on open and on sort change. */
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
  const { sort, filterTest } = useContext(BrowserCtx)
  const [open, setOpen] = useState(false)
  const [entries, setEntries] = useState<DirEntry[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setError(null)
    void window.api.browser.setLastDir(path)
    window.api.browser
      .list(path, sort)
      .then((res) => {
        if (cancelled) return
        setEntries(res.entries)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setError('Kon deze map niet openen (geen toegang?).')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, sort, path])

  const pad = 8 + (depth + 1) * 14
  const shown = entries?.filter((e) => e.isDirectory || filterTest(e.type)) ?? []

  return (
    <div className="fb-node">
      <div
        className="fb-row fb-folder"
        style={{ paddingLeft: 8 + depth * 14 }}
        onClick={() => setOpen((o) => !o)}
      >
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
          {loading && <div className="fb-note" style={{ paddingLeft: pad }}>Laden…</div>}
          {error && <div className="fb-note" style={{ paddingLeft: pad }}>{error}</div>}
          {!loading && !error && shown.length === 0 && (
            <div className="fb-note" style={{ paddingLeft: pad }}>
              {entries && entries.length > 0 ? 'Niets voor dit filter' : 'Leeg'}
            </div>
          )}
          {shown.map((e) =>
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

// Sort and filter are lifted to the app shell so they survive the panel
// unmounting when you switch to the Tools tab and back. (Switching folders may
// still reset per-folder state; that's fine.)
function FilesPanel({
  sort,
  setSort,
  filter,
  setFilter
}: {
  sort: Sort
  setSort: (s: Sort) => void
  filter: FilterKey
  setFilter: (f: FilterKey) => void
}): JSX.Element {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([])
  const [pinned, setPinned] = useState<string[]>([])
  const [lastDir, setLastDir] = useState<string | null>(null)

  // Range-selection anchor + the current selection, scoped to this panel.
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const anchorRef = useRef<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

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

  const changeSort = (s: Sort): void => {
    setSort(s)
    void window.api.browser.setSort(s)
  }
  const pin = async (): Promise<void> => {
    setPinned(await window.api.browser.pinViaDialog())
  }
  const unpin = async (path: string): Promise<void> => {
    setPinned(await window.api.browser.unpin(path))
  }

  // Click a file to select it. Shift extends a range from the last anchor (in
  // on-screen order); ⌘/Ctrl toggles a single file into the selection.
  const onFileClick = (path: string, e: React.MouseEvent): void => {
    if (e.shiftKey && anchorRef.current) {
      const order = Array.from(
        containerRef.current?.querySelectorAll<HTMLElement>('.fb-file[data-path]') ?? []
      ).map((n) => n.dataset.path as string)
      const a = order.indexOf(anchorRef.current)
      const b = order.indexOf(path)
      if (a !== -1 && b !== -1) {
        const [lo, hi] = a < b ? [a, b] : [b, a]
        const range = order.slice(lo, hi + 1)
        setSelected((prev) => {
          const next = e.metaKey || e.ctrlKey ? new Set(prev) : new Set<string>()
          range.forEach((p) => next.add(p))
          return next
        })
        return
      }
    }
    if (e.metaKey || e.ctrlKey) {
      setSelected((prev) => {
        const next = new Set(prev)
        if (next.has(path)) next.delete(path)
        else next.add(path)
        return next
      })
      anchorRef.current = path
      return
    }
    setSelected(new Set([path]))
    anchorRef.current = path
  }

  const shortcutPaths = new Set(shortcuts.map((s) => s.path))
  const showLastDir = lastDir && !shortcutPaths.has(lastDir) && !pinned.includes(lastDir)
  const filterTest = (FILTERS.find((f) => f.key === filter) ?? FILTERS[0]).test

  return (
    <BrowserCtx.Provider value={{ sort, filterTest }}>
      <SelectCtx.Provider value={{ selected, onFileClick }}>
        <div className="file-browser" ref={containerRef}>
          <div className="fb-controls">
            <div className="tool-seg fb-seg">
              <button className={sort === 'name' ? 'on' : ''} onClick={() => changeSort('name')}>
                Naam
              </button>
              <button
                className={sort === 'recent' ? 'on' : ''}
                onClick={() => changeSort('recent')}
              >
                Recent
              </button>
            </div>
            <select
              className="fb-filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterKey)}
              title="Toon alleen deze bestandstypen"
            >
              {FILTERS.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

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
            <FolderNode
              key={`last:${lastDir}`}
              path={lastDir}
              name={`Laatst bekeken · ${basename(lastDir)}`}
              depth={0}
            />
          )}

          {pinned.length > 0 && <div className="fb-section-label">Vastgepind</div>}
          {pinned.map((p) => (
            <FolderNode key={p} path={p} name={basename(p)} depth={0} onUnpin={() => unpin(p)} />
          ))}

          <p className="tk-note" style={{ padding: '10px 6px 0' }}>
            Blader door je mappen; sleep een bestand op de upload van een tool om het te laden. Er
            wordt niets gekopieerd.
          </p>
        </div>
      </SelectCtx.Provider>
    </BrowserCtx.Provider>
  )
}

export default FilesPanel
