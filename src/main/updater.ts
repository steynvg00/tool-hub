import { app, dialog, shell, BrowserWindow, MessageBoxOptions } from 'electron'
import electronUpdater, { type UpdateInfo } from 'electron-updater'

// electron-updater is CommonJS; destructure autoUpdater for ESM interop.
// See https://github.com/electron-userland/electron-builder/issues/7976
const { autoUpdater } = electronUpdater

// GitHub repo that hosts the releases (see electron-builder.yml `publish`).
const GITHUB_OWNER = 'steynvg00'
const GITHUB_REPO = 'tool-hub'

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

// Page that lists the downloadable assets (.dmg) for a given release. The app
// isn't code-signed, so electron-updater can't self-install on macOS
// ("Could not get code signature for running application"). Instead we send the
// user here to download and install the update by hand.
function releaseUrl(version: string): string {
  return `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/tag/v${version}`
}

/**
 * Notify the user that an update exists and offer to open the release page in
 * the browser, where they can download the .dmg and install it manually.
 */
async function promptToDownload(info: UpdateInfo): Promise<void> {
  manualCheck = false
  const { response } = await showDialog({
    type: 'info',
    title: 'Update beschikbaar',
    message: `Versie ${info.version} is beschikbaar.`,
    detail:
      'Open de downloadpagina om de nieuwe versie te downloaden en te installeren. ' +
      'Sleep daarna Tool Hub opnieuw naar je Programma’s-map.',
    buttons: ['Download openen', 'Later'],
    defaultId: 0,
    cancelId: 1
  })
  if (response === 0) {
    shell.openExternal(releaseUrl(info.version))
  }
}

/**
 * Wire up autoUpdater once and run a silent check. Only active in a packaged
 * app — during `npm run dev` there is no app-update.yml, so we no-op.
 */
export function initAutoUpdater(): void {
  if (!app.isPackaged || initialized) return
  initialized = true

  // Don't download or install anything automatically: the app isn't
  // code-signed, so electron-updater's self-install fails on macOS. We only
  // check for updates and point the user at the release page to install by hand.
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false

  autoUpdater.on('checking-for-update', () => log('checking for update'))

  autoUpdater.on('update-available', (info) => {
    log('update available:', info.version)
    void promptToDownload(info)
  })

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
