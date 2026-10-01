import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Board from './Board'
import { db, makeRow, resetDb } from '../test/supabaseMock'

vi.mock('../lib/supabase', async () => (await import('../test/supabaseMock')).supabaseModule)

const column = (name: string) => screen.getByRole('region', { name })

async function renderBoard(rows = [makeRow({ id: 'a', title: 'Alpha' }), makeRow({ id: 'b', title: 'Beta', column_id: 'done' })]) {
  resetDb(rows)
  vi.spyOn(console, 'error').mockImplementation(() => {})
  render(<Board />)
  await screen.findByText('Alpha')
}

describe('Board', () => {
  it('shows cards in their columns', async () => {
    await renderBoard()
    expect(within(column('Backlog')).getByText('Alpha')).toBeInTheDocument()
    expect(within(column('Done')).getByText('Beta')).toBeInTheDocument()
  })

  it('creates a card from the New card button into Backlog', async () => {
    await renderBoard()
    await userEvent.click(screen.getByRole('button', { name: 'New card' }))
    await userEvent.type(screen.getByLabelText('Title'), 'Gamma')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await within(column('Backlog')).findByText('Gamma')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(db.rows.some((r) => r.title === 'Gamma' && r.column_id === 'backlog')).toBe(true)
  })

  it('creates a card in a specific column via that column\'s Add card button', async () => {
    await renderBoard()
    await userEvent.click(within(column('In Review')).getByRole('button', { name: /Add card/ }))
    await userEvent.type(screen.getByLabelText('Title'), 'Reviewed')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await within(column('In Review')).findByText('Reviewed')).toBeInTheDocument()
  })

  it('edits a card', async () => {
    await renderBoard()
    await userEvent.click(screen.getByRole('button', { name: /^Alpha\./ }))
    const title = screen.getByLabelText('Title')
    await userEvent.clear(title)
    await userEvent.type(title, 'Alpha 2')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Alpha 2')).toBeInTheDocument()
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument()
    expect(db.rows.find((r) => r.id === 'a')?.title).toBe('Alpha 2')
  })

  it('moves a card via the modal column select', async () => {
    await renderBoard()
    await userEvent.click(screen.getByRole('button', { name: /^Alpha\./ }))
    await userEvent.selectOptions(screen.getByLabelText('Column'), 'in-progress')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(within(column('In Progress')).getByText('Alpha')).toBeInTheDocument())
  })

  it('moves a card by dragging it onto another column', async () => {
    await renderBoard()
    fireEvent.drop(column('In Progress'), { dataTransfer: { getData: () => 'a' } })
    await waitFor(() => expect(within(column('In Progress')).getByText('Alpha')).toBeInTheDocument())
    expect(db.rows.find((r) => r.id === 'a')?.column_id).toBe('in-progress')
  })

  it('deletes a card after confirmation', async () => {
    await renderBoard()
    await userEvent.click(screen.getByRole('button', { name: /^Alpha\./ }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete card' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(screen.queryByText('Alpha')).not.toBeInTheDocument())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(db.rows.map((r) => r.id)).toEqual(['b'])
  })

  it('keeps the modal open and shows an alert when saving fails', async () => {
    await renderBoard()
    db.errors.insert = { code: '23514', message: 'check' }
    await userEvent.click(screen.getByRole('button', { name: 'New card' }))
    await userEvent.type(screen.getByLabelText('Title'), 'Bad')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent(
      'One of the fields is too long or not allowed.',
    )
  })

  describe('audit regressions', () => {
    it('marks the loading skeleton aria-busy', () => {
      resetDb([])
      render(<Board />)
      expect(document.querySelector('main[aria-busy="true"]')).toBeInTheDocument()
    })

    it('announces load errors with role=alert and a friendly message', async () => {
      resetDb([])
      vi.spyOn(console, 'error').mockImplementation(() => {})
      db.errors.select = { code: 'X', message: 'relation "public.cards" does not exist' }
      render(<Board />)
      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent('Something went wrong. Please try again.')
      expect(alert).not.toHaveTextContent('public.cards')
    })

    it('keeps the error visible after a failed delete rolls back', async () => {
      await renderBoard()
      db.errors.delete = { code: '23503', message: 'fk' }
      await userEvent.click(screen.getByRole('button', { name: /^Alpha\./ }))
      await userEvent.click(screen.getByRole('button', { name: 'Delete card' }))
      await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
      expect(await screen.findByRole('alert')).toHaveTextContent('That record no longer exists.')
      expect(await screen.findByText('Alpha')).toBeInTheDocument()
    })
  })
})
