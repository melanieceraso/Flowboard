import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CardModal from './CardModal'
import type { Card } from '../types'

const card: Card = { id: 'c1', title: 'Existing', assignee: 'Ada', priority: 'Low', dueDate: '2030-05-06', columnId: 'in-review' }

describe('CardModal', () => {
  it('creates: submits trimmed values with the preselected column', async () => {
    const onSave = vi.fn()
    render(<CardModal initialColumnId="in-progress" onSave={onSave} onClose={() => {}} />)
    await userEvent.type(screen.getByLabelText('Title'), '  Ship it  ')
    await userEvent.type(screen.getByLabelText('Assignee'), ' Bo ')
    await userEvent.selectOptions(screen.getByLabelText('Priority'), 'High')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSave).toHaveBeenCalledWith(
      { title: 'Ship it', assignee: 'Bo', priority: 'High', dueDate: '' },
      'in-progress',
    )
  })

  it('disables Save for a blank title', async () => {
    const onSave = vi.fn()
    render(<CardModal initialColumnId="backlog" onSave={onSave} onClose={() => {}} />)
    await userEvent.type(screen.getByLabelText('Title'), '   ')
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('edits: prefills fields and saves changes, including a column move', async () => {
    const onSave = vi.fn()
    render(<CardModal card={card} initialColumnId={card.columnId} onSave={onSave} onClose={() => {}} />)
    expect(screen.getByRole('heading', { name: 'Edit card' })).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveValue('Existing')
    expect(screen.getByLabelText('Due date')).toHaveValue('2030-05-06')
    await userEvent.clear(screen.getByLabelText('Title'))
    await userEvent.type(screen.getByLabelText('Title'), 'Changed')
    await userEvent.selectOptions(screen.getByLabelText('Column'), 'done')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSave).toHaveBeenCalledWith(
      { title: 'Changed', assignee: 'Ada', priority: 'Low', dueDate: '2030-05-06' },
      'done',
    )
  })

  it('deletes only after a second confirmation', async () => {
    const onDelete = vi.fn()
    render(<CardModal card={card} initialColumnId="backlog" onSave={() => {}} onDelete={onDelete} onClose={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Delete card' }))
    expect(onDelete).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Keep' }))
    expect(onDelete).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Delete card' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('has no delete button when adding', () => {
    render(<CardModal initialColumnId="backlog" onSave={() => {}} onClose={() => {}} />)
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
  })

  describe('audit regressions', () => {
    it('limits title to 200 and assignee to 100 characters', () => {
      render(<CardModal initialColumnId="backlog" onSave={() => {}} onClose={() => {}} />)
      expect(screen.getByLabelText('Title')).toHaveAttribute('maxlength', '200')
      expect(screen.getByLabelText('Assignee')).toHaveAttribute('maxlength', '100')
    })

    it('is a labelled modal dialog', () => {
      render(<CardModal initialColumnId="backlog" onSave={() => {}} onClose={() => {}} />)
      const dialog = screen.getByRole('dialog', { name: 'New card' })
      expect(dialog).toHaveAttribute('aria-modal', 'true')
    })

    it('closes on Escape', async () => {
      const onClose = vi.fn()
      render(<CardModal initialColumnId="backlog" onSave={() => {}} onClose={onClose} />)
      await userEvent.keyboard('{Escape}')
      expect(onClose).toHaveBeenCalled()
    })

    it('traps focus: Tab from the last control wraps to the first, Shift+Tab the reverse', async () => {
      render(<CardModal initialColumnId="backlog" onSave={() => {}} onClose={() => {}} />)
      const close = screen.getByRole('button', { name: 'Close' })
      const save = screen.getByRole('button', { name: 'Save' })
      save.focus()
      // Save is disabled with empty title, so use Cancel as the last focusable
      const cancel = screen.getByRole('button', { name: 'Cancel' })
      cancel.focus()
      await userEvent.tab()
      expect(close).toHaveFocus()
      await userEvent.tab({ shift: true })
      expect(cancel).toHaveFocus()
    })

    it('returns focus to the trigger when closed', () => {
      const trigger = document.createElement('button')
      document.body.appendChild(trigger)
      trigger.focus()
      const { unmount } = render(<CardModal initialColumnId="backlog" onSave={() => {}} onClose={() => {}} />)
      expect(trigger).not.toHaveFocus()
      unmount()
      expect(trigger).toHaveFocus()
      trigger.remove()
    })

    it('announces save errors with role=alert', () => {
      render(<CardModal initialColumnId="backlog" errorMessage="Nope" onSave={() => {}} onClose={() => {}} />)
      expect(screen.getByRole('alert')).toHaveTextContent('Nope')
    })
  })
})
