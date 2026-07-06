import { app, shell, BrowserWindow, ipcMain } from 'electron'
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
  listCustomRandomLists,
  saveCustomRandomList,
  deleteCustomRandomList
} from './randomLists'
import { listSnippets, saveSnippet, deleteSnippet } from './snippets'
import { getLocalIps, getPublicIp } from './network'

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

  // User-defined randomizer lists, persisted in userData.
  ipcMain.handle('random-lists:list', () => listCustomRandomLists())
  ipcMain.handle('random-lists:save', (_e, input: { id?: string; name: string; items: string[] }) =>
    saveCustomRandomList(input)
  )
  ipcMain.handle('random-lists:delete', (_e, id: string) => deleteCustomRandomList(id))

  // User-saved text snippets, persisted in userData.
  ipcMain.handle('snippets:list', () => listSnippets())
  ipcMain.handle('snippets:save', (_e, input: { id?: string; label: string; text: string }) =>
    saveSnippet(input)
  )
  ipcMain.handle('snippets:delete', (_e, id: string) => deleteSnippet(id))

  // Network lookups run here (main process) to bypass the renderer CSP.
  ipcMain.handle('network:local-ips', () => getLocalIps())
  ipcMain.handle('network:public-ip', () => getPublicIp())

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

// Tear the sidecar down gracefully before the app exits.
app.on('before-quit', () => {
  stopPythonServer()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
