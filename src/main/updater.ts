import { app, dialog, BrowserWindow, MessageBoxOptions } from 'electron'
import electronUpdater from 'electron-updater'

// electron-updater is CommonJS; destructure autoUpdater for ESM interop.
// See https://github.com/electron-userland/electron-builder/issues/7976
const { autoUpdater } = electronUpdater

// Whether the in-progress check was triggered by the user (so we give feedback
// even when there's no update / an error) vs. the silent check at startup.
let manualCheck = false
let initialized = false

function log(...args: unknown[]): void {
  console.log('[updater]', ...args)
}

function showDialog(options: MessageBoxOptions): Promise<Electron.MessageBoxReturnValue> {
  const win = BrowserWindow.getAllWindows()[0]
  return win ? dialog.showMessageBox(win, options) : dialog.showMessageBox(options)
}

/**
 * Wire up autoUpdater once and run a silent check. Only active in a packaged
 * app — during `npm run dev` there is no app-update.yml, so we no-op.
 */
export function initAutoUpdater(): void {
  if (!app.isPackaged || initialized) return
  initialized = true

  // Download a found update automatically, but never install it silently — the
  // app isn't code-signed, so installing happens only after the user agrees.
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = false

  autoUpdater.on('checking-for-update', () => log('checking for update'))
  autoUpdater.on('update-available', (info) => log('update available:', info.version))
  autoUpdater.on('download-progress', (p) => log(`downloading ${Math.round(p.percent)}%`))

  autoUpdater.on('update-not-available', () => {
    log('no update available')
    if (manualCheck) {
      manualCheck = false
      showDialog({
        type: 'info',
        title: 'Geen updates',
        message: 'Je gebruikt al de nieuwste versie van Tool Hub.',
        buttons: ['OK']
      })
    }
  })

  autoUpdater.on('update-downloaded', async (info) => {
    manualCheck = false
    log('update downloaded:', info.version)
    const { response } = await showDialog({
      type: 'info',
      title: 'Update gereed',
      message: `Nieuwe versie ${info.version} is gedownload.`,
      detail: 'Wil je Tool Hub nu herstarten om de update te installeren?',
      buttons: ['Nu herstarten', 'Later'],
      defaultId: 0,
      cancelId: 1
    })
    if (response === 0) {
      // Let the dialog close before quitting.
      setImmediate(() => autoUpdater.quitAndInstall())
    }
  })

  autoUpdater.on('error', (err) => {
    log('error:', err?.message ?? err)
    if (manualCheck) {
      manualCheck = false
      showDialog({
        type: 'error',
        title: 'Update-fout',
        message: 'Kon niet op updates controleren.',
        detail: err?.message ?? String(err),
        buttons: ['OK']
      })
    }
  })

  // Swallow network errors so the app keeps working offline.
  autoUpdater.checkForUpdates().catch((err) => log('initial check failed:', err?.message ?? err))
}

/** Manually trigger an update check (from a button / menu item). */
export function checkForUpdatesManually(): void {
  if (!app.isPackaged) {
    showDialog({
      type: 'info',
      title: 'Updates',
      message: 'Updates zijn alleen beschikbaar in de geïnstalleerde app.',
      buttons: ['OK']
    })
    return
  }
  manualCheck = true
  autoUpdater.checkForUpdates().catch((err) => {
    manualCheck = false
    log('manual check failed:', err?.message ?? err)
    showDialog({
      type: 'error',
      title: 'Update-fout',
      message: 'Kon niet op updates controleren.',
      detail: err?.message ?? String(err),
      buttons: ['OK']
    })
  })
}
