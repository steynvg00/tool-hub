import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

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
export type DirEntry = { name: string; path: string; isDirectory: boolean; type: string }
export type Shortcut = { label: string; path: string }
export type BrowserState = { pinned: string[]; lastDir: string | null }
export type FileBytes = { name: string; type: string; data: Uint8Array }

// Custom APIs for renderer
const api = {
  backend: {
    /** Read the current sidecar status (useful right after the window loads). */
    getStatus: (): Promise<BackendStatus> => ipcRenderer.invoke('backend:get-status'),
    /** Subscribe to status changes; returns an unsubscribe function. */
    onStatus: (cb: (status: BackendStatus) => void): (() => void) => {
      const listener = (_: unknown, status: BackendStatus): void => cb(status)
      ipcRenderer.on('backend:status', listener)
      return () => ipcRenderer.removeListener('backend:status', listener)
    }
  },
  presets: {
    listUser: (): Promise<UserPreset[]> => ipcRenderer.invoke('presets:list-user'),
    saveUser: (preset: { name: string; steps: PresetStep[] }): Promise<UserPreset[]> =>
      ipcRenderer.invoke('presets:save-user', preset),
    deleteUser: (id: string): Promise<UserPreset[]> =>
      ipcRenderer.invoke('presets:delete-user', id)
  },
  updates: {
    check: (): Promise<void> => ipcRenderer.invoke('updates:check')
  },
  favorites: {
    list: (): Promise<string[]> => ipcRenderer.invoke('favorites:list'),
    toggle: (id: string): Promise<string[]> => ipcRenderer.invoke('favorites:toggle', id)
  },
  snippets: {
    list: (): Promise<Snippet[]> => ipcRenderer.invoke('snippets:list'),
    save: (input: { id?: string; label: string; text: string }): Promise<Snippet[]> =>
      ipcRenderer.invoke('snippets:save', input),
    delete: (id: string): Promise<Snippet[]> => ipcRenderer.invoke('snippets:delete', id)
  },
  network: {
    getLocalIps: (): Promise<string[]> => ipcRenderer.invoke('network:local-ips'),
    getPublicIp: (): Promise<string> => ipcRenderer.invoke('network:public-ip')
  },
  browser: {
    shortcuts: (): Promise<Shortcut[]> => ipcRenderer.invoke('browser:shortcuts'),
    list: (path: string): Promise<{ path: string; entries: DirEntry[] }> =>
      ipcRenderer.invoke('browser:list', path),
    read: (path: string): Promise<FileBytes> => ipcRenderer.invoke('browser:read', path),
    thumbnail: (path: string): Promise<Uint8Array | null> =>
      ipcRenderer.invoke('browser:thumbnail', path),
    getState: (): Promise<BrowserState> => ipcRenderer.invoke('browser:get-state'),
    setLastDir: (path: string): Promise<void> => ipcRenderer.invoke('browser:set-last-dir', path),
    unpin: (path: string): Promise<string[]> => ipcRenderer.invoke('browser:unpin', path),
    pinViaDialog: (): Promise<string[]> => ipcRenderer.invoke('browser:pin-dialog')
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
