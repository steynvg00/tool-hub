import { spawn, execSync, ChildProcess } from 'child_process'
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

/** PIDs currently listening on the backend port. */
function pidsOnPort(): number[] {
  try {
    if (process.platform === 'win32') {
      const out = execSync('netstat -ano -p tcp', { encoding: 'utf-8' })
      const pids = new Set<number>()
      for (const line of out.split(/\r?\n/)) {
        if (line.includes(`:${BACKEND_PORT}`) && /LISTENING/i.test(line)) {
          const pid = Number(line.trim().split(/\s+/).pop())
          if (pid) pids.add(pid)
        }
      }
      return [...pids]
    }
    const out = execSync(`lsof -ti tcp:${BACKEND_PORT} -sTCP:LISTEN`, { encoding: 'utf-8' }).trim()
    return out ? out.split(/\s+/).map(Number).filter(Boolean) : []
  } catch {
    // lsof/netstat exit non-zero when nothing is listening.
    return []
  }
}

/** Is this PID one of *our* sidecars (so it's safe to kill), not some other app? */
function isOurBackend(pid: number): boolean {
  try {
    if (process.platform === 'win32') {
      const out = execSync(`wmic process where processid=${pid} get commandline`, {
        encoding: 'utf-8'
      })
      return /toolhub-backend/i.test(out) || (/uvicorn/i.test(out) && /main:app/i.test(out))
    }
    const out = execSync(`ps -p ${pid} -o command=`, { encoding: 'utf-8' })
    return /toolhub-backend/.test(out) || (/uvicorn/.test(out) && /main:app/.test(out))
  } catch {
    return false
  }
}

/**
 * Kill any orphaned sidecar of ours still holding the port — e.g. after the app
 * was force-quit or crashed before `before-quit` could run. Only kills processes
 * whose command line identifies them as our backend, never unrelated servers.
 */
export function freeStalePort(): void {
  for (const pid of pidsOnPort()) {
    if (isOurBackend(pid)) {
      try {
        process.kill(pid, 'SIGKILL')
      } catch {
        /* already gone */
      }
    }
  }
}

async function waitPortFree(timeoutMs = 2500): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (!pidsOnPort().some(isOurBackend)) return
    await new Promise((r) => setTimeout(r, 100))
  }
}

/** Kill the child's whole process group (it's spawned detached), signal-safe. */
function killTree(proc: ChildProcess, signal: NodeJS.Signals): void {
  if (!proc.pid) return
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /pid ${proc.pid} /T /F`)
    } else {
      process.kill(-proc.pid, signal)
    }
  } catch {
    try {
      proc.kill(signal)
    } catch {
      /* already exited */
    }
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

  // Clean up any orphaned sidecar of ours before binding the port ourselves.
  freeStalePort()
  await waitPortFree()

  stopping = false
  child = spawn(command, args, {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    // Own process group so we can kill the whole tree on quit; the sidecar
    // shuts down on SIGTERM and runs no reload workers.
    detached: true,
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

  killTree(proc, 'SIGTERM')

  // Escalate to a group SIGKILL if it refuses to exit in time.
  const killTimer = setTimeout(() => killTree(proc, 'SIGKILL'), 4000)
  killTimer.unref?.()
  proc.once('exit', () => clearTimeout(killTimer))
}
