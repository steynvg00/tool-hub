import { JSX, useEffect, useState } from 'react'
import type { BackendStatus } from '../../preload'
import Home from './components/Home'
import FilesPanel, { type Sort, type FilterKey } from './components/FilesPanel'
import { TOOLS, groupByCategory, type ToolDef } from './tools'

// 'home' shows the landing page; any other value is a tool id.
type View = 'home' | string
type SidebarTab = 'tools' | 'files'

const FAV_SECTION = 'Favorieten'

function NavTool({
  tool,
  active,
  isFav,
  onOpen,
  onToggleFav
}: {
  tool: ToolDef
  active: boolean
  isFav: boolean
  onOpen: () => void
  onToggleFav: () => void
}): JSX.Element {
  return (
    <div className="nav-row">
      <button className={active ? 'nav-item on' : 'nav-item'} onClick={onOpen}>
        <span className="nav-icon">{tool.icon}</span>
        {tool.label}
      </button>
      <button
        className={isFav ? 'nav-star on' : 'nav-star'}
        title={isFav ? 'Verwijder uit favorieten' : 'Voeg toe aan favorieten'}
        onClick={onToggleFav}
      >
        {isFav ? '★' : '☆'}
      </button>
    </div>
  )
}

function App(): JSX.Element {
  const [view, setView] = useState<View>('home')
  const [status, setStatus] = useState<BackendStatus>({
    state: 'starting',
    baseUrl: 'http://127.0.0.1:8756'
  })
  const [favorites, setFavorites] = useState<string[]>([])
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('tools')
  // Files-tab sort & filter live here so they survive the panel unmounting when
  // switching to the Tools tab and back.
  const [filesSort, setFilesSort] = useState<Sort>('name')
  const [filesFilter, setFilesFilter] = useState<FilterKey>('all')

  useEffect(() => {
    window.api.backend.getStatus().then(setStatus).catch(() => {})
    const unsub = window.api.backend.onStatus(setStatus)
    window.api.favorites.list().then(setFavorites).catch(() => {})
    window.api.browser
      .getState()
      .then((s) => setFilesSort(s.sort))
      .catch(() => {})
    return unsub
  }, [])

  // Select the contents of any number input on focus, so a pre-filled value
  // (e.g. a "0") is replaced the moment you start typing instead of forcing you
  // to delete it first. Deferred a frame so it survives a mouse click's caret
  // placement. Applies app-wide to every <input type="number">.
  useEffect(() => {
    const onFocusIn = (e: FocusEvent): void => {
      const t = e.target
      if (t instanceof HTMLInputElement && t.type === 'number') {
        requestAnimationFrame(() => {
          try {
            t.select()
          } catch {
            /* input detached before the frame ran */
          }
        })
      }
    }
    document.addEventListener('focusin', onFocusIn)
    return () => document.removeEventListener('focusin', onFocusIn)
  }, [])

  const toggleFav = (id: string): void => {
    window.api.favorites.toggle(id).then(setFavorites).catch(() => {})
  }

  const toggleCollapse = (key: string): void => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const statusLabel =
    status.state === 'ready'
      ? 'Backend actief'
      : status.state === 'starting'
        ? 'Backend start…'
        : 'Backend offline'

  const activeTool = TOOLS.find((t) => t.id === view)
  const groups = groupByCategory(TOOLS)
  const favTools = favorites
    .map((id) => TOOLS.find((t) => t.id === id))
    .filter((t): t is ToolDef => Boolean(t))

  const renderTool = (tool: ToolDef): JSX.Element => (
    <NavTool
      key={tool.id}
      tool={tool}
      active={view === tool.id}
      isFav={favorites.includes(tool.id)}
      onOpen={() => setView(tool.id)}
      onToggleFav={() => toggleFav(tool.id)}
    />
  )

  return (
    <div className="app-shell">
      <nav className="app-sidebar">
        <div className="app-brand">Tool Hub</div>

        <button
          className={view === 'home' ? 'nav-item on' : 'nav-item'}
          onClick={() => setView('home')}
        >
          <span className="nav-icon">🏠</span>
          Home
        </button>

        <div className="sidebar-tabs">
          <button
            className={sidebarTab === 'tools' ? 'sb-tab on' : 'sb-tab'}
            onClick={() => setSidebarTab('tools')}
          >
            Tools
          </button>
          <button
            className={sidebarTab === 'files' ? 'sb-tab on' : 'sb-tab'}
            onClick={() => setSidebarTab('files')}
          >
            Bestanden
          </button>
        </div>

        {sidebarTab === 'tools' && (
          <>
            {favTools.length > 0 && (
              <div className="nav-section">
                <button className="nav-cat" onClick={() => toggleCollapse(FAV_SECTION)}>
                  <span className="nav-cat-chevron">{collapsed.has(FAV_SECTION) ? '▸' : '▾'}</span>
                  {FAV_SECTION}
                </button>
                {!collapsed.has(FAV_SECTION) && favTools.map(renderTool)}
              </div>
            )}

            {groups.map((group) => (
              <div className="nav-section" key={group.category}>
                <button className="nav-cat" onClick={() => toggleCollapse(group.category)}>
                  <span className="nav-cat-chevron">
                    {collapsed.has(group.category) ? '▸' : '▾'}
                  </span>
                  {group.category}
                </button>
                {!collapsed.has(group.category) && group.tools.map(renderTool)}
              </div>
            ))}
          </>
        )}

        {sidebarTab === 'files' && (
          <FilesPanel
            sort={filesSort}
            setSort={setFilesSort}
            filter={filesFilter}
            setFilter={setFilesFilter}
          />
        )}

        <button className="nav-update" onClick={() => window.api.updates.check()}>
          Controleer op updates
        </button>

        <div className="app-backend" title={status.error ?? statusLabel}>
          <span className={`status-dot ${status.state}`} />
          {statusLabel}
        </div>
      </nav>

      <main className="tool-content">
        {activeTool ? (
          activeTool.render({ backendStatus: status, openTool: setView })
        ) : (
          <Home
            tools={TOOLS}
            onOpen={setView}
            favorites={favorites}
            onToggleFavorite={toggleFav}
          />
        )}
      </main>
    </div>
  )
}

export default App
