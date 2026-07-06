import { JSX, useEffect, useMemo, useState } from 'react'
import { ToolShell, TextInput, TextArea, Toggle, Note, ErrorBanner } from './toolkit'

type CustomRandomList = Awaited<ReturnType<typeof window.api.randomLists.list>>[number]

const BUILTIN: Record<string, string[]> = {
  'Bekende personen': [
    'Max Verstappen',
    'Johan Cruijff',
    'Vincent van Gogh',
    'Rembrandt van Rijn',
    'Willem-Alexander',
    'André Rieu',
    'Doutzen Kroes',
    'Armin van Buuren',
    'Anne Frank',
    'Marco Borsato',
    'Dafne Schippers',
    'Famke Louise',
    'Herman Finkers',
    'Sylvie Meis'
  ],
  Dieren: [
    'Hond',
    'Kat',
    'Koe',
    'Paard',
    'Konijn',
    'Olifant',
    'Leeuw',
    'Giraffe',
    'Pinguïn',
    'Dolfijn',
    'Egel',
    'Vos',
    'Uil',
    'Kikker',
    'Beer',
    'Zebra'
  ],
  Eten: [
    'Stamppot',
    'Bitterbal',
    'Stroopwafel',
    'Haring',
    'Poffertjes',
    'Erwtensoep',
    'Kroket',
    'Frikandel',
    'Pannenkoek',
    'Boerenkool',
    'Kibbeling',
    'Hutspot',
    'Oliebol',
    'Pepernoot'
  ],
  Films: [
    'Titanic',
    'The Lion King',
    'Frozen',
    'Avatar',
    'The Matrix',
    'Jurassic Park',
    'Forrest Gump',
    'Gladiator',
    'Inception',
    'The Godfather',
    'Pulp Fiction',
    'Toy Story',
    'Shrek',
    'Interstellar'
  ],
  Landen: [
    'Nederland',
    'België',
    'Duitsland',
    'Frankrijk',
    'Spanje',
    'Italië',
    'Portugal',
    'Zweden',
    'Noorwegen',
    'Griekenland',
    'Japan',
    'Brazilië',
    'Canada',
    'Australië',
    'Egypte'
  ],
  Beroepen: [
    'Dokter',
    'Leraar',
    'Timmerman',
    'Bakker',
    'Politieagent',
    'Brandweerman',
    'Advocaat',
    'Kapper',
    'Loodgieter',
    'Verpleegkundige',
    'Piloot',
    'Boer',
    'Kok',
    'Elektricien'
  ],
  "Auto's": [
    'Volkswagen Golf',
    'Tesla Model 3',
    'BMW 3-serie',
    'Audi A4',
    'Mercedes C-klasse',
    'Toyota Yaris',
    'Renault Clio',
    'Ford Focus',
    'Opel Corsa',
    'Fiat 500',
    'Peugeot 208',
    'Volvo XC40',
    'Kia Picanto',
    'Mini Cooper'
  ],
  'Wapens (Cluedo)': ['Kandelaar', 'Mes', 'Loden pijp', 'Revolver', 'Touw', 'Steeksleutel']
}

/** Sanitise lines: trim and drop empty ones. */
function toItems(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s !== '')
}

const CATEGORY_INFO = (
  <>
    <h4>Wat doet deze tool?</h4>
    <p>
      Kies een categorie en trek er een willekeurig item uit. Naast de meegeleverde
      categorieën kun je ook je eigen lijsten aanmaken, bewerken en opslaan.
    </p>
    <h4>Opties</h4>
    <ul>
      <li>
        <b>Lijst</b> — kies uit een ingebouwde categorie of een van je eigen opgeslagen lijsten.
      </li>
      <li>
        <b>Trek</b> — toont een willekeurig item uit de gekozen lijst.
      </li>
      <li>
        <b>Trek zonder herhaling</b> — elk item wordt maar één keer getrokken totdat de lijst op is;
        met <b>Reset</b> begin je opnieuw.
      </li>
      <li>
        <b>Eigen lijsten</b> — geef een naam en zet één item per regel; sla op om de lijst te
        bewaren, of bewerk en verwijder bestaande lijsten.
      </li>
    </ul>
  </>
)

function CategoryRandomizer(): JSX.Element {
  const [userLists, setUserLists] = useState<CustomRandomList[]>([])
  const [selected, setSelected] = useState<string>('builtin:' + Object.keys(BUILTIN)[0])
  const [result, setResult] = useState<string | null>(null)
  const [noRepeat, setNoRepeat] = useState(false)
  const [drawn, setDrawn] = useState<Record<string, string[]>>({})
  const [error, setError] = useState<string | null>(null)

  // Custom-list editor form.
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formItems, setFormItems] = useState('')

  const refresh = async (): Promise<CustomRandomList[]> => {
    const lists = await window.api.randomLists.list()
    setUserLists(lists)
    return lists
  }

  useEffect(() => {
    window.api.randomLists
      .list()
      .then(setUserLists)
      .catch(() => setError('Kon eigen lijsten niet laden.'))
  }, [])

  const activeItems = useMemo<string[]>(() => {
    if (selected.startsWith('builtin:')) {
      return BUILTIN[selected.slice('builtin:'.length)] ?? []
    }
    const id = selected.slice('user:'.length)
    return userLists.find((l) => l.id === id)?.items ?? []
  }, [selected, userLists])

  const drawnHere = drawn[selected] ?? []
  const remaining = activeItems.filter((i) => !drawnHere.includes(i))
  const exhausted = noRepeat && activeItems.length > 0 && remaining.length === 0

  // Switch the active list and clear the shown result.
  const changeSelected = (value: string): void => {
    setSelected(value)
    setResult(null)
  }

  const draw = (): void => {
    if (activeItems.length === 0) return
    if (noRepeat) {
      if (remaining.length === 0) return
      const pick = remaining[Math.floor(Math.random() * remaining.length)]
      setDrawn((d) => ({ ...d, [selected]: [...(d[selected] ?? []), pick] }))
      setResult(pick)
    } else {
      setResult(activeItems[Math.floor(Math.random() * activeItems.length)])
    }
  }

  const resetDrawn = (): void => {
    setDrawn((d) => ({ ...d, [selected]: [] }))
    setResult(null)
  }

  const startEdit = (list: CustomRandomList): void => {
    setEditingId(list.id)
    setFormName(list.name)
    setFormItems(list.items.join('\n'))
  }

  const clearForm = (): void => {
    setEditingId(null)
    setFormName('')
    setFormItems('')
  }

  const save = async (): Promise<void> => {
    const name = formName.trim()
    const items = toItems(formItems)
    if (name === '') {
      setError('Geef de lijst een naam.')
      return
    }
    if (items.length === 0) {
      setError('Voeg minstens één item toe.')
      return
    }
    setError(null)
    try {
      await window.api.randomLists.save({
        id: editingId ?? undefined,
        name,
        items
      })
      // Contents may have changed → reset drawn state for this list.
      if (editingId) {
        setDrawn((d) => ({ ...d, ['user:' + editingId]: [] }))
      }
      await refresh()
      clearForm()
    } catch {
      setError('Opslaan mislukt.')
    }
  }

  const remove = async (id: string): Promise<void> => {
    setError(null)
    try {
      await window.api.randomLists.delete(id)
      const key = 'user:' + id
      setDrawn((d) => {
        const next = { ...d }
        delete next[key]
        return next
      })
      if (selected === key) {
        changeSelected('builtin:' + Object.keys(BUILTIN)[0])
      }
      if (editingId === id) clearForm()
      await refresh()
    } catch {
      setError('Verwijderen mislukt.')
    }
  }

  return (
    <ToolShell
      title="Categorie-randomizer"
      subtitle="Kies een categorie en trek een willekeurig item."
      info={CATEGORY_INFO}
    >
      <div className="panel">
        <label className="tool-field">
          <span className="tool-label">Lijst</span>
          <select value={selected} onChange={(e) => changeSelected(e.target.value)}>
            <optgroup label="Categorieën">
              {Object.keys(BUILTIN).map((cat) => (
                <option key={cat} value={'builtin:' + cat}>
                  {cat}
                </option>
              ))}
            </optgroup>
            {userLists.length > 0 && (
              <optgroup label="Eigen lijsten">
                {userLists.map((l) => (
                  <option key={l.id} value={'user:' + l.id}>
                    ★ {l.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>

        <div className="tk-actions">
          <button
            className="btn btn-primary"
            style={{ width: 'auto' }}
            onClick={draw}
            disabled={activeItems.length === 0 || exhausted}
          >
            Trek
          </button>
          <Toggle label="Trek zonder herhaling" checked={noRepeat} onChange={setNoRepeat} />
          {noRepeat && drawnHere.length > 0 && (
            <button className="btn" onClick={resetDrawn}>
              Reset
            </button>
          )}
        </div>

        {activeItems.length === 0 ? (
          <Note>Deze lijst is leeg. Voeg items toe bij “Eigen lijsten”.</Note>
        ) : exhausted ? (
          <div className="tk-result empty">
            De lijst is op — klik op “Reset” om opnieuw te trekken.
          </div>
        ) : result !== null ? (
          <div className="tk-result">{result}</div>
        ) : (
          <div className="tk-result empty">Klik op “Trek” voor een willekeurig item.</div>
        )}

        {noRepeat && activeItems.length > 0 && (
          <Note>
            {drawnHere.length} van {activeItems.length} getrokken.
          </Note>
        )}
      </div>

      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Eigen lijsten</h3>
        <ErrorBanner message={error} />

        <TextInput
          label="Naam"
          value={formName}
          onChange={setFormName}
          placeholder="Bijv. Klasgenoten"
        />
        <TextArea
          label="Items (één per regel)"
          value={formItems}
          onChange={setFormItems}
          rows={6}
          mono={false}
          placeholder={'Item 1\nItem 2\nItem 3'}
        />
        <div className="tk-actions">
          <button className="btn btn-primary" style={{ width: 'auto' }} onClick={save}>
            {editingId ? 'Bijwerken' : 'Opslaan'}
          </button>
          {editingId && (
            <button className="btn" onClick={clearForm}>
              Annuleren
            </button>
          )}
        </div>

        {userLists.length === 0 ? (
          <Note>Je hebt nog geen eigen lijsten opgeslagen.</Note>
        ) : (
          <div style={{ marginTop: 12 }}>
            {userLists.map((l) => (
              <div className="tk-listrow" key={l.id}>
                <span className="tk-listrow-name">{l.name}</span>
                <span className="tk-listrow-count">{l.items.length} items</span>
                <button className="btn" onClick={() => startEdit(l)}>
                  Bewerken
                </button>
                <button className="btn" onClick={() => remove(l.id)}>
                  Verwijderen
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </ToolShell>
  )
}

export default CategoryRandomizer
