import { JSX, useEffect, useMemo, useState } from 'react'
import { ToolShell, TextInput, TextArea, CopyButton, Note, ErrorBanner } from './toolkit'

type Snippet = Awaited<ReturnType<typeof window.api.snippets.list>>[number]

const SNIPPET_MANAGER_INFO = (
  <>
    <h4>Wat doet deze tool?</h4>
    <p>
      Bewaart korte teksten die je vaak nodig hebt — een e-mailhandtekening, standaardantwoord of
      codefragment — met een herkenbaar label. Je snippets blijven bewaard tussen sessies.
    </p>
    <h4>Opties</h4>
    <ul>
      <li>
        <b>Nieuwe snippet</b> — geef een <b>label</b> en de <b>tekst</b> op en klik op toevoegen.
        De tekst mag niet leeg zijn.
      </li>
      <li>
        <b>Zoeken</b> — filtert je snippets op label of inhoud terwijl je typt.
      </li>
      <li>
        <b>Kopiëren</b> — zet de tekst van een snippet met één klik op het klembord.
      </li>
      <li>
        <b>Bewerken</b> — laadt een snippet terug in het formulier om label of tekst aan te passen.
      </li>
      <li>
        <b>Verwijderen</b> — wist een snippet definitief.
      </li>
    </ul>
  </>
)

function SnippetManager(): JSX.Element {
  const [snippets, setSnippets] = useState<Snippet[]>([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Editor form.
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formLabel, setFormLabel] = useState('')
  const [formText, setFormText] = useState('')

  useEffect(() => {
    window.api.snippets
      .list()
      .then(setSnippets)
      .catch(() => setError('Kon snippets niet laden.'))
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return snippets
    return snippets.filter(
      (s) => s.label.toLowerCase().includes(q) || s.text.toLowerCase().includes(q)
    )
  }, [snippets, query])

  const clearForm = (): void => {
    setEditingId(null)
    setFormLabel('')
    setFormText('')
  }

  const startEdit = (s: Snippet): void => {
    setEditingId(s.id)
    setFormLabel(s.label)
    setFormText(s.text)
  }

  const save = async (): Promise<void> => {
    if (formText.trim() === '') {
      setError('Een snippet mag niet leeg zijn.')
      return
    }
    setError(null)
    try {
      const updated = await window.api.snippets.save({
        id: editingId ?? undefined,
        label: formLabel,
        text: formText
      })
      setSnippets(updated)
      clearForm()
    } catch {
      setError('Opslaan mislukt.')
    }
  }

  const remove = async (id: string): Promise<void> => {
    try {
      setSnippets(await window.api.snippets.delete(id))
      if (editingId === id) clearForm()
    } catch {
      setError('Verwijderen mislukt.')
    }
  }

  return (
    <ToolShell
      title="Snippet-manager"
      subtitle="Bewaar korte teksten met een label, doorzoek ze en kopieer met één klik."
      info={SNIPPET_MANAGER_INFO}
    >
      <div className="tk-two">
        <div className="panel tool-panel">
          <h2>{editingId ? 'Snippet bewerken' : 'Nieuwe snippet'}</h2>
          <TextInput label="Label" value={formLabel} onChange={setFormLabel} placeholder="bijv. E-mail handtekening" />
          <TextArea label="Tekst" value={formText} onChange={setFormText} rows={7} mono={false} placeholder="Plak of typ hier de tekst…" />
          <ErrorBanner message={error} />
          <div className="tk-actions">
            <button className="btn btn-primary" onClick={save}>
              {editingId ? 'Wijzigingen opslaan' : 'Snippet toevoegen'}
            </button>
            {editingId && (
              <button className="btn" onClick={clearForm}>
                Annuleren
              </button>
            )}
          </div>
        </div>

        <div className="panel tool-panel">
          <TextInput label={`Zoeken (${snippets.length})`} value={query} onChange={setQuery} placeholder="Zoek op label of inhoud…" />
          {filtered.length === 0 ? (
            <Note>{snippets.length === 0 ? 'Nog geen snippets — voeg er links één toe.' : 'Geen snippets gevonden.'}</Note>
          ) : (
            <div className="tk-snips">
              {filtered.map((s) => (
                <div className="tk-snip" key={s.id}>
                  <div className="tk-snip-head">
                    <span className="tk-snip-label">{s.label}</span>
                    <div className="tk-snip-actions">
                      <CopyButton value={s.text} />
                      <button className="tk-copy" onClick={() => startEdit(s)}>
                        Bewerken
                      </button>
                      <button className="tk-copy tk-danger" onClick={() => remove(s.id)}>
                        Verwijderen
                      </button>
                    </div>
                  </div>
                  <pre className="tk-snip-text">{s.text}</pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ToolShell>
  )
}

export default SnippetManager
