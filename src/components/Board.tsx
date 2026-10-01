import { useState } from 'react'
import { COLUMNS } from '../types'
import type { Card, CardInput, ColumnId } from '../types'
import { useBoard } from '../hooks/useBoard'
import Column from './Column'
import CardModal from './CardModal'
import './Board.css'

type ModalState = { mode: 'add'; columnId: ColumnId } | { mode: 'edit'; card: Card } | null

export default function Board() {
  const { cards, loading, error, addCard, updateCard, deleteCard, moveCard } = useBoard()
  const [modal, setModal] = useState<ModalState>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const openModal = (state: ModalState) => {
    setSaveError(null)
    setModal(state)
  }

  const close = () => setModal(null)

  const handleSave = async (input: CardInput, columnId: ColumnId) => {
    if (!modal) return
    setSaving(true)
    setSaveError(null)
    const result =
      modal.mode === 'add' ? await addCard(input, columnId) : await updateCard(modal.card.id, input, columnId)
    setSaving(false)
    if (result.ok) close()
    else setSaveError(result.message ?? 'Could not save. Please try again.')
  }

  return (
    <>
      <div className="subbar">
        <div className="subbar__crumbs">
          <span className="subbar__muted">Boards</span>
          <span className="subbar__muted">/</span>
          <h1>Team board</h1>
          <span className="subbar__count">{COLUMNS.length} columns</span>
        </div>
        <button
          type="button"
          className="btn btn--primary subbar__new"
          onClick={() => openModal({ mode: 'add', columnId: 'backlog' })}
        >
          New card
        </button>
      </div>

      {error && (
        <p className="board__error" role="alert">
          Something went wrong: {error}
        </p>
      )}

      {loading ? (
        <main className="board" aria-busy="true">
          {COLUMNS.map((col) => (
            <div key={col.id} className="column-skeleton" aria-hidden="true" />
          ))}
        </main>
      ) : (
        <main className="board">
          {COLUMNS.map((col) => (
            <Column
              key={col.id}
              id={col.id}
              label={col.label}
              cards={cards.filter((c) => c.columnId === col.id)}
              onAdd={(columnId) => openModal({ mode: 'add', columnId })}
              onEdit={(card) => openModal({ mode: 'edit', card })}
              onDropCard={moveCard}
            />
          ))}
        </main>
      )}

      {modal && (
        <CardModal
          key={modal.mode === 'edit' ? modal.card.id : `new-${modal.columnId}`}
          card={modal.mode === 'edit' ? modal.card : undefined}
          initialColumnId={modal.mode === 'add' ? modal.columnId : modal.card.columnId}
          saving={saving}
          errorMessage={saveError}
          onSave={handleSave}
          onDelete={
            modal.mode === 'edit'
              ? () => {
                  deleteCard(modal.card.id)
                  close()
                }
              : undefined
          }
          onClose={close}
        />
      )}
    </>
  )
}
