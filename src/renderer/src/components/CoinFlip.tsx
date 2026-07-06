import { JSX, useEffect, useRef, useState } from 'react'
import { ToolShell, StatRow } from './toolkit'

type Side = 'K' | 'M'

const COINFLIP_INFO = (
  <>
    <h4>Wat doet deze tool?</h4>
    <p>
      Gooi een virtuele munt op: de uitkomst is willekeurig kop of munt. Onderaan houdt de tool een
      telling bij van hoe vaak je kop en munt hebt gegooid; met <b>Reset telling</b> zet je die
      teller weer op nul.
    </p>
  </>
)

function CoinFlip(): JSX.Element {
  const [side, setSide] = useState<Side | null>(null)
  const [flipping, setFlipping] = useState(false)
  const [heads, setHeads] = useState(0)
  const [tails, setTails] = useState(0)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const flip = (): void => {
    if (flipping) return
    setFlipping(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const result: Side = Math.random() < 0.5 ? 'K' : 'M'
      setSide(result)
      if (result === 'K') setHeads((n) => n + 1)
      else setTails((n) => n + 1)
      setFlipping(false)
    }, 600)
  }

  const reset = (): void => {
    setHeads(0)
    setTails(0)
    setSide(null)
  }

  return (
    <ToolShell
      title="Munt opgooien"
      subtitle="Kop of munt, met een lopende telling."
      info={COINFLIP_INFO}
    >
      <div className="panel">
        <div className={flipping ? 'tk-coin flipping' : 'tk-coin'}>{side ?? '?'}</div>

        <div className="tk-center">
          {side !== null && !flipping && (side === 'K' ? 'Kop' : 'Munt')}
        </div>

        <div className="tk-actions">
          <button className="btn btn-primary" onClick={flip} disabled={flipping}>
            Gooi
          </button>
          <button className="btn" onClick={reset} disabled={flipping}>
            Reset telling
          </button>
        </div>

        <StatRow
          stats={[
            { label: 'Kop', value: heads },
            { label: 'Munt', value: tails },
            { label: 'Totaal', value: heads + tails }
          ]}
        />
      </div>
    </ToolShell>
  )
}

export default CoinFlip
