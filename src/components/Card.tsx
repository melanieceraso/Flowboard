import type { Card as CardType } from '../types'
import './Card.css'

interface Props {
  card: CardType
  onEdit: (card: CardType) => void
}

function parseDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatDate(value: string): string {
  return parseDate(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function isOverdue(card: CardType): boolean {
  if (!card.dueDate || card.columnId === 'done') return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return parseDate(card.dueDate) < today
}

function accessibleLabel(card: CardType): string {
  const parts = [`${card.title}.`, `Priority: ${card.priority}.`]
  if (card.dueDate) {
    parts.push(`Due ${formatDate(card.dueDate)}${isOverdue(card) ? ', overdue' : ''}.`)
  }
  if (card.assignee) {
    parts.push(`Assigned to ${card.assignee}.`)
  }
  return parts.join(' ')
}

export default function Card({ card, onEdit }: Props) {
  return (
    <div
      className="card"
      draggable
      role="button"
      tabIndex={0}
      aria-label={accessibleLabel(card)}
      onClick={() => onEdit(card)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onEdit(card)
        }
      }}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', card.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
    >
      <p className="card__title">{card.title}</p>
      <div className="card__meta">
        <span className={`badge badge--${card.priority.toLowerCase()}`}>{card.priority}</span>
        {card.dueDate && (
          <span className={`card__due${isOverdue(card) ? ' card__due--overdue' : ''}`}>
            {isOverdue(card) ? 'Overdue: ' : ''}
            {formatDate(card.dueDate)}
          </span>
        )}
        {card.assignee && (
          <span className="card__assignee" title={card.assignee} aria-hidden="true">
            {card.assignee.trim().charAt(0).toUpperCase()}
          </span>
        )}
      </div>
    </div>
  )
}
