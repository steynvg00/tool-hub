import { ElectronAPI } from '@electron-toolkit/preload'

export type BackendStatus = {
  state: 'starting' | 'ready' | 'error'
  baseUrl: string
  error?: string
}

export type PresetStep = { type: string; params: Record<string, unknown> }
export type UserPreset = {
  id: string
  name: string
  description?: string
  steps: PresetStep[]
}
export type Snippet = { id: string; label: string; text: string; updatedAt: number }
export type CollectedFile = {
  id: string
  name: string
  type: string
  size: number
  addedAt: number
  pinned: boolean
}
export type CollectedFileBytes = { name: string; type: string; data: Uint8Array }

export interface ToolHubAPI {
  backend: {
    getStatus: () => Promise<BackendStatus>
    onStatus: (cb: (status: BackendStatus) => void) => () => void
  }
  presets: {
    listUser: () => Promise<UserPreset[]>
    saveUser: (preset: { name: string; steps: PresetStep[] }) => Promise<UserPreset[]>
    deleteUser: (id: string) => Promise<UserPreset[]>
  }
  updates: {
    check: () => Promise<void>
  }
  favorites: {
    list: () => Promise<string[]>
    toggle: (id: string) => Promise<string[]>
  }
  snippets: {
    list: () => Promise<Snippet[]>
    save: (input: { id?: string; label: string; text: string }) => Promise<Snippet[]>
    delete: (id: string) => Promise<Snippet[]>
  }
  network: {
    getLocalIps: () => Promise<string[]>
    getPublicIp: () => Promise<string>
  }
  files: {
    list: () => Promise<CollectedFile[]>
    addViaDialog: () => Promise<CollectedFile[]>
    addPaths: (paths: string[]) => Promise<CollectedFile[]>
    remove: (id: string) => Promise<CollectedFile[]>
    setPinned: (id: string, pinned: boolean) => Promise<CollectedFile[]>
    read: (id: string) => Promise<CollectedFileBytes | null>
    getPathForFile: (file: File) => string
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: ToolHubAPI
  }
}
