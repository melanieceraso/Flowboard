import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../lib/supabase', async () => (await import('../test/supabaseMock')).supabaseModule)

async function loadAuthForm() {
  vi.resetModules()
  return (await import('./AuthForm')).default
}

afterEach(() => vi.unstubAllEnvs())

describe('AuthForm', () => {
  it('signs in with the entered credentials', async () => {
    const AuthForm = await loadAuthForm()
    const { authMock } = await import('../test/supabaseMock')
    render(<AuthForm />)
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.co')
    await userEvent.type(screen.getByLabelText('Password'), 'secret1')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(authMock.signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.co', password: 'secret1' })
  })

  describe('audit regression: test credentials are dev-only', () => {
    it('shows them in dev when configured', async () => {
      vi.stubEnv('DEV', true)
      vi.stubEnv('VITE_TEST_EMAIL', 'test@example.com')
      vi.stubEnv('VITE_TEST_PASSWORD', 'hunter22')
      const AuthForm = await loadAuthForm()
      render(<AuthForm />)
      expect(screen.getByText(/test@example.com/)).toBeInTheDocument()
    })

    it('never renders them in production builds', async () => {
      vi.stubEnv('DEV', false)
      vi.stubEnv('VITE_TEST_EMAIL', 'test@example.com')
      vi.stubEnv('VITE_TEST_PASSWORD', 'hunter22')
      const AuthForm = await loadAuthForm()
      render(<AuthForm />)
      expect(screen.queryByText(/test@example.com/)).not.toBeInTheDocument()
      expect(screen.queryByText(/hunter22/)).not.toBeInTheDocument()
      expect(screen.queryByText('Test account')).not.toBeInTheDocument()
    })
  })
})
