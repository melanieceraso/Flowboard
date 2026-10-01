import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { friendlyError } from '../lib/friendlyError'
import type { Card, CardInput, ColumnId, Priority } from '../types'

interface CardRow {
  id: string
  title: string
  assignee: string
  priority: Priority
  due_date: string | null
  column_id: ColumnId
}

const COLUMNS_SELECT = 'id, title, assignee, priority, due_date, column_id'

export interface SaveResult {
  ok: boolean
  message?: string
}

function fromRow(row: CardRow): Card {
  return {
    id: row.id,
    title: row.title,
    assignee: row.assignee,
    priority: row.priority,
    dueDate: row.due_date ?? '',
    columnId: row.column_id,
  }
}

function toColumns(input: CardInput) {
  return {
    title: input.title,
    assignee: input.assignee,
    priority: input.priority,
    due_date: input.dueDate || null,
  }
}

export function useBoard() {
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (keepError = false) => {
    const { data, error } = await supabase
      .from('cards')
      .select(COLUMNS_SELECT)
      .order('position', { ascending: true })
    if (error) setError(friendlyError(error))
    else {
      if (!keepError) setError(null)
      setCards((data as CardRow[]).map(fromRow))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const addCard = useCallback(async (input: CardInput, columnId: ColumnId): Promise<SaveResult> => {
    const { data, error } = await supabase
      .from('cards')
      .insert({ ...toColumns(input), column_id: columnId })
      .select(COLUMNS_SELECT)
      .single()
    if (error) {
      const message = friendlyError(error)
      setError(message)
      return { ok: false, message }
    }
    setError(null)
    setCards((prev) => [...prev, fromRow(data as CardRow)])
    return { ok: true }
  }, [])

  const updateCard = useCallback(async (id: string, input: CardInput, columnId: ColumnId): Promise<SaveResult> => {
    const { data, error } = await supabase
      .from('cards')
      .update({ ...toColumns(input), column_id: columnId })
      .eq('id', id)
      .select(COLUMNS_SELECT)
      .single()
    if (error) {
      const message = friendlyError(error)
      setError(message)
      return { ok: false, message }
    }
    setError(null)
    setCards((prev) => prev.map((c) => (c.id === id ? fromRow(data as CardRow) : c)))
    return { ok: true }
  }, [])

  const deleteCard = useCallback(
    async (id: string) => {
      setCards((prev) => prev.filter((c) => c.id !== id))
      const { error } = await supabase.from('cards').delete().eq('id', id)
      if (error) {
        setError(friendlyError(error))
        void load(true)
      }
    },
    [load],
  )

  const moveCard = useCallback(
    async (id: string, columnId: ColumnId) => {
      setCards((prev) => {
        const card = prev.find((c) => c.id === id)
        if (!card || card.columnId === columnId) return prev
        return [...prev.filter((c) => c.id !== id), { ...card, columnId }]
      })
      const { error } = await supabase
        .from('cards')
        .update({ column_id: columnId, position: Date.now() })
        .eq('id', id)
      if (error) {
        setError(friendlyError(error))
        void load(true)
      }
    },
    [load],
  )

  return { cards, loading, error, addCard, updateCard, deleteCard, moveCard }
}
