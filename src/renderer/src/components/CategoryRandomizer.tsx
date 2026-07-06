import { JSX, useState } from 'react'
import { ToolShell, Toggle, Note } from './toolkit'

// A rich pool of categories to draw from — handy for party games, brainstorms,
// tekenspellen, "noem er 5 van …", enzovoort.
const CATEGORIES: string[] = [
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
        <b>Trek een categorie</b> — toont een willekeurige categorie uit de lijst.
      </li>
      <li>
        <b>Trek zonder herhaling</b> — elke categorie komt maar één keer langs totdat ze allemaal
        geweest zijn; met <b>Reset</b> begin je opnieuw.
      </li>
    </ul>
  </>
)

function CategoryRandomizer(): JSX.Element {
  const [result, setResult] = useState<string | null>(null)
  const [noRepeat, setNoRepeat] = useState(false)
  const [drawn, setDrawn] = useState<string[]>([])

  const remaining = CATEGORIES.filter((c) => !drawn.includes(c))
  const exhausted = noRepeat && remaining.length === 0

  const draw = (): void => {
    if (noRepeat) {
      if (remaining.length === 0) return
      const pick = remaining[Math.floor(Math.random() * remaining.length)]
      setDrawn((d) => [...d, pick])
      setResult(pick)
    } else {
      setResult(CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)])
    }
  }

  const reset = (): void => {
    setDrawn([])
    setResult(null)
  }

  return (
    <ToolShell
      title="Categorie-randomizer"
      subtitle="Trek een willekeurige categorie uit een ruime lijst."
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

        {noRepeat && (
          <Note>
            {exhausted
              ? 'Alle categorieën zijn geweest — klik op Reset om opnieuw te beginnen.'
              : `${drawn.length} van ${CATEGORIES.length} getrokken.`}
          </Note>
        )}
      </div>
    </ToolShell>
  )
}

export default CategoryRandomizer
