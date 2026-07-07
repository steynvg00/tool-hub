import { JSX, useEffect, useState } from 'react'
import { ToolShell, TextInput, Toggle, Note } from './toolkit'

// A rich pool of categories to draw from — handy for party games, brainstorms,
// tekenspellen, "noem er 5 van …", enzovoort.
const BUILTIN: string[] = [
  'Bekende personen',
  'Dieren',
  'Eten & drinken',
  'Films',
  'Tv-series',
  'Landen',
  'Steden',
  'Beroepen',
  "Auto's",
  'Kleuren',
  'Sporten',
  'Muziekgenres',
  'Muziekinstrumenten',
  'Merken',
  'Vakantiebestemmingen',
  "Hobby's",
  'Kledingstukken',
  'Groenten',
  'Fruit',
  'Bomen & planten',
  'Bloemen',
  'Gereedschap',
  'Superhelden',
  'Cartoonfiguren',
  'Bordspellen',
  'Videogames',
  'Boeken',
  'Historische figuren',
  'Uitvindingen',
  'Sterrenbeelden',
  'Emoties',
  'Weersverschijnselen',
  'Vogels',
  'Insecten',
  'Zeedieren',
  'Drankjes',
  'Snoep',
  'Fastfoodketens',
  'Talen',
  'Nationaliteiten',
  'Feestdagen',
  'Schoolvakken',
  'Zangers & bands',
  'Tv-programma’s',
  'Planeten & sterren',
  'Lichaamsdelen',
  'Dingen in de keuken',
  'Dingen in de badkamer',
  'Speelgoed',
  'Dansstijlen',
  'Wereldwonderen',
  'Rivieren & zeeën',
  'Bergen',
  'Pizza-toppings',
  'IJssmaken',
  'Cocktails',
  'Kaassoorten',
  'Broodsoorten',
  'Games uit je jeugd'
]

const CATEGORY_INFO = (
  <>
    <h4>Wat doet deze tool?</h4>
    <p>
      Trekt een willekeurige categorie uit een ruime lijst — ideaal voor spelletjes zoals
      &quot;noem er vijf van&quot;, tekenspellen of om een brainstorm op gang te helpen.
    </p>
    <h4>Opties</h4>
    <ul>
      <li>
        <b>Trek een categorie</b> — toont een willekeurige categorie uit de categorieën die je in de
        pool hebt aangevinkt (ingebouwde én je eigen).
      </li>
      <li>
        <b>Categorieën in de pool</b> — klap de lijst uit om precies te kiezen welke categorieën
        meedoen. Gebruik <b>alles selecteren</b>/<b>alles deselecteren</b> of vink losse categorieën
        aan en uit.
      </li>
      <li>
        <b>Trek zonder herhaling</b> — elke categorie komt maar één keer langs totdat ze allemaal
        geweest zijn; met <b>Reset</b> begin je opnieuw.
      </li>
      <li>
        <b>Eigen categorieën</b> — voeg je eigen categorieën toe; ze worden bewaard en meegenomen in
        de trekking. Met het kruisje verwijder je er weer een.
      </li>
    </ul>
  </>
)

function CategoryRandomizer(): JSX.Element {
  const [result, setResult] = useState<string | null>(null)
  const [noRepeat, setNoRepeat] = useState(false)
  const [drawn, setDrawn] = useState<string[]>([])
  const [custom, setCustom] = useState<string[]>([])
  const [newCat, setNewCat] = useState('')
  // Categories the user has switched OFF; everything else (incl. new ones) is in
  // the pool by default. Tracking the excluded set keeps async-loaded custom
  // categories enabled without extra bookkeeping.
  const [disabled, setDisabled] = useState<Set<string>>(new Set())
  const [catsOpen, setCatsOpen] = useState(false)

  useEffect(() => {
    window.api.categories.list().then(setCustom).catch(() => {})
  }, [])

  const all = [...BUILTIN, ...custom]
  const pool = all.filter((c) => !disabled.has(c))
  const remaining = pool.filter((c) => !drawn.includes(c))
  const exhausted = noRepeat ? remaining.length === 0 : pool.length === 0

  const draw = (): void => {
    if (noRepeat) {
      if (remaining.length === 0) return
      const pick = remaining[Math.floor(Math.random() * remaining.length)]
      setDrawn((d) => [...d, pick])
      setResult(pick)
    } else {
      if (pool.length === 0) return
      setResult(pool[Math.floor(Math.random() * pool.length)])
    }
  }

  const reset = (): void => {
    setDrawn([])
    setResult(null)
  }

  const toggleCat = (name: string): void => {
    setDisabled((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }
  const selectAll = (): void => setDisabled(new Set())
  const deselectAll = (): void => setDisabled(new Set(all))

  const addCategory = async (): Promise<void> => {
    const name = newCat.trim()
    if (!name) return
    setCustom(await window.api.categories.add(name))
    setNewCat('')
  }
  const removeCategory = async (name: string): Promise<void> => {
    setCustom(await window.api.categories.remove(name))
    setDisabled((prev) => {
      if (!prev.has(name)) return prev
      const next = new Set(prev)
      next.delete(name)
      return next
    })
  }

  return (
    <ToolShell
      title="Categorie-randomizer"
      subtitle="Trek een willekeurige categorie uit een ruime lijst — inclusief je eigen categorieën."
      info={CATEGORY_INFO}
    >
      <div className="panel tool-panel">
        <div className="tk-actions">
          <button
            className="btn btn-primary"
            style={{ width: 'auto' }}
            onClick={draw}
            disabled={exhausted}
          >
            Trek een categorie
          </button>
          <Toggle label="Trek zonder herhaling" checked={noRepeat} onChange={setNoRepeat} />
          {noRepeat && drawn.length > 0 && (
            <button className="btn" style={{ width: 'auto' }} onClick={reset}>
              Reset
            </button>
          )}
        </div>

        <div className={result ? 'tk-result' : 'tk-result empty'}>
          {result ?? 'Klik op “Trek een categorie”'}
        </div>

        {pool.length === 0 ? (
          <Note>Geen categorieën in de pool — vink er hieronder minstens één aan.</Note>
        ) : noRepeat ? (
          <Note>
            {exhausted
              ? 'Alle categorieën zijn geweest — klik op Reset om opnieuw te beginnen.'
              : `${drawn.length} van ${pool.length} getrokken.`}
          </Note>
        ) : null}
      </div>

      <div className="panel tool-panel">
        <button className="cr-cats-head" onClick={() => setCatsOpen((o) => !o)}>
          <span className="cr-cats-chevron">{catsOpen ? '▾' : '▸'}</span>
          <span className="cr-cats-title">Categorieën in de pool</span>
          <span className="cr-cats-count">
            {pool.length} / {all.length} actief
          </span>
        </button>

        {catsOpen && (
          <>
            <div className="tk-actions">
              <button className="btn" style={{ width: 'auto' }} onClick={selectAll}>
                Alles selecteren
              </button>
              <button className="btn" style={{ width: 'auto' }} onClick={deselectAll}>
                Alles deselecteren
              </button>
            </div>
            <div className="cr-catlist">
              {all.map((c) => (
                <label className="cr-catitem" key={c}>
                  <input
                    type="checkbox"
                    checked={!disabled.has(c)}
                    onChange={() => toggleCat(c)}
                  />
                  <span>{c}</span>
                </label>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="panel tool-panel">
        <h2>Eigen categorieën</h2>
        <div className="tk-row">
          <TextInput
            label="Nieuwe categorie"
            value={newCat}
            onChange={setNewCat}
            placeholder="bv. Bordspellen uit de jaren 90"
          />
          <button
            className="btn btn-primary"
            style={{ width: 'auto' }}
            onClick={addCategory}
            disabled={!newCat.trim()}
          >
            Toevoegen
          </button>
        </div>
        {custom.length === 0 ? (
          <Note>
            Nog geen eigen categorieën. De trekking gebruikt nu de {BUILTIN.length} ingebouwde.
          </Note>
        ) : (
          <div className="tk-pills">
            {custom.map((c) => (
              <span key={c} className="tk-pill">
                {c}
                <button
                  className="tk-pill-x"
                  title="Verwijderen"
                  onClick={() => removeCategory(c)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </ToolShell>
  )
}

export default CategoryRandomizer
