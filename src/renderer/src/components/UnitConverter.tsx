import { JSX, useMemo, useState } from 'react'
import { ToolShell, TextInput, Note } from './toolkit'

// A unit is described by how to convert to/from a category's base unit.
// Linear units use a factor; temperature needs affine (offset) conversions.
interface Unit {
  id: string
  label: string
  factor?: number // size relative to the base unit (linear units only)
  toBase: (v: number) => number
  fromBase: (v: number) => number
}

const linear = (id: string, label: string, factor: number): Unit => ({
  id,
  label,
  factor,
  toBase: (v) => v * factor,
  fromBase: (v) => v / factor
})

interface Category {
  id: string
  label: string
  units: Unit[]
}

const CATEGORIES: Category[] = [
  {
    id: 'length',
    label: 'Lengte',
    units: [
      linear('mm', 'Millimeter (mm)', 0.001),
      linear('cm', 'Centimeter (cm)', 0.01),
      linear('m', 'Meter (m)', 1),
      linear('km', 'Kilometer (km)', 1000),
      linear('inch', 'Inch (in)', 0.0254),
      linear('ft', 'Voet (ft)', 0.3048),
      linear('yd', 'Yard (yd)', 0.9144),
      linear('mile', 'Mijl (mi)', 1609.344),
      linear('nmi', 'Zeemijl (NM)', 1852)
    ]
  },
  {
    id: 'mass',
    label: 'Gewicht',
    units: [
      linear('mg', 'Milligram (mg)', 0.001),
      linear('g', 'Gram (g)', 1),
      linear('kg', 'Kilogram (kg)', 1000),
      linear('t', 'Ton (t)', 1_000_000),
      linear('oz', 'Ounce (oz)', 28.349523125),
      linear('lb', 'Pound (lb)', 453.59237),
      linear('st', 'Stone (st)', 6350.29318)
    ]
  },
  {
    id: 'temperature',
    label: 'Temperatuur',
    units: [
      {
        id: 'c',
        label: 'Celsius (°C)',
        toBase: (v) => v,
        fromBase: (v) => v
      },
      {
        id: 'f',
        label: 'Fahrenheit (°F)',
        toBase: (v) => ((v - 32) * 5) / 9,
        fromBase: (v) => (v * 9) / 5 + 32
      },
      {
        id: 'k',
        label: 'Kelvin (K)',
        toBase: (v) => v - 273.15,
        fromBase: (v) => v + 273.15
      }
    ]
  },
  {
    id: 'area',
    label: 'Oppervlak',
    units: [
      linear('cm2', 'cm²', 0.0001),
      linear('m2', 'm²', 1),
      linear('ha', 'Hectare (ha)', 10000),
      linear('km2', 'km²', 1_000_000),
      linear('sqft', 'Vierkante voet (ft²)', 0.09290304),
      linear('acre', 'Acre', 4046.8564224)
    ]
  },
  {
    id: 'volume',
    label: 'Volume',
    units: [
      linear('ml', 'Milliliter (ml)', 0.001),
      linear('l', 'Liter (l)', 1),
      linear('m3', 'Kubieke meter (m³)', 1000),
      linear('tsp', 'Theelepel (tsp)', 0.00492892),
      linear('tbsp', 'Eetlepel (tbsp)', 0.0147868),
      linear('cup', 'Cup (US)', 0.2365882),
      linear('pint', 'Pint (US)', 0.4731765),
      linear('gal', 'Gallon (US)', 3.785412)
    ]
  },
  {
    id: 'speed',
    label: 'Snelheid',
    units: [
      linear('ms', 'Meter/seconde (m/s)', 1),
      linear('kmh', 'Kilometer/uur (km/h)', 1000 / 3600),
      linear('mph', 'Mijl/uur (mph)', 1609.344 / 3600),
      linear('kn', 'Knoop (kn)', 1852 / 3600),
      linear('fts', 'Voet/seconde (ft/s)', 0.3048)
    ]
  },
  {
    id: 'data',
    label: 'Data-grootte',
    units: [
      linear('b', 'Byte (B)', 1),
      linear('kb', 'Kilobyte (kB, 1000)', 1e3),
      linear('mb', 'Megabyte (MB, 1000)', 1e6),
      linear('gb', 'Gigabyte (GB, 1000)', 1e9),
      linear('tb', 'Terabyte (TB, 1000)', 1e12),
      linear('kib', 'Kibibyte (KiB, 1024)', 1024),
      linear('mib', 'Mebibyte (MiB, 1024)', 1024 ** 2),
      linear('gib', 'Gibibyte (GiB, 1024)', 1024 ** 3),
      linear('tib', 'Tebibyte (TiB, 1024)', 1024 ** 4)
    ]
  }
]

function fmt(n: number): string {
  if (!isFinite(n)) return '—'
  if (n !== 0 && (Math.abs(n) < 1e-4 || Math.abs(n) >= 1e15)) return n.toExponential(6)
  const r = Number(n.toPrecision(10))
  return r.toLocaleString('nl-NL', { maximumFractionDigits: 8 })
}

// Exact conversion formulas for temperature (affine, not a simple factor).
const TEMP_FORMULA: Record<string, string> = {
  'c->f': '°F = °C × 9/5 + 32',
  'c->k': 'K = °C + 273,15',
  'f->c': '°C = (°F − 32) × 5/9',
  'f->k': 'K = (°F − 32) × 5/9 + 273,15',
  'k->c': '°C = K − 273,15',
  'k->f': '°F = (K − 273,15) × 9/5 + 32'
}

// The bit in parentheses of a label ("Millimeter (mm)" -> "mm"), else the label.
function abbr(label: string): string {
  const m = /\(([^)]+)\)/.exec(label)
  return m ? m[1] : label
}

/** Human-readable description of how `from` converts to `to`. */
function describe(from: Unit, to: Unit, catId: string): string {
  if (from.id === to.id) return 'zelfde eenheid'
  if (catId === 'temperature') return TEMP_FORMULA[`${from.id}->${to.id}`] ?? ''
  if (from.factor && to.factor) {
    return `1 ${abbr(from.label)} = ${fmt(from.factor / to.factor)} ${abbr(to.label)}`
  }
  return ''
}

const UNIT_CONVERTER_INFO = (
  <>
    <h4>Wat doet deze tool?</h4>
    <p>
      Rekent een waarde in één keer om naar alle andere eenheden binnen dezelfde grootheid. De tabel
      toont meteen elke omrekening.
    </p>
    <h4>Opties</h4>
    <ul>
      <li>
        <b>Grootheid</b> — kies wat je omrekent: lengte, gewicht, temperatuur, oppervlak, volume,
        snelheid of data-grootte.
      </li>
      <li>
        <b>Waarde</b> — het getal dat je wilt omrekenen (decimaal of negatief mag).
      </li>
      <li>
        <b>Van eenheid</b> — de eenheid waarin je waarde is ingevoerd; alle rijen tonen de omgerekende
        waarde.
      </li>
    </ul>
    <p>
      Bij data-grootte staan zowel de decimale eenheden (<code>kB</code>, <code>MB</code> = 1000) als de
      binaire (<code>KiB</code>, <code>MiB</code> = 1024).
    </p>
  </>
)

function UnitConverter(): JSX.Element {
  const [catId, setCatId] = useState(CATEGORIES[0].id)
  const [value, setValue] = useState('1')
  const [fromId, setFromId] = useState(CATEGORIES[0].units[2].id)

  const category = CATEGORIES.find((c) => c.id === catId) ?? CATEGORIES[0]

  const changeCategory = (id: string): void => {
    const cat = CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0]
    setCatId(id)
    setFromId(cat.units[0].id)
  }

  const num = Number(value)
  const valid = value.trim() !== '' && !Number.isNaN(num)

  const rows = useMemo(() => {
    const from = category.units.find((u) => u.id === fromId) ?? category.units[0]
    const base = valid ? from.toBase(num) : NaN
    return category.units.map((u) => ({
      unit: u,
      value: fmt(u.fromBase(base)),
      how: describe(from, u, category.id)
    }))
  }, [category, fromId, num, valid])

  return (
    <ToolShell
      title="Eenheden-omrekenaar"
      subtitle="Reken om tussen lengte, gewicht, temperatuur, oppervlak, volume, snelheid en data-grootte."
      info={UNIT_CONVERTER_INFO}
    >
      <div className="panel tool-panel">
        <label className="tool-field">
          <span className="tool-label">Grootheid</span>
          <select value={catId} onChange={(e) => changeCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <div className="tk-row">
          <TextInput label="Waarde" value={value} onChange={setValue} mono />
          <label className="tool-field">
            <span className="tool-label">Van eenheid</span>
            <select value={fromId} onChange={(e) => setFromId(e.target.value)}>
              {category.units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="tk-table-wrap" style={{ marginTop: 12 }}>
          <table className="tk-table">
            <thead>
              <tr>
                <th>Eenheid</th>
                <th>Waarde</th>
                <th>Omrekening</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.unit.id}>
                  <th style={{ width: '34%' }}>{r.unit.label}</th>
                  <td className="tk-mono">{r.value}</td>
                  <td className="tk-unit-how">{r.how}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Note>Data-grootte biedt zowel de decimale (1000) als de binaire (1024) eenheden.</Note>
      </div>
    </ToolShell>
  )
}

export default UnitConverter
