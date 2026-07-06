import { app } from 'electron'
import { join } from 'path'
import { readFile, writeFile } from 'fs/promises'

export interface PresetStep {
  type: string
  params: Record<string, unknown>
}

export interface UserPreset {
  id: string
  name: string
  description?: string
  steps: PresetStep[]
}

/** User presets are stored per-user in Electron's userData, never in the bundled presets.json. */
function presetsFile(): string {
  return join(app.getPath('userData'), 'user-presets.json')
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function persist(presets: UserPreset[]): Promise<void> {
  await writeFile(presetsFile(), JSON.stringify({ presets }, null, 2), 'utf-8')
}

export async function listUserPresets(): Promise<UserPreset[]> {
  try {
    const raw = await readFile(presetsFile(), 'utf-8')
    const data = JSON.parse(raw)
    return Array.isArray(data?.presets) ? data.presets : []
  } catch (err) {
    // First run: the file simply doesn't exist yet.
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw err
  }
}

export async function saveUserPreset(input: {
  name: string
  steps: PresetStep[]
}): Promise<UserPreset[]> {
  const presets = await listUserPresets()

  // Derive a stable, collision-free id from the name.
  const base = slugify(input.name) || 'preset'
  const taken = new Set(presets.map((p) => p.id))
  let id = base
  let n = 2
  while (taken.has(id)) id = `${base}-${n++}`

  presets.push({ id, name: input.name.trim(), steps: input.steps })
  await persist(presets)
  return presets
}

export async function deleteUserPreset(id: string): Promise<UserPreset[]> {
  const presets = (await listUserPresets()).filter((p) => p.id !== id)
  await persist(presets)
  return presets
}
