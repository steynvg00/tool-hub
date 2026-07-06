import { JSX, useState } from 'react'
import { ToolShell, Segmented, OutputArea } from './toolkit'
import { NumberField } from './ToolFields'

type Unit = 'paragraphs' | 'sentences' | 'words'

const WORDS = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
  'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
  'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud',
  'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo',
  'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit', 'voluptate',
  'velit', 'esse', 'cillum', 'fugiat', 'nulla', 'pariatur'
]

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function pick(): string {
  return WORDS[Math.floor(Math.random() * WORDS.length)]
}

function capitalize(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s
}

function makeWords(n: number): string {
  const arr: string[] = []
  for (let i = 0; i < n; i++) arr.push(pick())
  return capitalize(arr.join(' '))
}

function makeSentence(): string {
  const n = randInt(6, 14)
  const arr: string[] = []
  for (let i = 0; i < n; i++) arr.push(pick())
  return capitalize(arr.join(' ')) + '.'
}

function makeParagraph(): string {
  const n = randInt(3, 6)
  const arr: string[] = []
  for (let i = 0; i < n; i++) arr.push(makeSentence())
  return arr.join(' ')
}

function LoremIpsum(): JSX.Element {
  const [unit, setUnit] = useState<Unit>('paragraphs')
  const [count, setCount] = useState(3)
  const [output, setOutput] = useState('')

  const generate = (): void => {
    const n = Math.max(1, Math.min(200, count))
    if (unit === 'words') {
      setOutput(makeWords(n))
    } else if (unit === 'sentences') {
      const arr: string[] = []
      for (let i = 0; i < n; i++) arr.push(makeSentence())
      setOutput(arr.join(' '))
    } else {
      const arr: string[] = []
      for (let i = 0; i < n; i++) arr.push(makeParagraph())
      setOutput(arr.join('\n\n'))
    }
  }

  return (
    <ToolShell title="Lorem ipsum" subtitle="Genereer opvultekst voor ontwerpen en mockups.">
      <div className="panel tool-panel">
        <div className="tool-field">
          <span className="tool-label">Eenheid</span>
          <Segmented<Unit>
            options={[
              { value: 'paragraphs', label: "Alinea's" },
              { value: 'sentences', label: 'Zinnen' },
              { value: 'words', label: 'Woorden' }
            ]}
            value={unit}
            onChange={setUnit}
          />
        </div>

        <NumberField label="Aantal" value={count} min={1} max={200} onChange={setCount} />

        <button className="btn btn-primary" onClick={generate}>
          Genereren
        </button>

        <OutputArea label="Resultaat" value={output} rows={10} />
      </div>
    </ToolShell>
  )
}

export default LoremIpsum
