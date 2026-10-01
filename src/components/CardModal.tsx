import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { COLUMNS, PRIORITIES } from '../types'
import type { Card, CardInput, ColumnId, Priority } from '../types'
import closeA from '../assets/close-a.svg'
import closeB from '../assets/close-b.svg'
import './CardModal.css'

interface Props {
  /** Existing card when editing; undefined when adding. */
  card?: Card
  /** Column to preselect when adding a new card; ignored when editing. */
  initialColumnId: ColumnId
  saving?: boolean
  errorMessage?: string | null
  onSave: (input: CardInput, columnId: ColumnId) => void
  onDelete?: () => void
  onClose: () => void
}

export default function CardModal({
  card,
  initialColumnId,
  saving = false,
  errorMessage = null,
  onSave,
  onDelete,
  onClose,
}: Props) {
  const [title, setTitle] = useState(card?.title ?? '')
  const [assignee, setAssignee] = useState(card?.assignee ?? '')
  const [priority, setPriority] = useState<Priority>(card?.priority ?? 'Medium')
  const [dueDate, setDueDate] = useState(card?.dueDate ?? '')
  const [columnId, setColumnId] = useState<ColumnId>(card?.columnId ?? initialColumnId)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  // Return focus to whatever triggered the modal once it closes.
  // Captured during render, before autoFocus moves focus into the form.
  const triggerRef = useRef(document.activeElement as HTMLElement | null)
  useEffect(() => {
    const trigger = triggerRef.current
    return () => trigger?.focus()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab' || !modalRef.current) return

      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const canSave = title.trim().length > 0 && !saving

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!canSave) return
    onSave({ title: title.trim(), assignee: assignee.trim(), priority, dueDate }, columnId)
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={modalRef} className="modal" role="dialog" aria-modal="true" aria-labelledby="card-modal-title">
        <div className="modal__header">
          <h2 id="card-modal-title">{card ? 'Edit card' : 'New card'}</h2>
          <button type="button" className="modal__close" aria-label="Close" onClick={onClose}>
            <img src={closeA} alt="" />
            <img src={closeB} alt="" />
          </button>
        </div>

        <form className="modal__form" onSubmit={handleSubmit}>
          <label className="field">
            <span className="field__label field__label--strong">Title</span>
            <input
              className="input"
              autoFocus
              required
              maxLength={200}
              value={title}
              placeholder="Enter card title..."
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>

          <label className="field">
            <span className="field__label">Assignee</span>
            <input
              className="input"
              maxLength={100}
              value={assignee}
              placeholder="Who is working on this?"
              onChange={(e) => setAssignee(e.target.value)}
            />
          </label>

          <label className="field">
            <span className="field__label">Column</span>
            <select className="input" value={columnId} onChange={(e) => setColumnId(e.target.value as ColumnId)}>
              {COLUMNS.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.label}
                </option>
              ))}
            </select>
          </label>

          <div className="modal__row">
            <label className="field">
              <span className="field__label">Priority</span>
              <select
                className="input"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field__label">Due date</span>
              <input
                className="input"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </label>
          </div>

          {errorMessage && (
            <p className="modal__error" role="alert">
              {errorMessage}
            </p>
          )}

          <div className="modal__footer">
            {onDelete ? (
              confirmingDelete ? (
                <div className="modal__confirm">
                  <span>Delete this card?</span>
                  <button type="button" className="btn btn--text" onClick={() => setConfirmingDelete(false)}>
                    Keep
                  </button>
                  <button type="button" className="btn btn--danger" onClick={onDelete}>
                    Delete
                  </button>
                </div>
              ) : (
                <button type="button" className="btn btn--danger" onClick={() => setConfirmingDelete(true)}>
                  Delete card
                </button>
              )
            ) : (
              <span />
            )}
            <div className="modal__actions">
              <button type="button" className="btn" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn--primary" disabled={!canSave}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
