import { useState } from 'react'
import type { Card as CardType, ColumnId } from '../types'
import Card from './Card'
import plusIcon from '../assets/plus.svg'
import uploadIcon from '../assets/upload.svg'
import './Column.css'

interface Props {
  id: ColumnId
  label: string
  cards: CardType[]
  onAdd: (columnId: ColumnId) => void
  onEdit: (card: CardType) => void
  onDropCard: (cardId: string, columnId: ColumnId) => void
}

export default function Column({ id, label, cards, onAdd, onEdit, onDropCard }: Props) {
  const [dragOver, setDragOver] = useState(false)

  return (
    <section
      className={`column${dragOver ? ' column--over' : ''}`}
      aria-label={label}
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setDragOver(true)
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragOver(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        const cardId = e.dataTransfer.getData('text/plain')
        if (cardId) onDropCard(cardId, id)
      }}
    >
      <header className="column__header">
        <h2 className="column__title">{label}</h2>
        <span className="column__count">{cards.length}</span>
      </header>

      <div className="column__cards">
        {cards.length === 0 ? (
          <div className="column__empty">
            <img src={uploadIcon} alt="" width={24} height={24} />
            <p>Drop a card here or add one below</p>
          </div>
        ) : (
          cards.map((card) => <Card key={card.id} card={card} onEdit={onEdit} />)
        )}
      </div>

      <button type="button" className="column__add" onClick={() => onAdd(id)}>
        <img src={plusIcon} alt="" width={16} height={16} />
        Add card
      </button>
    </section>
  )
}
