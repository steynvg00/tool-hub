import { JSX, useMemo, useState } from 'react'
import { groupByCategory, type ToolDef } from '../tools'

interface Props {
  tools: ToolDef[]
  onOpen: (id: string) => void
  favorites: string[]
  onToggleFavorite: (id: string) => void
}

/** Landing page: live search + category-grouped tiles, driven by the TOOLS registry. */
function Home({ tools, onOpen, favorites, onToggleFavorite }: Props): JSX.Element {
  const [query, setQuery] = useState('')

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = q
      ? tools.filter((t) =>
          `${t.label} ${t.description} ${t.category}`.toLowerCase().includes(q)
        )
      : tools
    return groupByCategory(filtered)
  }, [tools, query])

  return (
    <div className="home">
      <header className="home-header">
        <h1>Tool Hub</h1>
        <p>Kies een tool om te beginnen.</p>
      </header>

      <input
        className="home-search"
        type="search"
        placeholder="Zoek een tool op naam, omschrijving of categorie…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {groups.length === 0 ? (
        <p className="home-empty">Geen tools gevonden voor “{query}”.</p>
      ) : (
        groups.map((group) => (
          <section className="home-cat-section" key={group.category}>
            <h2 className="home-cat">{group.category}</h2>
            <div className="home-grid">
              {group.tools.map((t) => (
                <div className="tool-tile" key={t.id}>
                  <button className="tile-open" onClick={() => onOpen(t.id)}>
                    <span className="tile-icon">{t.icon}</span>
                    <span className="tile-label">{t.label}</span>
                    <span className="tile-desc">{t.description}</span>
                  </button>
                  <button
                    className={favorites.includes(t.id) ? 'tile-star on' : 'tile-star'}
                    title={
                      favorites.includes(t.id)
                        ? 'Verwijder uit favorieten'
                        : 'Voeg toe aan favorieten'
                    }
                    onClick={() => onToggleFavorite(t.id)}
                  >
                    {favorites.includes(t.id) ? '★' : '☆'}
                  </button>
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}

export default Home
