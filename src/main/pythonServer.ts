import { spawn, ChildProcess } from 'child_process'
import { join } from 'path'
import { existsSync } from 'fs'
import { app } from 'electron'
import http from 'http'

export const BACKEND_HOST = '127.0.0.1'
export const BACKEND_PORT = 8756
export const BACKEND_URL = `http://${BACKEND_HOST}:${BACKEND_PORT}`

let child: ChildProcess | null = null
let stopping = false

interface BackendCommand {
  command: string
  args: string[]
  cwd: string
}

/**
 * How to launch the sidecar.
 * - Packaged: run the self-contained PyInstaller binary shipped under
 *   resources/backend, passing the port as the first CLI argument. No python,
 *   venv or pip involved.
 * - Dev: run uvicorn from the project's .venv, exactly as during development.
 */
function resolveBackendCommand(): BackendCommand {
  if (app.isPackaged) {
    const dir = join(process.resourcesPath, 'backend')
    const exe = process.platform === 'win32' ? 'toolhub-backend.exe' : 'toolhub-backend'
    return {
      command: join(dir, exe),
      args: [String(BACKEND_PORT)],
      cwd: dir
    }
  }

  const backendDir = join(app.getAppPath(), 'python-backend')
  const uvicorn = join(
    backendDir,
    '.venv',
    process.platform === 'win32' ? 'Scripts/uvicorn.exe' : 'bin/uvicorn'
  )
  return {
    command: uvicorn,
    args: ['main:app', '--host', BACKEND_HOST, '--port', String(BACKEND_PORT)],
    cwd: backendDir
  }
}

/** Poll GET /health until it returns {"status":"ok"} or we time out. */
function waitForHealth(timeoutMs = 30_000, intervalMs = 300): Promise<void> {
  const deadline = Date.now() + timeoutMs

  return new Promise((resolve, reject) => {
    const attempt = (): void => {
      if (stopping) {
        reject(new Error('Backend startup aborted'))
        return
      }

      const req = http.get(`${BACKEND_URL}/health`, { timeout: 2000 }, (res) => {
        let body = ''
        res.on('data', (chunk) => (body += chunk))
        res.on('end', () => {
          try {
            if (res.statusCode === 200 && JSON.parse(body)?.status === 'ok') {
              resolve()
              return
            }
          } catch {
            // not JSON yet — treat as not-ready
          }
          retry()
        })
      })

      req.on('error', retry)
      req.on('timeout', () => req.destroy())
    }

    const retry = (): void => {
      if (Date.now() >= deadline) {
        reject(new Error(`Backend did not become healthy within ${timeoutMs}ms`))
        return
      }
      setTimeout(attempt, intervalMs)
    }

    attempt()
  })
}

/**
 * Start the FastAPI sidecar as a child process and resolve once /health is ok.
 * Throws if the executable is missing, the process exits early, or health times out.
 */
export async function startPythonServer(): Promise<void> {
  if (child) return

  const { command, args, cwd } = resolveBackendCommand()

  if (!existsSync(command)) {
    throw new Error(
      app.isPackaged
        ? `Backend binary not found at ${command}`
        : `uvicorn not found at ${command}. Create the venv: cd python-backend && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`
    )
  }

  stopping = false
  child = spawn(command, args, {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    // The sidecar should shut down on SIGTERM; no reload workers.
    env: { ...process.env, PYTHONUNBUFFERED: '1' }
  })

  child.stdout?.on('data', (d) => process.stdout.write(`[backend] ${d}`))
  child.stderr?.on('data', (d) => process.stderr.write(`[backend] ${d}`))

  // If the process dies unexpectedly, clear our handle so a restart is possible.
  const exited = new Promise<never>((_, reject) => {
    child?.once('exit', (code, signal) => {
      const wasStopping = stopping
      child = null
      if (!wasStopping) {
        reject(new Error(`Backend exited early (code=${code}, signal=${signal})`))
      }
    })
    child?.once('error', (err) => {
      child = null
      reject(err)
    })
  })

  // Whichever settles first: health OK, or the process falling over.
  await Promise.race([waitForHealth(), exited])
}

/** Terminate the sidecar gracefully. Safe to call multiple times. */
export function stopPythonServer(): void {
  if (!child) return
  stopping = true
  const proc = child
  child = null

  proc.kill('SIGTERM')

  // Escalate to SIGKILL if it refuses to exit in time.
  const killTimer = setTimeout(() => {
    if (!proc.killed) proc.kill('SIGKILL')
  }, 5000)
  killTimer.unref?.()
  proc.once('exit', () => clearTimeout(killTimer))
}
