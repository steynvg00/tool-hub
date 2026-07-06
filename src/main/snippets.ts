import { app } from 'electron'
import { join } from 'path'
import { readFile, writeFile } from 'fs/promises'

export interface Snippet {
  id: string
  label: string
  text: string
  updatedAt: number
}

/** User-saved text snippets, stored per-user in Electron's userData. */
function snippetsFile(): string {
  return join(app.getPath('userData'), 'snippets.json')
}

async function persist(snippets: Snippet[]): Promise<void> {
  await writeFile(snippetsFile(), JSON.stringify({ snippets }, null, 2), 'utf-8')
}

export async function listSnippets(): Promise<Snippet[]> {
  try {
    const raw = await readFile(snippetsFile(), 'utf-8')
    const data = JSON.parse(raw)
    return Array.isArray(data?.snippets) ? data.snippets : []
  } catch (err) {
    // First run: the file simply doesn't exist yet.
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw err
  }
}

/**
 * Create a new snippet (no `id`) or update an existing one (matching `id`).
 * Returns the full updated snippet array, newest first.
 */
export async function saveSnippet(input: {
  id?: string
  label: string
  text: string
}): Promise<Snippet[]> {
  const snippets = await listSnippets()
  const label = input.label.trim() || 'Snippet'
  const text = input.text
  const now = Date.now()

  if (input.id) {
    const idx = snippets.findIndex((s) => s.id === input.id)
    if (idx >= 0) {
      snippets[idx] = { id: input.id, label, text, updatedAt: now }
      snippets.sort((a, b) => b.updatedAt - a.updatedAt)
      await persist(snippets)
      return snippets
    }
  }

  const id = `snip-${now.toString(36)}-${Math.random().toString(36).slice(2, 7)}`
  snippets.push({ id, label, text, updatedAt: now })
  snippets.sort((a, b) => b.updatedAt - a.updatedAt)
  await persist(snippets)
  return snippets
}

export async function deleteSnippet(id: string): Promise<Snippet[]> {
  const snippets = (await listSnippets()).filter((s) => s.id !== id)
  await persist(snippets)
  return snippets
}
