import { JSX, useEffect, useRef, useState } from 'react'
import exifr from 'exifr'
import piexif from 'piexifjs'
import { ToolShell, ErrorBanner, Note } from './toolkit'
import { FileButton } from './ToolFields'

type Tags = Record<string, unknown>
type ExifValue = string | number | number[] | number[][]
type Ifd = '0th' | 'Exif' | 'GPS' | 'Interop' | '1st'
type ExifDict = Record<string, Record<number, ExifValue>>

const IFDS: Ifd[] = ['0th', 'Exif', 'GPS', 'Interop', '1st']
const IFD_LABEL: Record<Ifd, string> = {
  '0th': 'Afbeelding',
  Exif: 'Exif',
  GPS: 'GPS',
  Interop: 'Interop',
  '1st': 'Thumbnail'
}

// GPS lat/lon (+ their refs) are edited via the dedicated decimal editor, so we
// keep them out of the generic per-field table.
const GPS_LATLON = new Set([
  piexif.GPSIFD.GPSLatitude,
  piexif.GPSIFD.GPSLatitudeRef,
  piexif.GPSIFD.GPSLongitude,
  piexif.GPSIFD.GPSLongitudeRef
])

const INT_TYPES = new Set(['Byte', 'Short', 'Long', 'SByte', 'SShort', 'SLong'])

function tagInfo(ifd: Ifd, tag: number): { name: string; type: string } | undefined {
  const table = (piexif.TAGS as Record<string, Record<number, { name: string; type: string }>>)[ifd]
  return table?.[tag]
}

function fmtValue(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v)) {
    // A single rational is [num, den]; render it as a decimal.
    if (v.length === 2 && typeof v[0] === 'number' && typeof v[1] === 'number') {
      return v[1] ? String(+(v[0] / v[1]).toFixed(4)) : String(v[0])
    }
    return v.map(fmtValue).join(', ')
  }
  return String(v)
}

function isEditable(type: string | undefined, value: ExifValue): boolean {
  if (type === 'Ascii') return true
  if (type && INT_TYPES.has(type) && typeof value === 'number') return true
  return false
}

function stripExt(name: string): string {
  const i = name.lastIndexOf('.')
  return i > 0 ? name.slice(0, i) : name
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [head, b64] = dataUrl.split(',')
  const mime = /data:(.*?);base64/.exec(head)?.[1] ?? 'image/jpeg'
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

// exifr view for the friendly read-only display (also non-JPEG formats).
function formatViewValue(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (v instanceof Date) return v.toLocaleString('nl-NL')
  if (typeof v === 'number')
    return Number.isInteger(v) ? String(v) : v.toFixed(4).replace(/\.?0+$/, '')
  if (Array.isArray(v)) return v.map(formatViewValue).join(', ')
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v)
    } catch {
      return String(v)
    }
  }
  return String(v)
}

const EXIF_TOOL_INFO = (
  <>
    <h4>Wat doet deze tool?</h4>
    <p>
      Toont de EXIF-metadata die in een foto verborgen zit — cameramodel, opname-instellingen, datum
      en, indien aanwezig, de <b>GPS-locatie</b>. Op JPEG-bestanden kun je bovendien per veld kiezen
      wat je <b>behoudt of verwijdert</b> en waarden <b>aanpassen</b>.
    </p>
    <h4>Opties</h4>
    <ul>
      <li>
        <b>Behouden-vinkje</b> &mdash; vink uit wat je uit de foto wilt strippen; de rest blijft
        staan. Zo hoef je niet alles-of-niets te wissen.
      </li>
      <li>
        <b>Waarde aanpassen</b> &mdash; tekst- en getalvelden kun je bewerken, handig voor een
        verborgen bericht (bijv. <i>ImageDescription</i>) of een bewust foute datum.
      </li>
      <li>
        <b>GPS-locatie</b> &mdash; vul een eigen breedte- en lengtegraad in (bijv. voor een spel met
        valse coördinaten), of wis de locatie helemaal.
      </li>
      <li>
        <b>Alles verwijderen</b> &mdash; strip in één klik álle EXIF; de pixels blijven onaangeroerd
        (geen her-codering).
      </li>
    </ul>
    <p>
      Bewerken en selectief verwijderen werken op <b>JPEG</b>. Andere formaten worden alleen
      read-only getoond.
    </p>
  </>
)

function ExifTool(): JSX.Element {
  const [file, setFile] = useState<File | null>(null)
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [isJpeg, setIsJpeg] = useState(false)

  const [viewTags, setViewTags] = useState<Tags | null>(null) // exifr, non-JPEG view
  const [dict, setDict] = useState<ExifDict | null>(null) // piexif, JPEG edit

  const [keep, setKeep] = useState<Set<string>>(new Set())
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [gps, setGps] = useState<{ lat: string; lon: string }>({ lat: '', lon: '' })
  const [keepGps, setKeepGps] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [outUrl, setOutUrl] = useState<string | null>(null)
  const [outName, setOutName] = useState('bewerkt.jpg')
  const [busy, setBusy] = useState(false)
  const outRef = useRef<string | null>(null)

  const setOut = (url: string | null): void => {
    if (outRef.current) URL.revokeObjectURL(outRef.current)
    outRef.current = url
    setOutUrl(url)
  }
  useEffect(() => () => setOut(null), [])

  const readAsDataUrl = (f: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve(r.result as string)
      r.onerror = () => reject(new Error('lezen mislukt'))
      r.readAsDataURL(f)
    })

  const pick = async (f: File | null): Promise<void> => {
    setFile(f)
    setViewTags(null)
    setDict(null)
    setKeep(new Set())
    setEdits({})
    setGps({ lat: '', lon: '' })
    setKeepGps(false)
    setError(null)
    setOut(null)
    if (!f) return
    setOutName(`${stripExt(f.name)}-bewerkt.jpg`)
    const jpeg = f.type === 'image/jpeg' || /\.jpe?g$/i.test(f.name)
    setIsJpeg(jpeg)

    // Always read a friendly view via exifr.
    try {
      setViewTags(((await exifr.parse(f, { gps: true })) as Tags | undefined) ?? {})
    } catch {
      setViewTags({})
    }

    if (!jpeg) return
    try {
      const url = await readAsDataUrl(f)
      setDataUrl(url)
      const loaded = piexif.load(url) as unknown as ExifDict
      setDict(loaded)

      // Every present field starts as "keep".
      const initialKeep = new Set<string>()
      for (const ifd of IFDS) {
        const obj = loaded[ifd]
        if (!obj) continue
        for (const tagStr of Object.keys(obj)) {
          const tag = Number(tagStr)
          if (ifd === 'GPS' && GPS_LATLON.has(tag)) continue
          initialKeep.add(`${ifd}:${tag}`)
        }
      }
      setKeep(initialKeep)

      // Seed the GPS editor from any existing location.
      const g = loaded.GPS
      const latVal = g?.[piexif.GPSIFD.GPSLatitude] as number[][] | undefined
      const lonVal = g?.[piexif.GPSIFD.GPSLongitude] as number[][] | undefined
      const latRef = g?.[piexif.GPSIFD.GPSLatitudeRef] as string | undefined
      const lonRef = g?.[piexif.GPSIFD.GPSLongitudeRef] as string | undefined
      if (latVal && lonVal) {
        const lat = piexif.GPSHelper.dmsRationalToDeg(latVal as unknown as number[], latRef ?? 'N')
        const lon = piexif.GPSHelper.dmsRationalToDeg(lonVal as unknown as number[], lonRef ?? 'E')
        setGps({ lat: lat.toFixed(6), lon: lon.toFixed(6) })
        setKeepGps(true)
      }
    } catch (e) {
      setError(`Kon de EXIF niet lezen voor bewerken: ${(e as Error).message}`)
    }
  }

  const toggleKeep = (id: string): void =>
    setKeep((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const setEdit = (id: string, value: string): void =>
    setEdits((prev) => ({ ...prev, [id]: value }))

  // Build the edited EXIF and produce a downloadable JPEG.
  const apply = (): void => {
    if (!dict || !dataUrl) return
    setBusy(true)
    setError(null)
    try {
      const out: ExifDict = JSON.parse(JSON.stringify(dict))
      for (const ifd of IFDS) {
        const obj = out[ifd]
        if (!obj) continue
        for (const tagStr of Object.keys(obj)) {
          const tag = Number(tagStr)
          const id = `${ifd}:${tag}`
          if (ifd === 'GPS' && GPS_LATLON.has(tag)) {
            delete obj[tag] // re-added from the GPS editor below
            continue
          }
          if (!keep.has(id)) {
            delete obj[tag]
            continue
          }
          const raw = edits[id]
          if (raw !== undefined) {
            const info = tagInfo(ifd, tag)
            if (info?.type === 'Ascii') obj[tag] = raw
            else if (info && INT_TYPES.has(info.type)) {
              const n = parseInt(raw, 10)
              if (Number.isFinite(n)) obj[tag] = n
            }
          }
        }
      }

      const lat = parseFloat(gps.lat)
      const lon = parseFloat(gps.lon)
      if (keepGps && Number.isFinite(lat) && Number.isFinite(lon)) {
        if (!out.GPS) out.GPS = {}
        out.GPS[piexif.GPSIFD.GPSLatitudeRef] = lat >= 0 ? 'N' : 'S'
        out.GPS[piexif.GPSIFD.GPSLatitude] = piexif.GPSHelper.degToDmsRational(
          Math.abs(lat)
        ) as unknown as number[][]
        out.GPS[piexif.GPSIFD.GPSLongitudeRef] = lon >= 0 ? 'E' : 'W'
        out.GPS[piexif.GPSIFD.GPSLongitude] = piexif.GPSHelper.degToDmsRational(
          Math.abs(lon)
        ) as unknown as number[][]
      }

      const bytes = piexif.dump(out as never)
      const newUrl = piexif.insert(bytes, dataUrl)
      setOut(URL.createObjectURL(dataUrlToBlob(newUrl)))
    } catch (e) {
      setError(`Kon de metadata niet wegschrijven: ${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  // Strip everything, leaving the pixels untouched.
  const stripAll = (): void => {
    if (!dataUrl) return
    setBusy(true)
    setError(null)
    try {
      const cleaned = piexif.remove(dataUrl)
      setOut(URL.createObjectURL(dataUrlToBlob(cleaned)))
    } catch (e) {
      setError(`Kon de metadata niet verwijderen: ${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  // Rows for the editable table, grouped per IFD.
  type ExRow = { id: string; tag: number; name: string; type?: string; value: ExifValue }
  const groups: { ifd: Ifd; rows: ExRow[] }[] = []
  if (dict) {
    for (const ifd of IFDS) {
      const obj = dict[ifd]
      if (!obj) continue
      const rows: ExRow[] = Object.keys(obj)
        .map(Number)
        .filter((tag) => !(ifd === 'GPS' && GPS_LATLON.has(tag)))
        .map((tag) => {
          const info = tagInfo(ifd, tag)
          return { id: `${ifd}:${tag}`, tag, name: info?.name ?? `#${tag}`, type: info?.type, value: obj[tag] }
        })
      if (rows.length) groups.push({ ifd, rows })
    }
  }

  const viewEntries = viewTags
    ? Object.entries(viewTags).filter(([, v]) => v !== undefined && v !== null)
    : []
  const viewLat = viewTags?.latitude as number | undefined
  const viewLon = viewTags?.longitude as number | undefined

  return (
    <ToolShell
      title="EXIF-viewer & editor"
      subtitle="Bekijk EXIF-metadata, kies per veld wat weg mag en pas waarden of GPS aan (JPEG)."
      info={EXIF_TOOL_INFO}
    >
      <>
        <div className="panel">
          <FileButton
            label="Afbeelding"
            accept="image/jpeg,image/tiff,image/*"
            file={file}
            onPick={pick}
          />
          <ErrorBanner message={error} />
          {file && !isJpeg && (
            <Note>
              Bewerken en selectief verwijderen werkt alleen op JPEG. De metadata hieronder is
              read-only.
            </Note>
          )}
        </div>

        {/* JPEG: editable, selective removal + GPS editor */}
        {isJpeg && dict && (
          <>
            <div className="panel">
              <div className="ex-gps">
                <label className="tk-toggle">
                  <input
                    type="checkbox"
                    checked={keepGps}
                    onChange={(e) => setKeepGps(e.target.checked)}
                  />
                  GPS-locatie opslaan
                </label>
                <div className="field-row">
                  <label className="tool-field">
                    <span className="tool-label">Breedtegraad</span>
                    <input
                      type="number"
                      step="any"
                      placeholder="bijv. 52.379189"
                      value={gps.lat}
                      disabled={!keepGps}
                      onChange={(e) => setGps((g) => ({ ...g, lat: e.target.value }))}
                    />
                  </label>
                  <label className="tool-field">
                    <span className="tool-label">Lengtegraad</span>
                    <input
                      type="number"
                      step="any"
                      placeholder="bijv. 4.899431"
                      value={gps.lon}
                      disabled={!keepGps}
                      onChange={(e) => setGps((g) => ({ ...g, lon: e.target.value }))}
                    />
                  </label>
                </div>
                <Note>
                  Zet uit om de locatie te verwijderen, of vul een eigen coördinaat in voor een
                  bewust foute GPS.
                </Note>
              </div>
            </div>

            <div className="panel">
              <div className="panel-title-row">
                <h2>Metadata-velden</h2>
                <span className="hint">{keep.size} behouden</span>
              </div>
              {groups.length === 0 ? (
                <Note>Geen bewerkbare EXIF-velden gevonden.</Note>
              ) : (
                groups.map((g) => (
                  <div key={g.ifd} className="ex-group">
                    <h3>{IFD_LABEL[g.ifd]}</h3>
                    <div className="ex-rows">
                      {g.rows.map((r) => {
                        const editable = isEditable(r.type, r.value)
                        const kept = keep.has(r.id)
                        return (
                          <div className={kept ? 'ex-row' : 'ex-row off'} key={r.id}>
                            <label className="ex-keep" title="Behouden">
                              <input type="checkbox" checked={kept} onChange={() => toggleKeep(r.id)} />
                            </label>
                            <span className="ex-name" title={`${r.name} (${r.type ?? '?'})`}>
                              {r.name}
                            </span>
                            {editable ? (
                              <input
                                className="ex-val"
                                value={edits[r.id] ?? fmtValue(r.value)}
                                disabled={!kept}
                                onChange={(e) => setEdit(r.id, e.target.value)}
                              />
                            ) : (
                              <span className="ex-val ex-val-ro" title={fmtValue(r.value)}>
                                {fmtValue(r.value)}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="panel">
              <div className="tk-actions">
                <button className="btn btn-primary" disabled={busy} onClick={apply}>
                  {busy ? 'Bezig…' : 'Toepassen & downloaden'}
                </button>
                <button className="btn" disabled={busy} onClick={stripAll}>
                  Alles verwijderen
                </button>
                {outUrl && (
                  <a className="btn" href={outUrl} download={outName}>
                    Download {outName}
                  </a>
                )}
              </div>
              <Note>De pixels blijven onaangeroerd; alleen de EXIF wordt herschreven.</Note>
            </div>
          </>
        )}

        {/* Non-JPEG: read-only exifr view */}
        {file && !isJpeg && viewTags && (
          <div className="panel">
            {typeof viewLat === 'number' && typeof viewLon === 'number' && (
              <dl className="tk-kv">
                <dt>GPS-locatie</dt>
                <dd>
                  {viewLat.toFixed(6)}, {viewLon.toFixed(6)}{' '}
                  <a href={`https://www.google.com/maps?q=${viewLat},${viewLon}`}>Bekijk op kaart</a>
                </dd>
              </dl>
            )}
            {viewEntries.length > 0 ? (
              <div className="tk-table-wrap">
                <table className="tk-table">
                  <thead>
                    <tr>
                      <th>Tag</th>
                      <th>Waarde</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewEntries.map(([k, v]) => (
                      <tr key={k}>
                        <td>{k}</td>
                        <td>{formatViewValue(v)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Note>Geen EXIF-metadata gevonden.</Note>
            )}
          </div>
        )}
      </>
    </ToolShell>
  )
}

export default ExifTool
