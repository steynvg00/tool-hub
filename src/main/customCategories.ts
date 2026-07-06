import { app } from 'electron'
import { join } from 'path'
import { readFile, writeFile } from 'fs/promises'

/** User-added randomizer categories, stored per-user in Electron's userData. */
function categoriesFile(): string {
  return join(app.getPath('userData'), 'custom-categories.json')
}

async function persist(names: string[]): Promise<void> {
  await writeFile(categoriesFile(), JSON.stringify({ categories: names }, null, 2), 'utf-8')
}

export async function listCustomCategories(): Promise<string[]> {
  try {
    const raw = await readFile(categoriesFile(), 'utf-8')
    const data = JSON.parse(raw)
    return Array.isArray(data?.categories)
      ? data.categories.filter((x: unknown): x is string => typeof x === 'string')
      : []
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw err
  }
}

/** Add a category (deduped, trimmed); returns the updated list. */
export async function addCustomCategory(name: string): Promise<string[]> {
  const clean = name.trim()
  const current = await listCustomCategories()
  if (!clean || current.some((c) => c.toLowerCase() === clean.toLowerCase())) return current
  const next = [...current, clean]
  await persist(next)
  return next
}

export async function removeCustomCategory(name: string): Promise<string[]> {
  const next = (await listCustomCategories()).filter((c) => c !== name)
  await persist(next)
  return next
}
