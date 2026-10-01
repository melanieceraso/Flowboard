export const COLUMNS = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'in-review', label: 'In Review' },
  { id: 'done', label: 'Done' },
] as const

export type ColumnId = (typeof COLUMNS)[number]['id']

export const PRIORITIES = ['High', 'Medium', 'Low'] as const
export type Priority = (typeof PRIORITIES)[number]

export interface Card {
  id: string
  title: string
  assignee: string
  priority: Priority
  dueDate: string // yyyy-mm-dd, empty when unset
  columnId: ColumnId
}

export type CardInput = Omit<Card, 'id' | 'columnId'>
