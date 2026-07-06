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
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: ToolHubAPI
  }
}
