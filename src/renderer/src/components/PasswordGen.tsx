import { JSX, useState } from 'react'
import { ToolShell, TextInput, CopyButton, Toggle, Note } from './toolkit'
import { NumberField } from './ToolFields'

const LOWER = 'abcdefghijklmnopqrstuvwxyz'
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const DIGITS = '0123456789'
const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.?/'

function randomIndex(bound: number): number {
  // Unbiased rejection sampling over a byte.
  const max = 256 - (256 % bound)
  const buf = new Uint8Array(1)
  let v: number
  do {
    crypto.getRandomValues(buf)
    v = buf[0]
  } while (v >= max)
  return v % bound
}

function strengthClass(bits: number): { cls: string; label: string } {
  if (bits < 40) return { cls: 's-weak', label: 'Zwak' }
  if (bits < 60) return { cls: 's-fair', label: 'Redelijk' }
  if (bits < 80) return { cls: 's-good', label: 'Goed' }
  return { cls: 's-strong', label: 'Sterk' }
}

function PasswordGen(): JSX.Element {
  const [length, setLength] = useState(16)
  const [lower, setLower] = useState(true)
  const [upper, setUpper] = useState(true)
  const [digits, setDigits] = useState(true)
  const [symbols, setSymbols] = useState(false)
  const [password, setPassword] = useState('')

  const pool =
    (lower ? LOWER : '') + (upper ? UPPER : '') + (digits ? DIGITS : '') + (symbols ? SYMBOLS : '')

  const len = Math.max(4, Math.min(128, length))
  const bits = pool.length > 0 ? len * Math.log2(pool.length) : 0
  const strength = strengthClass(bits)

  const generate = (): void => {
    if (!pool) return
    let out = ''
    for (let i = 0; i < len; i++) out += pool[randomIndex(pool.length)]
    setPassword(out)
  }

  return (
    <ToolShell title="Wachtwoord-generator" subtitle="Genereer een sterk, willekeurig wachtwoord.">
      <div className="panel tool-panel">
        <NumberField label="Lengte" value={length} min={4} max={128} onChange={setLength} />

        <div className="tool-field">
          <Toggle label="Kleine letters" checked={lower} onChange={setLower} />
          <Toggle label="Hoofdletters" checked={upper} onChange={setUpper} />
          <Toggle label="Cijfers" checked={digits} onChange={setDigits} />
          <Toggle label="Symbolen" checked={symbols} onChange={setSymbols} />
        </div>

        {!pool && <Note>Kies minstens één tekenset.</Note>}

        <button className="btn btn-primary" onClick={generate} disabled={!pool}>
          Genereren
        </button>

        {password && (
          <>
            <div className="tk-row">
              <TextInput label="Wachtwoord" value={password} onChange={() => {}} mono />
              <CopyButton value={password} />
            </div>

            <div className="tk-strength">
              <div
                className={`tk-strength-bar ${strength.cls}`}
                style={{ width: `${Math.min(100, (bits / 128) * 100)}%` }}
              />
            </div>
            <Note>
              {Math.round(bits)} bits — {strength.label}
            </Note>
          </>
        )}
      </div>
    </ToolShell>
  )
}

export default PasswordGen
