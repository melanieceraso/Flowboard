import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Card from './Card'
import type { Card as CardType } from '../types'

const base: CardType = { id: 'c1', title: 'Write docs', assignee: 'Ada', priority: 'High', dueDate: '', columnId: 'backlog' }

describe('Card', () => {
  it('renders title, priority and assignee initial', () => {
    render(<Card card={base} onEdit={() => {}} />)
    expect(screen.getByText('Write docs')).toBeInTheDocument()
    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('calls onEdit when clicked', async () => {
    const onEdit = vi.fn()
    render(<Card card={base} onEdit={onEdit} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onEdit).toHaveBeenCalledWith(base)
  })

  it('puts its id on the drag payload', () => {
    render(<Card card={base} onEdit={() => {}} />)
    const setData = vi.fn()
    fireEvent.dragStart(screen.getByRole('button'), { dataTransfer: { setData, effectAllowed: '' } })
    expect(setData).toHaveBeenCalledWith('text/plain', 'c1')
    expect(screen.getByRole('button')).toHaveAttribute('draggable', 'true')
  })

  describe('overdue', () => {
    it('flags past due dates', () => {
      render(<Card card={{ ...base, dueDate: '2000-01-01' }} onEdit={() => {}} />)
      expect(screen.getByText(/Overdue:/)).toBeInTheDocument()
    })

    it('does not flag overdue cards that are done', () => {
      render(<Card card={{ ...base, dueDate: '2000-01-01', columnId: 'done' }} onEdit={() => {}} />)
      expect(screen.queryByText(/Overdue:/)).not.toBeInTheDocument()
    })

    it('does not flag future dates', () => {
      render(<Card card={{ ...base, dueDate: '2999-01-01' }} onEdit={() => {}} />)
      expect(screen.queryByText(/Overdue:/)).not.toBeInTheDocument()
    })
  })

  describe('accessibility (audit)', () => {
    it('is a focusable button with a descriptive label', () => {
      render(<Card card={{ ...base, dueDate: '2000-01-01' }} onEdit={() => {}} />)
      const el = screen.getByRole('button')
      expect(el).toHaveAttribute('tabindex', '0')
      const label = el.getAttribute('aria-label') ?? ''
      expect(label).toContain('Write docs.')
      expect(label).toContain('Priority: High.')
      expect(label).toContain('overdue')
      expect(label).toContain('Assigned to Ada.')
    })

    it.each(['{Enter}', ' '])('opens edit with the %s key', async (key) => {
      const onEdit = vi.fn()
      render(<Card card={base} onEdit={onEdit} />)
      screen.getByRole('button').focus()
      await userEvent.keyboard(key)
      expect(onEdit).toHaveBeenCalledTimes(1)
    })

    it('hides the decorative assignee initial from screen readers', () => {
      render(<Card card={base} onEdit={() => {}} />)
      expect(screen.getByText('A')).toHaveAttribute('aria-hidden', 'true')
    })
  })
})
