import { app, shell } from 'electron'
import { join, extname, sep } from 'path'
import { existsSync, createReadStream } from 'fs'
import { readdir, stat } from 'fs/promises'
import { createHash } from 'crypto'

// The ONLY tool that can remove real files. Every safeguard lives here:
//  - all access is under the user's home dir; system paths are hard-denied;
//  - symlinks are never followed (can't escape the tree);
//  - ~/Library is skipped except its Caches subfolder;
//  - deletion is ALWAYS shell.trashItem (recoverable) — never fs.unlink.

export interface FileEntry {
  path: string
  name: string
  size: number
  mtime: number
  ext: string
}

export interface DupGroup {
  size: number
  hash: string
  files: FileEntry[]
  reclaimable: number
}

export interface Group {
  count: number
  bytes: number
  files: FileEntry[]
  truncated: boolean
}

export interface ScanResult {
  root: string
  totalFiles: number
  totalBytes: number
  largest: Group
  videos: Group
  old: Group
  caches: Group
  duplicates: { count: number; reclaimable: number; groups: DupGroup[]; truncated: boolean }
}

export interface ScanOptions {
  oldMonths: number
  videoMinMb: number
}

export interface ScanProgress {
  phase: 'walk' | 'hash'
  files: number
  bytes: number
  hashed?: number
  toHash?: number
}

const HOME = app.getPath('home')
const CACHES = join(HOME, 'Library', 'Caches')
const VIDEO_EXT = new Set([
  '.mp4', '.mov', '.mkv', '.avi', '.webm', '.m4v', '.wmv', '.flv', '.mpg', '.mpeg'
])
// Absolute prefixes that are never touched (belt-and-suspenders on top of the
// home-only rule). None of these live under a user's home dir.
const FORBIDDEN = [
  '/System', '/usr', '/bin', '/sbin', '/private/var', '/private/etc',
  '/Library', '/opt', '/Applications', '/cores', '/Volumes', '/Network'
]

const LARGEST_N = 60
const LIST_CAP = 400
const DUP_GROUP_CAP = 300
const DUP_FILE_CAP = 100

let cancelRequested = false
export function cancelScan(): void {
  cancelRequested = true
}

function withSep(p: string): string {
  return p.endsWith(sep) ? p : p + sep
}

/** A path is allowed only if it sits inside the user's home dir. */
export function isUnderHome(p: string): boolean {
  return p === HOME || p.startsWith(withSep(HOME))
}

function isForbidden(p: string): boolean {
  return FORBIDDEN.some((f) => p === f || p.startsWith(withSep(f)))
}

export function isSafeRoot(p: string): boolean {
  return isUnderHome(p) && !isForbidden(p) && existsSync(p)
}

/** Common starting points; only the ones that exist are returned. */
export function shortcuts(): { label: string; path: string }[] {
  const defs: [string, () => string][] = [
    ['Home', () => HOME],
    ['Downloads', () => app.getPath('downloads')],
    ['Bureaublad', () => app.getPath('desktop')],
    ['Documenten', () => app.getPath('documents')],
    ['App-caches', () => CACHES]
  ]
  const out: { label: string; path: string }[] = []
  for (const [label, get] of defs) {
    try {
      const p = get()
      if (existsSync(p)) out.push({ label, path: p })
    } catch {
      /* unavailable */
    }
  }
  return out
}

function sha256(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    const stream = createReadStream(path)
    stream.on('error', reject)
    stream.on('data', (d) => hash.update(d))
    stream.on('end', () => resolve(hash.digest('hex')))
  })
}

/** Walk the tree, collecting file metadata. Never follows symlinks or leaves home. */
async function walk(
  root: string,
  onProgress: (p: ScanProgress) => void
): Promise<FileEntry[]> {
  const files: FileEntry[] = []
  let bytes = 0
  const stack: string[] = [root]
  while (stack.length) {
    if (cancelRequested) throw new Error('cancelled')
    const dir = stack.pop() as string
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      continue // unreadable dir — skip
    }
    const isHomeLibrary = dir === join(HOME, 'Library')
    for (const e of entries) {
      if (e.isSymbolicLink()) continue // never follow links out of the tree
      if (e.name.startsWith('.')) continue // skip hidden/config files
      const full = join(dir, e.name)
      if (isForbidden(full)) continue
      if (e.isDirectory()) {
        // Inside ~/Library, only descend into Caches — never app data etc.
        if (isHomeLibrary && e.name !== 'Caches') continue
        stack.push(full)
      } else if (e.isFile()) {
        try {
          const st = await stat(full)
          files.push({
            path: full,
            name: e.name,
            size: st.size,
            mtime: st.mtimeMs,
            ext: extname(e.name).toLowerCase()
          })
          bytes += st.size
          if (files.length % 250 === 0) onProgress({ phase: 'walk', files: files.length, bytes })
        } catch {
          /* vanished / no permission */
        }
      }
    }
  }
  onProgress({ phase: 'walk', files: files.length, bytes })
  return files
}

function toGroup(all: FileEntry[], cap = LIST_CAP): Group {
  const bytes = all.reduce((s, f) => s + f.size, 0)
  return { count: all.length, bytes, files: all.slice(0, cap), truncated: all.length > cap }
}

/**
 * Detect duplicates cheaply: group by size first; only hash within size groups
 * of 2+ (a unique size can never be a duplicate → never hashed). Reclaimable
 * per group is size × (count − 1) — keeping one copy.
 */
async function findDuplicates(
  all: FileEntry[],
  onProgress: (p: ScanProgress) => void
): Promise<{ count: number; reclaimable: number; groups: DupGroup[]; truncated: boolean }> {
  const bySize = new Map<number, FileEntry[]>()
  for (const f of all) {
    if (f.size <= 0) continue
    const g = bySize.get(f.size)
    if (g) g.push(f)
    else bySize.set(f.size, [f])
  }
  const candidates = [...bySize.values()].filter((g) => g.length >= 2)
  const toHash = candidates.reduce((s, g) => s + g.length, 0)
  let hashed = 0

  const groups: DupGroup[] = []
  for (const sizeGroup of candidates) {
    const byHash = new Map<string, FileEntry[]>()
    for (const f of sizeGroup) {
      if (cancelRequested) throw new Error('cancelled')
      let h: string
      try {
        h = await sha256(f.path)
      } catch {
        hashed++
        continue // unreadable — can't confirm duplicate, skip it
      }
      hashed++
      if (hashed % 25 === 0) onProgress({ phase: 'hash', files: all.length, bytes: 0, hashed, toHash })
      const g = byHash.get(h)
      if (g) g.push(f)
      else byHash.set(h, [f])
    }
    for (const [h, dupFiles] of byHash) {
      if (dupFiles.length >= 2) {
        groups.push({
          size: dupFiles[0].size,
          hash: h.slice(0, 12),
          files: dupFiles.slice(0, DUP_FILE_CAP),
          reclaimable: dupFiles[0].size * (dupFiles.length - 1)
        })
      }
    }
  }
  groups.sort((a, b) => b.reclaimable - a.reclaimable)
  const reclaimable = groups.reduce((s, g) => s + g.reclaimable, 0)
  return {
    count: groups.length,
    reclaimable,
    groups: groups.slice(0, DUP_GROUP_CAP),
    truncated: groups.length > DUP_GROUP_CAP
  }
}

export async function scan(
  root: string,
  opts: ScanOptions,
  onProgress: (p: ScanProgress) => void
): Promise<ScanResult> {
  cancelRequested = false
  if (!isSafeRoot(root)) {
    throw new Error('Deze map ligt buiten je persoonlijke map en wordt om veiligheidsredenen niet gescand.')
  }
  const all = await walk(root, onProgress)

  const totalBytes = all.reduce((s, f) => s + f.size, 0)
  const oldCutoff = Date.now() - Math.max(1, opts.oldMonths) * 30 * 24 * 3600 * 1000
  const videoMin = Math.max(1, opts.videoMinMb) * 1024 * 1024

  const largest = toGroup([...all].sort((a, b) => b.size - a.size).slice(0, LARGEST_N), LARGEST_N)
  const videos = toGroup(
    all.filter((f) => VIDEO_EXT.has(f.ext) && f.size >= videoMin).sort((a, b) => b.size - a.size)
  )
  const old = toGroup(all.filter((f) => f.mtime < oldCutoff).sort((a, b) => a.mtime - b.mtime))
  const caches = toGroup(
    all.filter((f) => f.path === CACHES || f.path.startsWith(withSep(CACHES))).sort((a, b) => b.size - a.size)
  )
  const duplicates = await findDuplicates(all, onProgress)

  return { root, totalFiles: all.length, totalBytes, largest, videos, old, caches, duplicates }
}

/**
 * Move the given paths to the Trash (recoverable). Every path is re-validated:
 * it must live under the scanned root, under home, and outside forbidden dirs.
 * Nothing is ever hard-deleted.
 */
export async function trash(
  root: string,
  paths: string[]
): Promise<{ trashed: string[]; failed: { path: string; reason: string }[] }> {
  const trashed: string[] = []
  const failed: { path: string; reason: string }[] = []
  const rootPrefix = withSep(root)
  for (const p of paths) {
    if (!isUnderHome(p) || isForbidden(p) || !(p === root || p.startsWith(rootPrefix))) {
      failed.push({ path: p, reason: 'buiten de gescande map — geweigerd' })
      continue
    }
    if (!existsSync(p)) {
      failed.push({ path: p, reason: 'bestaat niet meer' })
      continue
    }
    try {
      await shell.trashItem(p)
      trashed.push(p)
    } catch (e) {
      failed.push({ path: p, reason: (e as Error).message })
    }
  }
  return { trashed, failed }
}
