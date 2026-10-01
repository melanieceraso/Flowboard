import { vi } from 'vitest'

/**
 * In-memory stand-in for the Supabase client so tests never touch the network
 * or the real database. Use via:
 *   vi.mock('../lib/supabase', async () => (await import('../test/supabaseMock')).supabaseModule)
 */

export interface Row {
  id: string
  title: string
  assignee: string
  priority: 'High' | 'Medium' | 'Low'
  due_date: string | null
  column_id: string
}

export interface FakeError {
  code?: string
  message: string
}

type Op = 'select' | 'insert' | 'update' | 'delete'

export const db = {
  rows: [] as Row[],
  /** Errors returned for every call of that operation until cleared. */
  errors: {} as Partial<Record<Op, FakeError>>,
  /** Every query executed, for assertions. */
  calls: [] as { op: Op; payload?: Record<string, unknown>; filters: Record<string, unknown> }[],
  nextId: 1,
}

export function resetDb(rows: Row[] = []) {
  db.rows = rows.map((r) => ({ ...r }))
  db.errors = {}
  db.calls = []
  db.nextId = 1
}

export function makeRow(overrides: Partial<Row> = {}): Row {
  return {
    id: `row-${Math.random().toString(36).slice(2)}`,
    title: 'Untitled',
    assignee: '',
    priority: 'Medium',
    due_date: null,
    column_id: 'backlog',
    ...overrides,
  }
}

function query() {
  let op: Op = 'select'
  let payload: Record<string, unknown> | undefined
  const filters: Record<string, unknown> = {}
  let single = false

  const execute = () => {
    db.calls.push({ op, payload, filters: { ...filters } })
    const error = db.errors[op]
    if (error) return { data: null, error }

    const id = filters.id
    switch (op) {
      case 'select':
        return { data: db.rows.map((r) => ({ ...r })), error: null }
      case 'insert': {
        const row = makeRow({ id: `new-${db.nextId++}`, ...(payload as Partial<Row>) })
        db.rows.push(row)
        return { data: single ? { ...row } : [{ ...row }], error: null }
      }
      case 'update': {
        const row = db.rows.find((r) => r.id === id)
        if (!row) return { data: null, error: { code: 'PGRST116', message: 'no rows' } }
        const { position, ...rest } = payload ?? {}
        Object.assign(row, rest)
        if (position !== undefined) {
          db.rows = [...db.rows.filter((r) => r !== row), row]
        }
        return { data: single ? { ...row } : [{ ...row }], error: null }
      }
      case 'delete':
        db.rows = db.rows.filter((r) => r.id !== id)
        return { data: null, error: null }
    }
  }

  const builder = {
    select: () => builder,
    order: () => builder,
    insert: (p: Record<string, unknown>) => {
      op = 'insert'
      payload = p
      return builder
    },
    update: (p: Record<string, unknown>) => {
      op = 'update'
      payload = p
      return builder
    },
    delete: () => {
      op = 'delete'
      return builder
    },
    eq: (col: string, value: unknown) => {
      filters[col] = value
      return builder
    },
    single: () => {
      single = true
      return builder
    },
    then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(execute()).then(resolve, reject),
  }
  return builder
}

export const authMock = {
  getSession: vi.fn(async () => ({ data: { session: null } })),
  onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  signInWithPassword: vi.fn(async () => ({ error: null })),
  signUp: vi.fn(async () => ({ data: { session: null }, error: null })),
  signOut: vi.fn(async () => ({ error: null })),
}

export const supabase = {
  from: vi.fn(() => query()),
  auth: authMock,
}

export const supabaseModule = { supabase }
