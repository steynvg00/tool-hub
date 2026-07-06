import { app } from 'electron'
import { join } from 'path'
import { readFile, writeFile } from 'fs/promises'

/** Favourite tool ids, stored per-user in Electron's userData so they survive restarts. */
function favoritesFile(): string {
  return join(app.getPath('userData'), 'favorites.json')
}

async function persist(ids: string[]): Promise<void> {
  await writeFile(favoritesFile(), JSON.stringify({ favorites: ids }, null, 2), 'utf-8')
}

export async function listFavorites(): Promise<string[]> {
  try {
    const raw = await readFile(favoritesFile(), 'utf-8')
    const data = JSON.parse(raw)
    return Array.isArray(data?.favorites)
      ? data.favorites.filter((x: unknown): x is string => typeof x === 'string')
      : []
  } catch (err) {
    // First run: the file simply doesn't exist yet.
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw err
  }
}

/** Add or remove a tool id from favourites; returns the updated list. */
export async function toggleFavorite(id: string): Promise<string[]> {
  const current = await listFavorites()
  const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
  await persist(next)
  return next
}
