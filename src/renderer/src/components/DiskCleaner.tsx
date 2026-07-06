import { JSX, useEffect, useMemo, useState } from 'react'
import { ToolShell, TextInput, Note, ErrorBanner } from './toolkit'
import { formatBytes } from '../lib/api'

type ScanResult = Awaited<ReturnType<typeof window.api.disk.scan>>
type DiskGroup = ScanResult['largest']
type DiskFile = DiskGroup['files'][number]
type DupGroup = ScanResult['duplicates']['groups'][number]
type Progress = Parameters<Parameters<typeof window.api.disk.onScanProgress>[0]>[0]

const fmtDate = (ms: number): string =>
  new Date(ms).toLocaleDateString('nl-NL', { year: 'numeric', month: 'short', day: 'numeric' })

// AI explanation is intentionally not built yet — the button is a placeholder.
function AiButton(): JSX.Element {
  return (
    <button
      className="dc-ai"
      disabled
      title="Vereist een API-key — later in te stellen. De AI verklaart alleen; hij selecteert of verwijdert nooit zelf."
    >
      ✨ AI-uitleg
    </button>
  )
}

function FileRow({
  file,
  checked,
  onToggle
}: {
  file: DiskFile
  checked: boolean
  onToggle: () => void
}): JSX.Element {
  return (
    <label className="dc-row">
      <input type="checkbox" checked={checked} onChange={onToggle} />
      <span className="dc-name" title={file.path}>
        {file.name}
      </span>
      <span className="dc-size">{formatBytes(file.size)}</span>
      <span className="dc-date">{fmtDate(file.mtime)}</span>
    </label>
  )
}

// Remove trashed paths from a scan result so the view updates without a rescan.
function applyTrash(result: ScanResult, trashed: Set<string>): ScanResult {
  const strip = (g: DiskGroup): DiskGroup => {
    const removed = g.files.filter((f) => trashed.has(f.path))
    const files = g.files.filter((f) => !trashed.has(f.path))
    const removedBytes = removed.reduce((s, f) => s + f.size, 0)
    return {
      count: Math.max(files.length, g.count - removed.length),
      bytes: Math.max(0, g.bytes - removedBytes),
      files,
      truncated: g.truncated
    }
  }
  const dupGroups = result.duplicates.groups
    .map((grp) => {
      const files = grp.files.filter((f) => !trashed.has(f.path))
      return { ...grp, files, reclaimable: files.length >= 2 ? grp.size * (files.length - 1) : 0 }
    })
    .filter((grp) => grp.files.length >= 2)
  return {
    ...result,
    largest: strip(result.largest),
    videos: strip(result.videos),
    old: strip(result.old),
    caches: strip(result.caches),
    duplicates: {
      count: dupGroups.length,
      reclaimable: dupGroups.reduce((s, g) => s + g.reclaimable, 0),
      groups: dupGroups,
      truncated: result.duplicates.truncated
    }
  }
}

const DISK_INFO = (
  <>
    <h4>Wat doet deze tool?</h4>
    <p>
      Scant een map binnen je persoonlijke map en groepeert wat ruimte kost, zodat je bewust kunt
      opruimen. Dit is de enige tool die bestanden kan verwijderen — en dat gebeurt <b>altijd naar de
      prullenbak</b> (herstelbaar), nooit definitief.
    </p>
    <h4>Groepen</h4>
    <ul>
      <li><b>Grootste bestanden</b> — de grootste losse bestanden.</li>
      <li><b>Dubbele bestanden</b> — identieke bestanden (op grootte gegroepeerd, dan op inhoud gehasht). Er blijft altijd één exemplaar behouden.</li>
      <li><b>Grote video&apos;s</b> — videobestanden boven de drempel.</li>
      <li><b>Oude bestanden</b> — al lang niet meer gewijzigd.</li>
      <li><b>App-caches</b> — herbouwbare cachebestanden onder ~/Library/Caches.</li>
    </ul>
    <p>
      Niets staat voorgeselecteerd; je kiest zelf per bestand. Systeemmappen worden nooit aangeraakt.
      De AI-uitleg-knop is nog uitgeschakeld en zal, wanneer ingesteld, alleen namen verklaren — nooit
      zelf iets selecteren of verwijderen.
    </p>
  </>
)

function GroupSection({
  id,
  title,
  group,
  expanded,
  onToggleExpand,
  selected,
  onToggleFile,
  onSelectAll,
  onClearGroup
}: {
  id: string
  title: string
  group: DiskGroup
  expanded: boolean
  onToggleExpand: () => void
  selected: Set<string>
  onToggleFile: (p: string) => void
  onSelectAll: (files: DiskFile[]) => void
  onClearGroup: (files: DiskFile[]) => void
}): JSX.Element {
  return (
    <div className="dc-group">
      <div className="dc-group-head" onClick={onToggleExpand}>
        <span className="dc-chevron">{expanded ? '▾' : '▸'}</span>
        <span className="dc-group-title">{title}</span>
        <span className="dc-group-meta">
          {group.count} · {formatBytes(group.bytes)}
        </span>
        <AiButton />
      </div>
      {expanded && (
        <div className="dc-group-body">
          {group.files.length === 0 ? (
            <Note>Niets gevonden.</Note>
          ) : (
            <>
              <div className="dc-group-actions">
                <button className="dc-mini" onClick={() => onSelectAll(group.files)}>
                  Selecteer alles hier
                </button>
                <button className="dc-mini" onClick={() => onClearGroup(group.files)}>
                  Wis selectie
                </button>
              </div>
              {group.files.map((f) => (
                <FileRow
                  key={f.path}
                  file={f}
                  checked={selected.has(f.path)}
                  onToggle={() => onToggleFile(f.path)}
                />
              ))}
              {group.truncated && (
                <Note>Alleen de eerste {group.files.length} van {group.count} getoond.</Note>
              )}
            </>
          )}
        </div>
      )}
      <span className="dc-group-id" hidden>
        {id}
      </span>
    </div>
  )
}

function DupSection({
  data,
  expanded,
  onToggleExpand,
  selected,
  keep,
  onToggleFile,
  onSetKeep
}: {
  data: ScanResult['duplicates']
  expanded: boolean
  onToggleExpand: () => void
  selected: Set<string>
  keep: Record<string, string>
  onToggleFile: (p: string) => void
  onSetKeep: (hash: string, path: string) => void
}): JSX.Element {
  return (
    <div className="dc-group">
      <div className="dc-group-head" onClick={onToggleExpand}>
        <span className="dc-chevron">{expanded ? '▾' : '▸'}</span>
        <span className="dc-group-title">Dubbele bestanden</span>
        <span className="dc-group-meta">
          {data.count} groepen · {formatBytes(data.reclaimable)} terug te winnen
        </span>
        <AiButton />
      </div>
      {expanded && (
        <div className="dc-group-body">
          {data.groups.length === 0 ? (
            <Note>Geen duplicaten gevonden.</Note>
          ) : (
            data.groups.map((grp: DupGroup) => {
              const keptPath = keep[grp.hash] ?? grp.files[0].path
              return (
                <div className="dc-dupgroup" key={grp.hash}>
                  <div className="dc-dup-meta">
                    {grp.files.length}× · {formatBytes(grp.size)} elk · {formatBytes(grp.reclaimable)}{' '}
                    terug te winnen
                  </div>
                  {grp.files.map((f) => {
                    const isKept = f.path === keptPath
                    return (
                      <div className={isKept ? 'dc-row dc-kept' : 'dc-row'} key={f.path}>
                        <input
                          type="radio"
                          name={`keep-${grp.hash}`}
                          checked={isKept}
                          title="Dit exemplaar behouden"
                          onChange={() => onSetKeep(grp.hash, f.path)}
                        />
                        <input
                          type="checkbox"
                          disabled={isKept}
                          checked={!isKept && selected.has(f.path)}
                          onChange={() => onToggleFile(f.path)}
                        />
                        <span className="dc-name" title={f.path}>
                          {f.name}
                          {isKept && <span className="dc-keep-tag">behouden</span>}
                        </span>
                        <span className="dc-date">{fmtDate(f.mtime)}</span>
                      </div>
                    )
                  })}
                </div>
              )
            })
          )}
          {data.truncated && <Note>Alleen de grootste {data.groups.length} groepen getoond.</Note>}
        </div>
      )}
    </div>
  )
}

function DiskCleaner(): JSX.Element {
  const [shortcuts, setShortcuts] = useState<{ label: string; path: string }[]>([])
  const [root, setRoot] = useState<string | null>(null)
  const [oldMonths, setOldMonths] = useState('6')
  const [videoMinMb, setVideoMinMb] = useState('100')
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [expanded, setExpanded] = useState<Set<string>>(new Set(['duplicates']))
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [keep, setKeep] = useState<Record<string, string>>({})
  const [confirming, setConfirming] = useState(false)
  const [lastTrash, setLastTrash] = useState<{ trashed: number; failed: number } | null>(null)

  useEffect(() => {
    window.api.disk.shortcuts().then(setShortcuts).catch(() => {})
    const unsub = window.api.disk.onScanProgress(setProgress)
    return unsub
  }, [])

  // path -> size, so the selection total never double-counts a file in two groups.
  const sizeOf = useMemo(() => {
    const m = new Map<string, number>()
    if (result) {
      for (const g of [result.largest, result.videos, result.old, result.caches])
        for (const f of g.files) m.set(f.path, f.size)
      for (const grp of result.duplicates.groups) for (const f of grp.files) m.set(f.path, f.size)
    }
    return m
  }, [result])

  const selectedBytes = useMemo(
    () => [...selected].reduce((s, p) => s + (sizeOf.get(p) ?? 0), 0),
    [selected, sizeOf]
  )

  const runScan = async (): Promise<void> => {
    if (!root) return
    setScanning(true)
    setError(null)
    setResult(null)
    setSelected(new Set())
    setKeep({})
    setLastTrash(null)
    setProgress(null)
    try {
      const res = await window.api.disk.scan(root, {
        oldMonths: Math.max(1, Number(oldMonths) || 6),
        videoMinMb: Math.max(1, Number(videoMinMb) || 100)
      })
      setResult(res)
    } catch (e) {
      const msg = (e as Error).message || ''
      if (!msg.includes('cancelled')) setError(msg || 'Scannen mislukt.')
    } finally {
      setScanning(false)
    }
  }

  const pickDir = async (): Promise<void> => {
    const res = await window.api.disk.pickDir()
    if (res === null) return
    if (typeof res === 'object') {
      setError('Deze map ligt buiten je persoonlijke map en wordt om veiligheidsredenen niet gescand.')
      return
    }
    setRoot(res)
    setError(null)
  }

  const toggleExpand = (id: string): void =>
    setExpanded((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  const toggleFile = (p: string): void =>
    setSelected((s) => {
      const n = new Set(s)
      n.has(p) ? n.delete(p) : n.add(p)
      return n
    })
  const selectAll = (files: DiskFile[]): void =>
    setSelected((s) => {
      const n = new Set(s)
      files.forEach((f) => n.add(f.path))
      return n
    })
  const clearGroup = (files: DiskFile[]): void =>
    setSelected((s) => {
      const n = new Set(s)
      files.forEach((f) => n.delete(f.path))
      return n
    })
  const setKeepFor = (hash: string, path: string): void => {
    setKeep((k) => ({ ...k, [hash]: path }))
    setSelected((s) => {
      const n = new Set(s)
      n.delete(path) // the kept copy can never be selected for deletion
      return n
    })
  }

  const doTrash = async (): Promise<void> => {
    if (!root) return
    const paths = [...selected]
    const res = await window.api.disk.trash(root, paths)
    const trashedSet = new Set(res.trashed)
    if (result) setResult(applyTrash(result, trashedSet))
    setSelected((s) => new Set([...s].filter((p) => !trashedSet.has(p))))
    setConfirming(false)
    setLastTrash({ trashed: res.trashed.length, failed: res.failed.length })
  }

  return (
    <ToolShell
      title="Schijf opruimen"
      subtitle="Scan een map, bekijk wat ruimte kost, en verplaats geselecteerde bestanden veilig naar de prullenbak."
      info={DISK_INFO}
    >
      <>
      <div className="panel tool-panel">
        <div className="tool-field">
          <span className="tool-label">Map om te scannen</span>
          <div className="tk-pills">
            {shortcuts.map((s) => (
              <button
                key={s.path}
                className={'tk-pill' + (root === s.path ? ' on' : '')}
                style={{ cursor: 'pointer' }}
                onClick={() => setRoot(s.path)}
              >
                {s.label}
              </button>
            ))}
            <button className="tk-pill" style={{ cursor: 'pointer' }} onClick={pickDir}>
              Andere map…
            </button>
          </div>
          {root && <Note>Gekozen: <code>{root}</code></Note>}
        </div>

        <div className="tk-row">
          <TextInput label="Oud vanaf (maanden)" value={oldMonths} onChange={setOldMonths} type="number" mono />
          <TextInput label="Grote video vanaf (MB)" value={videoMinMb} onChange={setVideoMinMb} type="number" mono />
        </div>

        <ErrorBanner message={error} />

        <div className="tk-actions">
          <button className="btn btn-primary" style={{ width: 'auto' }} disabled={!root || scanning} onClick={runScan}>
            {scanning ? 'Bezig met scannen…' : 'Scan map'}
          </button>
          {scanning && (
            <button className="btn" style={{ width: 'auto' }} onClick={() => window.api.disk.cancelScan()}>
              Annuleren
            </button>
          )}
        </div>

        {scanning && progress && (
          <Note>
            {progress.phase === 'walk'
              ? `Scannen… ${progress.files.toLocaleString('nl-NL')} bestanden (${formatBytes(progress.bytes)})`
              : `Duplicaten controleren… ${progress.hashed ?? 0} / ${progress.toHash ?? 0} gehasht`}
          </Note>
        )}

        {lastTrash && (
          <div className="banner" style={{ background: 'rgba(62,207,142,0.14)', borderColor: '#3ecf8e' }}>
            {lastTrash.trashed} bestand(en) naar de prullenbak verplaatst — herstelbaar.
            {lastTrash.failed > 0 && ` ${lastTrash.failed} mislukt.`}
          </div>
        )}

        {result && (
          <>
            <StatSummary result={result} />
            <div className="dc-groups">
              <GroupSection
                id="largest"
                title="Grootste bestanden"
                group={result.largest}
                expanded={expanded.has('largest')}
                onToggleExpand={() => toggleExpand('largest')}
                selected={selected}
                onToggleFile={toggleFile}
                onSelectAll={selectAll}
                onClearGroup={clearGroup}
              />
              <DupSection
                data={result.duplicates}
                expanded={expanded.has('duplicates')}
                onToggleExpand={() => toggleExpand('duplicates')}
                selected={selected}
                keep={keep}
                onToggleFile={toggleFile}
                onSetKeep={setKeepFor}
              />
              <GroupSection
                id="videos"
                title="Grote video's"
                group={result.videos}
                expanded={expanded.has('videos')}
                onToggleExpand={() => toggleExpand('videos')}
                selected={selected}
                onToggleFile={toggleFile}
                onSelectAll={selectAll}
                onClearGroup={clearGroup}
              />
              <GroupSection
                id="old"
                title="Oude bestanden"
                group={result.old}
                expanded={expanded.has('old')}
                onToggleExpand={() => toggleExpand('old')}
                selected={selected}
                onToggleFile={toggleFile}
                onSelectAll={selectAll}
                onClearGroup={clearGroup}
              />
              <GroupSection
                id="caches"
                title="App-caches"
                group={result.caches}
                expanded={expanded.has('caches')}
                onToggleExpand={() => toggleExpand('caches')}
                selected={selected}
                onToggleFile={toggleFile}
                onSelectAll={selectAll}
                onClearGroup={clearGroup}
              />
            </div>
          </>
        )}

        {confirming && (
          <div className="dc-confirm">
            <h3>Naar de prullenbak verplaatsen?</h3>
            <p>
              <b>{selected.size}</b> bestand(en) · <b>{formatBytes(selectedBytes)}</b> gaan naar de
              prullenbak. Ze zijn daarna gewoon terug te zetten via de Finder-prullenbak.
            </p>
            <div className="tk-actions">
              <button className="btn btn-primary" style={{ width: 'auto' }} onClick={doTrash}>
                Ja, naar prullenbak
              </button>
              <button className="btn" style={{ width: 'auto' }} onClick={() => setConfirming(false)}>
                Annuleren
              </button>
            </div>
          </div>
        )}
      </div>

      {result && selected.size > 0 && !confirming && (
        <div className="dc-bar">
          <span>
            {selected.size} geselecteerd · {formatBytes(selectedBytes)}
          </span>
          <button className="btn btn-primary" style={{ width: 'auto', margin: 0 }} onClick={() => setConfirming(true)}>
            Verplaats naar prullenbak
          </button>
        </div>
      )}
      </>
    </ToolShell>
  )
}

function StatSummary({ result }: { result: ScanResult }): JSX.Element {
  return (
    <div className="tk-stats">
      <div className="tk-stat">
        <span className="tk-stat-value">{result.totalFiles.toLocaleString('nl-NL')}</span>
        <span className="tk-stat-label">Bestanden</span>
      </div>
      <div className="tk-stat">
        <span className="tk-stat-value">{formatBytes(result.totalBytes)}</span>
        <span className="tk-stat-label">Totaal</span>
      </div>
      <div className="tk-stat">
        <span className="tk-stat-value">{formatBytes(result.duplicates.reclaimable)}</span>
        <span className="tk-stat-label">Duplicaten terug te winnen</span>
      </div>
    </div>
  )
}

export default DiskCleaner
