import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import './AuthForm.css'

// Dev-only: shown when VITE_TEST_EMAIL / VITE_TEST_PASSWORD are set in .env.local.
const testEmail: string | undefined = import.meta.env.DEV ? import.meta.env.VITE_TEST_EMAIL : undefined
const testPassword: string | undefined = import.meta.env.DEV ? import.meta.env.VITE_TEST_PASSWORD : undefined

export default function AuthForm() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    if (mode === 'sign-in') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage(error.message)
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) setMessage(error.message)
      else if (!data.session) setMessage('Check your email to confirm your account, then sign in.')
    }
    setBusy(false)
  }

  return (
    <div className="auth">
      <h1>FlowBoard</h1>
      <p className="auth__sub">Sign in to manage your boards</p>
      {testEmail && testPassword && (
        <div className="auth__test">
          <strong>Test account</strong>
          <span>Email: {testEmail}</span>
          <span>Password: {testPassword}</span>
          <button
            type="button"
            className="auth__toggle"
            onClick={() => {
              setMode('sign-in')
              setEmail(testEmail)
              setPassword(testPassword)
            }}
          >
            Fill in credentials
          </button>
        </div>
      )}
      <form className="auth__card" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field__label">Email</span>
          <input
            className="input"
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="field">
          <span className="field__label">Password</span>
          <input
            className="input"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {message && (
          <p className="auth__message" role="alert">
            {message}
          </p>
        )}
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {mode === 'sign-in' ? 'Sign in' : 'Create account'}
        </button>
        <button
          type="button"
          className="auth__toggle"
          onClick={() => {
            setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')
            setMessage(null)
          }}
        >
          {mode === 'sign-in' ? "Don't have an account? Sign up" : 'Have an account? Sign in'}
        </button>
      </form>
    </div>
  )
}
