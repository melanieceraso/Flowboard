import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import Board from './components/Board'
import AuthForm from './components/AuthForm'
import logoIcon from './assets/logo.svg'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!ready) return null

  return (
    <>
      <nav className="navbar">
        <div className="navbar__left">
          <span className="navbar__logo">
            <img src={logoIcon} alt="" width={20} height={20} />
          </span>
          <span>FlowBoard</span>
          {session && <span>Boards</span>}
        </div>
        {session && (
          <div className="navbar__right">
            <span className="navbar__avatar">{session.user.email?.charAt(0).toUpperCase() ?? 'U'}</span>
            <button type="button" className="navbar__signout" onClick={() => void supabase.auth.signOut()}>
              Sign out
            </button>
          </div>
        )}
      </nav>
      {session ? <Board key={session.user.id} /> : <AuthForm />}
    </>
  )
}
