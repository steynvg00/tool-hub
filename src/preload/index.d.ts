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
export type CustomRandomList = { id: string; name: string; items: string[] }

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
  randomLists: {
    list: () => Promise<CustomRandomList[]>
    save: (input: { id?: string; name: string; items: string[] }) => Promise<CustomRandomList[]>
    delete: (id: string) => Promise<CustomRandomList[]>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: ToolHubAPI
  }
}
