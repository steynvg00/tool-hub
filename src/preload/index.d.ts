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
export type SortMode = 'name' | 'recent'
export type DirEntry = {
  name: string
  path: string
  isDirectory: boolean
  type: string
  mtime?: number
}
export type Shortcut = { label: string; path: string }
export type BrowserState = { pinned: string[]; lastDir: string | null; sort: SortMode }
export type FileBytes = { name: string; type: string; data: Uint8Array }

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
  browser: {
    shortcuts: () => Promise<Shortcut[]>
    list: (path: string, sort: SortMode) => Promise<{ path: string; entries: DirEntry[] }>
    setSort: (sort: SortMode) => Promise<void>
    read: (path: string) => Promise<FileBytes>
    thumbnail: (path: string) => Promise<Uint8Array | null>
    getState: () => Promise<BrowserState>
    setLastDir: (path: string) => Promise<void>
    unpin: (path: string) => Promise<string[]>
    pinViaDialog: () => Promise<string[]>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: ToolHubAPI
  }
}
