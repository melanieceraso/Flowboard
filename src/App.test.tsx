import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { authMock, resetDb } from './test/supabaseMock'

vi.mock('./lib/supabase', async () => (await import('./test/supabaseMock')).supabaseModule)

const session = (id: string, email: string) => ({ user: { id, email } })

describe('App', () => {
  beforeEach(() => resetDb([]))

  it('shows the sign-in form without a session', async () => {
    authMock.getSession.mockResolvedValueOnce({ data: { session: null } })
    render(<App />)
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('shows the board and signs out with a session', async () => {
    authMock.getSession.mockResolvedValueOnce({ data: { session: session('u1', 'zed@x.co') } as never })
    render(<App />)
    expect(await screen.findByRole('button', { name: 'New card' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(authMock.signOut).toHaveBeenCalled()
  })

  it('audit regression: remounts the board when the user changes', async () => {
    let notify: (e: string, s: unknown) => void = () => {}
    authMock.onAuthStateChange.mockImplementationOnce(((cb: typeof notify) => {
      notify = cb
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    }) as never)
    authMock.getSession.mockResolvedValueOnce({ data: { session: session('u1', 'a@x.co') } as never })
    render(<App />)
    await userEvent.click(await screen.findByRole('button', { name: 'New card' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    const { act } = await import('@testing-library/react')
    act(() => notify('SIGNED_IN', session('u2', 'b@x.co')))
    await screen.findByRole('button', { name: 'New card' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
