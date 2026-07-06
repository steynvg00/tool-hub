import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import {
  startPythonServer,
  stopPythonServer,
  BACKEND_URL
} from './pythonServer'
import {
  listUserPresets,
  saveUserPreset,
  deleteUserPreset,
  type PresetStep
} from './userPresets'
import { initAutoUpdater, checkForUpdatesManually } from './updater'
import { listFavorites, toggleFavorite } from './favorites'
import {
  listCustomCategories,
  addCustomCategory,
  removeCustomCategory
} from './customCategories'
import { listSnippets, saveSnippet, deleteSnippet } from './snippets'
import { getLocalIps, getPublicIp } from './network'
import {
  shortcuts as browserShortcuts,
  listDir,
  readFileBytes,
  thumbnail,
  getState as getBrowserState,
  pinDir,
  unpinDir,
  setLastDir,
  setSort as setBrowserSort,
  cleanupLegacyCollectedFiles,
  type SortMode
} from './browser'
import {
  shortcuts as diskShortcuts,
  scan as diskScan,
  cancelScan as diskCancelScan,
  trash as diskTrash,
  isSafeRoot,
  type ScanOptions
} from './diskCleaner'

// Tracks the sidecar lifecycle so the renderer can show a loading / error gate.
type BackendStatus = {
  state: 'starting' | 'ready' | 'error'
  baseUrl: string
  error?: string
}

let backendStatus: BackendStatus = { state: 'starting', baseUrl: BACKEND_URL }

function setBackendStatus(status: BackendStatus): void {
  backendStatus = status
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('backend:status', backendStatus)
  }
}

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    title: 'Tool Hub',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // Keep the window title fixed to "Tool Hub" instead of the document <title>.
  mainWindow.on('page-title-updated', (e) => e.preventDefault())

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // Let a freshly-loaded renderer read the current backend status on demand.
  ipcMain.handle('backend:get-status', () => backendStatus)

  // User presets live in userData and are managed here (never in presets.json).
  ipcMain.handle('presets:list-user', () => listUserPresets())
  ipcMain.handle('presets:save-user', (_e, preset: { name: string; steps: PresetStep[] }) =>
    saveUserPreset(preset)
  )
  ipcMain.handle('presets:delete-user', (_e, id: string) => deleteUserPreset(id))

  // Manual "check for updates" trigger from the renderer.
  ipcMain.handle('updates:check', () => checkForUpdatesManually())

  // Favourite tools, persisted in userData.
  ipcMain.handle('favorites:list', () => listFavorites())
  ipcMain.handle('favorites:toggle', (_e, id: string) => toggleFavorite(id))

  // User-added randomizer categories, persisted in userData.
  ipcMain.handle('categories:list', () => listCustomCategories())
  ipcMain.handle('categories:add', (_e, name: string) => addCustomCategory(name))
  ipcMain.handle('categories:remove', (_e, name: string) => removeCustomCategory(name))

  // User-saved text snippets, persisted in userData.
  ipcMain.handle('snippets:list', () => listSnippets())
  ipcMain.handle('snippets:save', (_e, input: { id?: string; label: string; text: string }) =>
    saveSnippet(input)
  )
  ipcMain.handle('snippets:delete', (_e, id: string) => deleteSnippet(id))

  // Network lookups run here (main process) to bypass the renderer CSP.
  ipcMain.handle('network:local-ips', () => getLocalIps())
  ipcMain.handle('network:public-ip', () => getPublicIp())

  // Live filesystem browser for the "Bestanden" panel. Nothing is copied.
  ipcMain.handle('browser:shortcuts', () => browserShortcuts())
  ipcMain.handle('browser:list', (_e, path: string, sort: SortMode) => listDir(path, sort))
  ipcMain.handle('browser:set-sort', (_e, sort: SortMode) => setBrowserSort(sort))
  ipcMain.handle('browser:read', (_e, path: string) => readFileBytes(path))
  ipcMain.handle('browser:thumbnail', (_e, path: string) => thumbnail(path))
  ipcMain.handle('browser:get-state', () => getBrowserState())
  ipcMain.handle('browser:set-last-dir', (_e, path: string) => setLastDir(path))
  ipcMain.handle('browser:unpin', (_e, path: string) => unpinDir(path))
  ipcMain.handle('browser:pin-dialog', async () => {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    const res = await dialog.showOpenDialog(win, {
      title: 'Map vastpinnen',
      properties: ['openDirectory']
    })
    const state = await getBrowserState()
    if (res.canceled || res.filePaths.length === 0) return state.pinned
    return pinDir(res.filePaths[0])
  })

  // Best-effort removal of the previous copy-based collection.
  cleanupLegacyCollectedFiles()

  // Disk cleaner — the only feature that can remove files (to Trash only).
  ipcMain.handle('disk:shortcuts', () => diskShortcuts())
  ipcMain.handle('disk:pick-dir', async () => {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    const res = await dialog.showOpenDialog(win, {
      title: 'Map om op te ruimen',
      properties: ['openDirectory']
    })
    if (res.canceled || res.filePaths.length === 0) return null
    const dir = res.filePaths[0]
    return isSafeRoot(dir) ? dir : { error: 'buiten-home' }
  })
  ipcMain.handle('disk:scan', (event, root: string, opts: ScanOptions) =>
    diskScan(root, opts, (p) => event.sender.send('disk:scan-progress', p))
  )
  ipcMain.handle('disk:cancel-scan', () => diskCancelScan())
  ipcMain.handle('disk:trash', (_e, root: string, paths: string[]) => diskTrash(root, paths))

  createWindow()

  // Start the Python sidecar and wait for /health, then tell the renderer.
  startPythonServer()
    .then(() => setBackendStatus({ state: 'ready', baseUrl: BACKEND_URL }))
    .catch((err: Error) => {
      console.error('[backend] failed to start:', err)
      setBackendStatus({ state: 'error', baseUrl: BACKEND_URL, error: err.message })
    })

  // Check for app updates (no-op in dev; prompts to open the release page in production).
  initAutoUpdater()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Tear the sidecar down on every shutdown path we can hook, so it never
// outlives the app. before-quit/will-quit cover the normal GUI quit; the signal
// handlers cover dev (Ctrl+C) and OS termination; process exit is the backstop.
// Anything that still slips through (a hard crash) is cleaned by freeStalePort()
// on the next startup.
app.on('before-quit', () => stopPythonServer())
app.on('will-quit', () => stopPythonServer())
process.on('exit', () => stopPythonServer())
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) {
  process.on(sig, () => {
    stopPythonServer()
    app.quit()
  })
}
