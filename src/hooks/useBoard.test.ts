import { act, renderHook, waitFor } from '@testing-library/react'
import { useBoard } from './useBoard'
import { db, makeRow, resetDb } from '../test/supabaseMock'

vi.mock('../lib/supabase', async () => (await import('../test/supabaseMock')).supabaseModule)

const input = { title: 'New task', assignee: 'Ada', priority: 'High' as const, dueDate: '2030-01-02' }

async function setup(rows = [makeRow({ id: 'a', title: 'A' }), makeRow({ id: 'b', title: 'B', column_id: 'done' })]) {
  resetDb(rows)
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const hook = renderHook(() => useBoard())
  await waitFor(() => expect(hook.result.current.loading).toBe(false))
  return hook
}

describe('useBoard', () => {
  it('loads cards and maps rows to cards', async () => {
    const { result } = await setup([makeRow({ id: 'a', title: 'A', due_date: null, column_id: 'in-review' })])
    expect(result.current.cards).toEqual([
      { id: 'a', title: 'A', assignee: '', priority: 'Medium', dueDate: '', columnId: 'in-review' },
    ])
    expect(result.current.error).toBeNull()
  })

  it('shows a friendly error when loading fails', async () => {
    resetDb()
    db.errors.select = { code: '42P01', message: 'relation "cards" does not exist' }
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { result } = renderHook(() => useBoard())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('Something went wrong. Please try again.')
    expect(result.current.cards).toEqual([])
  })

  describe('create', () => {
    it('inserts a card into the chosen column and appends it', async () => {
      const { result } = await setup()
      let res
      await act(async () => {
        res = await result.current.addCard(input, 'in-progress')
      })
      expect(res).toEqual({ ok: true })
      const insert = db.calls.find((c) => c.op === 'insert')
      expect(insert?.payload).toEqual({
        title: 'New task',
        assignee: 'Ada',
        priority: 'High',
        due_date: '2030-01-02',
        column_id: 'in-progress',
      })
      expect(result.current.cards.at(-1)).toMatchObject({ title: 'New task', columnId: 'in-progress' })
    })

    it('stores an empty due date as null', async () => {
      const { result } = await setup()
      await act(async () => {
        await result.current.addCard({ ...input, dueDate: '' }, 'backlog')
      })
      expect(db.calls.find((c) => c.op === 'insert')?.payload?.due_date).toBeNull()
    })

    it('returns a friendly failure and does not add the card', async () => {
      const { result } = await setup()
      db.errors.insert = { code: '23514', message: 'violates check constraint "cards_title_check"' }
      let res
      await act(async () => {
        res = await result.current.addCard(input, 'backlog')
      })
      expect(res).toEqual({ ok: false, message: 'One of the fields is too long or not allowed.' })
      expect(result.current.cards).toHaveLength(2)
      expect(result.current.error).toBe('One of the fields is too long or not allowed.')
    })
  })

  describe('edit', () => {
    it('updates the card by id, including its column', async () => {
      const { result } = await setup()
      await act(async () => {
        await result.current.updateCard('a', { ...input, title: 'Renamed' }, 'done')
      })
      const update = db.calls.find((c) => c.op === 'update')
      expect(update?.filters).toEqual({ id: 'a' })
      expect(update?.payload).toMatchObject({ title: 'Renamed', column_id: 'done' })
      expect(result.current.cards.find((c) => c.id === 'a')).toMatchObject({ title: 'Renamed', columnId: 'done' })
    })

    it('reports a failed update and keeps the old card', async () => {
      const { result } = await setup()
      db.errors.update = { code: '23505', message: 'dup' }
      let res
      await act(async () => {
        res = await result.current.updateCard('a', input, 'backlog')
      })
      expect(res).toMatchObject({ ok: false })
      expect(result.current.cards.find((c) => c.id === 'a')?.title).toBe('A')
    })
  })

  describe('move', () => {
    it('moves the card to the new column, at the end, and persists column and position', async () => {
      const { result } = await setup()
      await act(async () => {
        await result.current.moveCard('a', 'done')
      })
      expect(result.current.cards.map((c) => c.id)).toEqual(['b', 'a'])
      expect(result.current.cards.find((c) => c.id === 'a')?.columnId).toBe('done')
      const update = db.calls.find((c) => c.op === 'update')
      expect(update?.filters).toEqual({ id: 'a' })
      expect(update?.payload).toMatchObject({ column_id: 'done' })
      expect(update?.payload).toHaveProperty('position')
    })

    it('does nothing meaningful when dropped on its own column', async () => {
      const { result } = await setup()
      await act(async () => {
        await result.current.moveCard('a', 'backlog')
      })
      expect(result.current.cards.map((c) => c.id)).toEqual(['a', 'b'])
    })

    it('ignores unknown card ids locally', async () => {
      const { result } = await setup()
      await act(async () => {
        await result.current.moveCard('ghost', 'done')
      })
      expect(result.current.cards).toHaveLength(2)
    })

    it('rolls back by reloading and surfaces an error when the update fails (audit)', async () => {
      const { result } = await setup()
      db.errors.update = { code: 'PGRST301', message: 'JWT expired' }
      await act(async () => {
        await result.current.moveCard('a', 'done')
      })
      await waitFor(() => expect(result.current.cards.find((c) => c.id === 'a')?.columnId).toBe('backlog'))
      expect(result.current.error).toBe('Your session has expired. Please sign in again.')
    })
  })

  describe('delete', () => {
    it('removes the card and deletes it by id', async () => {
      const { result } = await setup()
      await act(async () => {
        await result.current.deleteCard('a')
      })
      expect(result.current.cards.map((c) => c.id)).toEqual(['b'])
      expect(db.calls.find((c) => c.op === 'delete')?.filters).toEqual({ id: 'a' })
      expect(db.rows.map((r) => r.id)).toEqual(['b'])
    })

    it('rolls back by reloading and surfaces an error when delete fails (audit)', async () => {
      const { result } = await setup()
      db.errors.delete = { code: '23503', message: 'fk' }
      await act(async () => {
        await result.current.deleteCard('a')
      })
      await waitFor(() => expect(result.current.cards.map((c) => c.id)).toEqual(['a', 'b']))
      expect(result.current.error).toBe('That record no longer exists.')
    })
  })
})
