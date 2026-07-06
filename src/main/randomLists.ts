import { app } from 'electron'
import { join } from 'path'
import { readFile, writeFile } from 'fs/promises'

export interface CustomRandomList {
  id: string
  name: string
  items: string[]
}

/** User-defined randomizer lists, stored per-user in Electron's userData. */
function listsFile(): string {
  return join(app.getPath('userData'), 'random-lists.json')
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function persist(lists: CustomRandomList[]): Promise<void> {
  await writeFile(listsFile(), JSON.stringify({ lists }, null, 2), 'utf-8')
}

export async function listCustomRandomLists(): Promise<CustomRandomList[]> {
  try {
    const raw = await readFile(listsFile(), 'utf-8')
    const data = JSON.parse(raw)
    return Array.isArray(data?.lists) ? data.lists : []
  } catch (err) {
    // First run: the file simply doesn't exist yet.
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw err
  }
}

/**
 * Create a new list (no `id`) or update an existing one (matching `id`).
 * Returns the full updated list array.
 */
export async function saveCustomRandomList(input: {
  id?: string
  name: string
  items: string[]
}): Promise<CustomRandomList[]> {
  const lists = await listCustomRandomLists()
  const name = input.name.trim() || 'Lijst'
  const items = input.items.map((s) => s.trim()).filter(Boolean)

  if (input.id) {
    const idx = lists.findIndex((l) => l.id === input.id)
    if (idx >= 0) {
      lists[idx] = { id: input.id, name, items }
      await persist(lists)
      return lists
    }
  }

  // Derive a stable, collision-free id from the name.
  const base = slugify(name) || 'lijst'
  const taken = new Set(lists.map((l) => l.id))
  let id = base
  let n = 2
  while (taken.has(id)) id = `${base}-${n++}`

  lists.push({ id, name, items })
  await persist(lists)
  return lists
}

export async function deleteCustomRandomList(id: string): Promise<CustomRandomList[]> {
  const lists = (await listCustomRandomLists()).filter((l) => l.id !== id)
  await persist(lists)
  return lists
}
