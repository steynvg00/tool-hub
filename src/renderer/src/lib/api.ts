// Thin client for the Python FastAPI sidecar.

const BASE_URL = 'http://127.0.0.1:8756'

// --- Shapes returned by GET /steps -----------------------------------------

export type ParamType = 'number' | 'select' | 'bool' | 'point_list' | 'color' | 'rect'

export interface ParamSpec {
  type: ParamType
  default: unknown
  min?: number
  max?: number
  options?: string[]
  help?: string
}

export interface StepDef {
  type: string
  category: 'generator' | 'modifier'
  label: string
  params: Record<string, ParamSpec>
}

// --- A configured step inside the user's pipeline --------------------------

export interface PipelineStep {
  id: string
  type: string
  params: Record<string, unknown>
}

// --- Presets (GET /presets, built-in) --------------------------------------

export interface PresetStep {
  type: string
  params: Record<string, unknown>
}

export interface Preset {
  id: string
  name: string
  description?: string
  steps: PresetStep[]
}

// --- Response of POST /background/remove -----------------------------------

export interface StepPreview {
  type: string
  preview: string // base64 PNG (no data: prefix)
}

export interface RemoveResult {
  final: string // base64 PNG
  steps: StepPreview[]
}

/** Turn a base64 PNG payload from the backend into a usable data URL. */
export function pngDataUrl(base64: string): string {
  return `data:image/png;base64,${base64}`
}

export async function fetchSteps(): Promise<StepDef[]> {
  const res = await fetch(`${BASE_URL}/steps`)
  if (!res.ok) throw new Error(`GET /steps failed: ${res.status}`)
  const data = await res.json()
  return data.steps as StepDef[]
}

export async function fetchPresets(): Promise<Preset[]> {
  const res = await fetch(`${BASE_URL}/presets`)
  if (!res.ok) throw new Error(`GET /presets failed: ${res.status}`)
  const data = await res.json()
  return (data.presets ?? []) as Preset[]
}

export async function removeBackground(
  image: File,
  pipeline: PipelineStep[],
  intermediates = true
): Promise<RemoveResult> {
  const form = new FormData()
  form.append('image', image)
  // The backend wants a JSON string of {type, params} objects (no client id).
  form.append(
    'pipeline',
    JSON.stringify(pipeline.map(({ type, params }) => ({ type, params })))
  )
  form.append('intermediates', String(intermediates))

  const res = await fetch(`${BASE_URL}/background/remove`, {
    method: 'POST',
    body: form
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data?.error ?? `POST /background/remove failed: ${res.status}`)
  }
  return data as RemoveResult
}
