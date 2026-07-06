import { JSX, useMemo, useState } from 'react'
import { ToolShell, TextArea, Segmented, CopyButton, Note, ErrorBanner } from './toolkit'

// Every layer is a reversible string→string transform. base64/hex/binary go
// through the UTF-8 bytes so they're byte-accurate; morse is character-level
// (and case-insensitive, so it upper-cases on the way back).
type LayerId = 'base64' | 'hex' | 'binary' | 'morse'

interface Layer {
  id: LayerId
  label: string
  encode: (s: string) => string
  decode: (s: string) => string
}

const te = new TextEncoder()
const td = new TextDecoder()

function bytesToBase64(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}
function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64.replace(/\s+/g, ''))
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

const MORSE: Record<string, string> = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....',
  I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.',
  Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
  Y: '-.--', Z: '--..', '0': '-----', '1': '.----', '2': '..---', '3': '...--',
  '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--',
  '/': '-..-.', '(': '-.--.', ')': '-.--.-', '&': '.-...', ':': '---...',
  ';': '-.-.-.', '=': '-...-', '+': '.-.-.', '-': '-....-', '_': '..--.-',
  '"': '.-..-.', '$': '...-..-', '@': '.--.-.'
}
const MORSE_REV: Record<string, string> = Object.fromEntries(
  Object.entries(MORSE).map(([k, v]) => [v, k])
)

const LAYERS: Record<LayerId, Layer> = {
  base64: {
    id: 'base64',
    label: 'Base64',
    encode: (s) => bytesToBase64(te.encode(s)),
    decode: (s) => td.decode(base64ToBytes(s))
  },
  hex: {
    id: 'hex',
    label: 'Hex',
    encode: (s) =>
      Array.from(te.encode(s))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(' '),
    decode: (s) => {
      const clean = s.replace(/[^0-9a-fA-F]/g, '')
      const bytes = new Uint8Array(clean.length / 2)
      for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(clean.substr(i * 2, 2), 16)
      return td.decode(bytes)
    }
  },
  binary: {
    id: 'binary',
    label: 'Binair',
    encode: (s) =>
      Array.from(te.encode(s))
        .map((b) => b.toString(2).padStart(8, '0'))
        .join(' '),
    decode: (s) => {
      const groups = s.trim().split(/\s+/).filter(Boolean)
      const bytes = Uint8Array.from(groups.map((g) => parseInt(g, 2) & 0xff))
      return td.decode(bytes)
    }
  },
  morse: {
    id: 'morse',
    label: 'Morse',
    encode: (s) =>
      s
        .toUpperCase()
        .split(' ')
        .map((word) =>
          word
            .split('')
            .map((ch) => MORSE[ch] ?? '')
            .filter(Boolean)
            .join(' ')
        )
        .join(' / '),
    decode: (s) =>
      s
        .trim()
        .split(/\s*\/\s*/)
        .map((word) =>
          word
            .trim()
            .split(/\s+/)
            .map((code) => MORSE_REV[code] ?? '')
            .join('')
        )
        .join(' ')
  }
}

const ALL: LayerId[] = ['base64', 'hex', 'binary', 'morse']

interface Stage {
  label: string
  value: string
}

const ENCODING_CHAIN_INFO = (
  <>
    <h4>Wat doet deze tool?</h4>
    <p>
      Jaagt tekst door meerdere codeerlagen na elkaar en toont elke tussenstap. Zo kun je
      geneste codering opbouwen of juist ontrafelen.
    </p>
    <h4>Opties</h4>
    <ul>
      <li>
        <b>Invoer</b> — de tekst waarmee de keten begint.
      </li>
      <li>
        <b>Richting</b> — <b>Coderen</b> voegt de lagen in volgorde toe; <b>Decoderen</b> pelt ze in
        omgekeerde volgorde weer af.
      </li>
      <li>
        <b>Lagen toevoegen</b> — klik op een laag om die achteraan de keten te zetten. Klik in de
        keten op een laag om die te verwijderen, of gebruik &quot;Wissen&quot; voor alles.
      </li>
    </ul>
    <h4>Lagen</h4>
    <ul>
      <li>
        <b>Base64</b> — codeert de UTF-8 bytes als <code>base64</code>-tekst.
      </li>
      <li>
        <b>Hex</b> — toont elke byte als twee hexadecimale tekens.
      </li>
      <li>
        <b>Binair</b> — toont elke byte als acht bits (nullen en enen).
      </li>
      <li>
        <b>Morse</b> — zet letters om in morsecode. Werkt op tekenniveau en is
        hoofdletter-ongevoelig: bij decoderen komt alles in hoofdletters terug.
      </li>
    </ul>
    <p>
      <code>base64</code>, <code>hex</code> en binair werken op de UTF-8 bytes en zijn exact
      omkeerbaar.
    </p>
  </>
)

function EncodingChain(): JSX.Element {
  const [input, setInput] = useState('Hallo, wereld!')
  const [chain, setChain] = useState<LayerId[]>(['base64', 'hex'])
  const [direction, setDirection] = useState<'encode' | 'decode'>('encode')

  const { stages, error } = useMemo<{ stages: Stage[]; error: string | null }>(() => {
    // For decoding we peel the layers off in reverse order.
    const order = direction === 'encode' ? chain : [...chain].reverse()
    const out: Stage[] = [{ label: 'Invoer', value: input }]
    let current = input
    try {
      for (const id of order) {
        const layer = LAYERS[id]
        current = direction === 'encode' ? layer.encode(current) : layer.decode(current)
        out.push({
          label: `${direction === 'encode' ? '→' : '←'} ${layer.label}`,
          value: current
        })
      }
      return { stages: out, error: null }
    } catch (err) {
      return { stages: out, error: `Kon laag niet toepassen: ${(err as Error).message}` }
    }
  }, [input, chain, direction])

  const final = stages[stages.length - 1]?.value ?? ''

  return (
    <ToolShell
      title="Encoding-keten"
      subtitle="Jaag tekst door meerdere lagen (Base64, hex, binair, morse) en zie elke tussenstap."
      info={ENCODING_CHAIN_INFO}
    >
      <div className="panel tool-panel">
        <TextArea label="Invoer" value={input} onChange={setInput} rows={3} mono={false} />
        <div className="tool-field">
          <span className="tool-label">Richting</span>
          <Segmented<'encode' | 'decode'>
            options={[
              { value: 'encode', label: 'Coderen (laag voor laag toevoegen)' },
              { value: 'decode', label: 'Decoderen (lagen eraf pellen)' }
            ]}
            value={direction}
            onChange={setDirection}
          />
        </div>
        <div className="tool-field">
          <span className="tool-label">Lagen toevoegen</span>
          <div className="tk-pills">
            {ALL.map((id) => (
              <button
                key={id}
                className="tk-pill"
                style={{ cursor: 'pointer' }}
                onClick={() => setChain((c) => [...c, id])}
              >
                + {LAYERS[id].label}
              </button>
            ))}
            {chain.length > 0 && (
              <button className="tk-pill tk-danger" style={{ cursor: 'pointer' }} onClick={() => setChain([])}>
                Wissen
              </button>
            )}
          </div>
        </div>
        {chain.length > 0 && (
          <div className="tool-field">
            <span className="tool-label">Keten (klik om te verwijderen)</span>
            <div className="tk-pills">
              {chain.map((id, i) => (
                <button
                  key={i}
                  className="tk-pill on"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setChain((c) => c.filter((_, j) => j !== i))}
                >
                  {i + 1}. {LAYERS[id].label} ✕
                </button>
              ))}
            </div>
          </div>
        )}
        <ErrorBanner message={error} />
        <div className="tk-chain">
          {stages.map((s, i) => (
            <div className="tk-chain-stage" key={i}>
              <div className="tk-output-head">
                <span className="tool-label">{s.label}</span>
                {i > 0 && <CopyButton value={s.value} />}
              </div>
              <pre className="tk-output tk-mono">{s.value || ' '}</pre>
            </div>
          ))}
        </div>
        {chain.length > 0 && (
          <div className="tk-output-head" style={{ marginTop: 12 }}>
            <span className="tool-label">Eindresultaat</span>
            <CopyButton value={final} label="Eindresultaat kopiëren" />
          </div>
        )}
        <Note>
          Base64, hex en binair werken op de UTF-8 bytes en zijn exact omkeerbaar. Morse is
          hoofdletter-ongevoelig: bij decoderen komt alles in hoofdletters terug.
        </Note>
      </div>
    </ToolShell>
  )
}

export default EncodingChain
