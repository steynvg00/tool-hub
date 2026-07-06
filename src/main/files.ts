import { app } from 'electron'
import { join, extname, basename } from 'path'
import { readFile, writeFile, copyFile, mkdir, stat, readdir, unlink } from 'fs/promises'

// A file the user has collected into the "Bestanden" panel. The bytes are
// copied into userData so the collection survives restarts and can be re-loaded
// into any tool. The shape carries `pinned` + timestamps so a future bulk/multi
// selection can build on the same records without a migration.
export interface CollectedFile {
  id: string
  name: string
  type: string // mime
  size: number
  addedAt: number
  pinned: boolean
}

interface StoredFile extends CollectedFile {
  stored: string // filename inside filesDir (not exposed to the renderer)
}

// Keep the recent (non-pinned) list bounded; pinned files are never evicted.
const MAX_RECENT = 60

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.json': 'application/json',
  '.csv': 'text/csv',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.ogg': 'audio/ogg',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.mkv': 'video/x-matroska',
  '.webm': 'video/webm',
  '.zip': 'application/zip'
}

function mimeFor(name: string): string {
  return MIME[extname(name).toLowerCase()] ?? 'application/octet-stream'
}

function filesDir(): string {
  return join(app.getPath('userData'), 'collected-files')
}

function indexFile(): string {
  return join(app.getPath('userData'), 'collected-files.json')
}

async function readIndex(): Promise<StoredFile[]> {
  try {
    const raw = await readFile(indexFile(), 'utf-8')
    const data = JSON.parse(raw)
    return Array.isArray(data?.files) ? data.files : []
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw err
  }
}

async function writeIndex(files: StoredFile[]): Promise<void> {
  await writeFile(indexFile(), JSON.stringify({ files }, null, 2), 'utf-8')
}

/** Pinned first, then most-recent first. The renderer never sees `stored`. */
function toPublic(files: StoredFile[]): CollectedFile[] {
  return [...files]
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.addedAt - a.addedAt)
    .map(({ stored: _stored, ...rest }) => rest)
}

export async function listFiles(): Promise<CollectedFile[]> {
  return toPublic(await readIndex())
}

function newId(): string {
  return `f-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

// Expand any directories one level deep into their contained files.
async function expandPaths(paths: string[]): Promise<string[]> {
  const out: string[] = []
  for (const p of paths) {
    try {
      const s = await stat(p)
      if (s.isDirectory()) {
        for (const entry of await readdir(p)) {
          const child = join(p, entry)
          try {
            if ((await stat(child)).isFile()) out.push(child)
          } catch {
            /* skip unreadable entry */
          }
        }
      } else if (s.isFile()) {
        out.push(p)
      }
    } catch {
      /* skip unreadable path */
    }
  }
  return out
}

async function evictOverflow(files: StoredFile[]): Promise<StoredFile[]> {
  const pinned = files.filter((f) => f.pinned)
  const recent = files.filter((f) => !f.pinned).sort((a, b) => b.addedAt - a.addedAt)
  const keep = recent.slice(0, MAX_RECENT)
  for (const dropped of recent.slice(MAX_RECENT)) {
    try {
      await unlink(join(filesDir(), dropped.stored))
    } catch {
      /* already gone */
    }
  }
  return [...pinned, ...keep]
}

/** Copy the given files/directories into the collection. Returns the new list. */
export async function addFiles(paths: string[]): Promise<CollectedFile[]> {
  await mkdir(filesDir(), { recursive: true })
  const files = await readIndex()
  const expanded = await expandPaths(paths)
  for (const src of expanded) {
    try {
      const s = await stat(src)
      const name = basename(src)
      const id = newId()
      const stored = `${id}${extname(name)}`
      await copyFile(src, join(filesDir(), stored))
      files.push({
        id,
        name,
        type: mimeFor(name),
        size: s.size,
        addedAt: Date.now(),
        pinned: false,
        stored
      })
    } catch {
      /* skip files we couldn't copy */
    }
  }
  const trimmed = await evictOverflow(files)
  await writeIndex(trimmed)
  return toPublic(trimmed)
}

export async function removeFile(id: string): Promise<CollectedFile[]> {
  const files = await readIndex()
  const target = files.find((f) => f.id === id)
  if (target) {
    try {
      await unlink(join(filesDir(), target.stored))
    } catch {
      /* already gone */
    }
  }
  const next = files.filter((f) => f.id !== id)
  await writeIndex(next)
  return toPublic(next)
}

export async function setPinned(id: string, pinned: boolean): Promise<CollectedFile[]> {
  const files = await readIndex()
  const target = files.find((f) => f.id === id)
  if (target) target.pinned = pinned
  await writeIndex(files)
  return toPublic(files)
}

/** Raw bytes of a collected file, for thumbnails and dragging into a tool. */
export async function readFileBytes(
  id: string
): Promise<{ name: string; type: string; data: Buffer } | null> {
  const files = await readIndex()
  const target = files.find((f) => f.id === id)
  if (!target) return null
  const data = await readFile(join(filesDir(), target.stored))
  return { name: target.name, type: target.type, data }
}
