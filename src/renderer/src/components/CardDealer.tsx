import { JSX, useState } from 'react'
import { ToolShell, TextInput, Segmented, Note, ErrorBanner } from './toolkit'

type GameId = 'pesten' | 'zweeds' | 'toepen'
type Suit = '♠' | '♥' | '♦' | '♣'
interface Card {
  rank: string
  suit: Suit
}
interface Hand {
  hand: Card[]
  open?: Card[]
  closed?: Card[]
}
type Phase = 'setup' | 'pass' | 'reveal' | 'done'

const SUITS: Suit[] = ['♠', '♥', '♦', '♣']
const RANKS52 = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'B', 'V', 'H', 'A']
const RANKS32 = ['7', '8', '9', '10', 'B', 'V', 'H', 'A']

const GAMES: Record<GameId, { label: string; min: number; max: number; deal: (n: number) => { hands: Hand[]; rest: number } }> = {
  pesten: {
    label: 'Pesten',
    min: 2,
    max: 7,
    deal: (n) => dealFlat(RANKS52, n, 7)
  },
  toepen: {
    label: 'Toepen',
    min: 2,
    max: 8,
    deal: (n) => dealFlat(RANKS32, n, 4)
  },
  zweeds: {
    label: 'Zweeds pesten',
    min: 2,
    max: 5,
    deal: (n) => {
      const d = shuffle(makeDeck(RANKS52))
      const hands: Hand[] = []
      let k = 0
      for (let i = 0; i < n; i++) {
        hands.push({
          closed: d.slice(k, k + 3),
          open: d.slice(k + 3, k + 6),
          hand: d.slice(k + 6, k + 9)
        })
        k += 9
      }
      return { hands, rest: d.length - k }
    }
  }
}

function makeDeck(ranks: string[]): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) for (const rank of ranks) deck.push({ rank, suit })
  return deck
}

function shuffle<T>(input: T[]): T[] {
  const arr = [...input]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function dealFlat(ranks: string[], n: number, per: number): { hands: Hand[]; rest: number } {
  const d = shuffle(makeDeck(ranks))
  const hands: Hand[] = []
  let k = 0
  for (let i = 0; i < n; i++) {
    hands.push({ hand: d.slice(k, k + per) })
    k += per
  }
  return { hands, rest: d.length - k }
}

function sortCards(cards: Card[]): Card[] {
  return [...cards].sort(
    (a, b) => SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit) || RANKS52.indexOf(a.rank) - RANKS52.indexOf(b.rank)
  )
}

function CardChip({ card, faceDown }: { card?: Card; faceDown?: boolean }): JSX.Element {
  if (faceDown) return <span className="cd-card cd-back">🂠</span>
  const red = card!.suit === '♥' || card!.suit === '♦'
  return (
    <span className={red ? 'cd-card cd-red' : 'cd-card'}>
      {card!.rank}
      {card!.suit}
    </span>
  )
}

const DEALER_INFO = (
  <>
    <h4>Wat doet deze tool?</h4>
    <p>
      Deelt op één apparaat (pass-and-play) een kaartspel eerlijk uit. Voordat een speler z&apos;n
      kaarten ziet, verschijnt eerst een tussenscherm met alleen die spelernaam, zodat niemand anders
      meekijkt.
    </p>
    <h4>Opties</h4>
    <ul>
      <li>
        <b>Spel</b> — <code>Pesten</code> (7 kaarten p.p.), <code>Toepen</code> (4, met een 32-kaarts
        deck) of <code>Zweeds pesten</code> (3 dichte, 3 open en 3 handkaarten p.p.).
      </li>
      <li>
        <b>Aantal spelers</b> — waarover eerlijk wordt gedeeld; het maximum hangt van het spel af.
      </li>
    </ul>
    <p>Geef het apparaat door zoals het scherm aangeeft; tik om de kaarten van de volgende speler te tonen.</p>
  </>
)

function CardDealer(): JSX.Element {
  const [game, setGame] = useState<GameId>('pesten')
  const [playersS, setPlayersS] = useState('4')
  const [phase, setPhase] = useState<Phase>('setup')
  const [hands, setHands] = useState<Hand[]>([])
  const [rest, setRest] = useState(0)
  const [current, setCurrent] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const cfg = GAMES[game]
  const players = Math.max(cfg.min, Math.min(cfg.max, Math.floor(Number(playersS) || cfg.min)))

  const deal = (): void => {
    if (Number(playersS) < cfg.min || Number(playersS) > cfg.max) {
      setError(`${cfg.label}: kies ${cfg.min} tot ${cfg.max} spelers.`)
      return
    }
    setError(null)
    const { hands: h, rest: r } = cfg.deal(players)
    setHands(h)
    setRest(r)
    setCurrent(0)
    setPhase('pass')
  }

  const next = (): void => {
    if (current < hands.length - 1) {
      setCurrent(current + 1)
      setPhase('pass')
    } else {
      setPhase('done')
    }
  }

  return (
    <ToolShell
      title="Kaartspel-deler"
      subtitle="Deel een kaartspel eerlijk uit met een pass-and-play-flow, zodat niemand meekijkt."
      info={DEALER_INFO}
    >
      <div className="panel tool-panel">
        {phase === 'setup' && (
          <>
            <div className="tool-field">
              <span className="tool-label">Spel</span>
              <Segmented<GameId>
                options={[
                  { value: 'pesten', label: 'Pesten' },
                  { value: 'toepen', label: 'Toepen' },
                  { value: 'zweeds', label: 'Zweeds pesten' }
                ]}
                value={game}
                onChange={(g) => {
                  setGame(g)
                  setError(null)
                }}
              />
            </div>
            <TextInput
              label={`Aantal spelers (${cfg.min}–${cfg.max})`}
              value={playersS}
              onChange={setPlayersS}
              type="number"
              mono
            />
            <ErrorBanner message={error} />
            <button className="btn btn-primary" onClick={deal}>
              Delen
            </button>
            <Note>
              {cfg.label}: {game === 'zweeds' ? '3 dichte + 3 open + 3 handkaarten' : game === 'toepen' ? '4 kaarten' : '7 kaarten'} per speler.
            </Note>
          </>
        )}

        {phase === 'pass' && (
          <div className="cd-pass">
            <div className="cd-pass-icon">📲</div>
            <h2>Geef het apparaat aan Speler {current + 1}</h2>
            <p>Zorg dat niemand anders meekijkt.</p>
            <button className="btn btn-primary" onClick={() => setPhase('reveal')}>
              Ik ben Speler {current + 1} — toon mijn kaarten
            </button>
          </div>
        )}

        {phase === 'reveal' && hands[current] && (
          <div className="cd-reveal">
            <h2>Speler {current + 1}</h2>
            {game === 'zweeds' ? (
              <>
                <div className="cd-group-label">Handkaarten</div>
                <div className="cd-hand">
                  {sortCards(hands[current].hand).map((c, i) => (
                    <CardChip key={i} card={c} />
                  ))}
                </div>
                <div className="cd-group-label">Open kaarten (zichtbaar voor iedereen)</div>
                <div className="cd-hand">
                  {sortCards(hands[current].open ?? []).map((c, i) => (
                    <CardChip key={i} card={c} />
                  ))}
                </div>
                <div className="cd-group-label">Dichte kaarten (onbekend)</div>
                <div className="cd-hand">
                  {(hands[current].closed ?? []).map((_, i) => (
                    <CardChip key={i} faceDown />
                  ))}
                </div>
              </>
            ) : (
              <div className="cd-hand">
                {sortCards(hands[current].hand).map((c, i) => (
                  <CardChip key={i} card={c} />
                ))}
              </div>
            )}
            <button className="btn btn-primary" onClick={next} style={{ marginTop: 16 }}>
              {current < hands.length - 1 ? 'Klaar — geef door' : 'Klaar'}
            </button>
          </div>
        )}

        {phase === 'done' && (
          <div className="cd-pass">
            <div className="cd-pass-icon">✅</div>
            <h2>Iedereen heeft z&apos;n kaarten</h2>
            <p>{rest > 0 ? `${rest} kaarten vormen de trekstapel.` : 'Alle kaarten zijn verdeeld.'}</p>
            <div className="tk-actions" style={{ justifyContent: 'center' }}>
              <button className="btn btn-primary" style={{ width: 'auto' }} onClick={deal}>
                Opnieuw delen
              </button>
              <button className="btn" style={{ width: 'auto' }} onClick={() => setPhase('setup')}>
                Ander spel
              </button>
            </div>
          </div>
        )}
      </div>
    </ToolShell>
  )
}

export default CardDealer
