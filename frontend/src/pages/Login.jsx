import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const fn = mode === 'login'
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password })
    const { error } = await fn
    setLoading(false)
    if (error) { setError(error.message); return }
    navigate('/')
  }

  async function handleGoogleSignIn() {
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) setError(error.message)
  }

  return (
    <div className="auth-screen">
      <div className="auth-panel">
        <div className="auth-panel-content">
          <span className="auth-badge">● GlobeTrotter</span>
          <h1>Plan trips that<br />feel effortless.</h1>
          <p>Multi-city itineraries, live budgets, and a shareable plan — all in one place.</p>
          <ul className="auth-features">
            <li>Build day-by-day itineraries in minutes</li>
            <li>See your budget update as you add activities</li>
            <li>Share a read-only trip with friends</li>
          </ul>
        </div>
        <div className="auth-blob auth-blob-1" />
        <div className="auth-blob auth-blob-2" />
      </div>

      <div className="auth-form-side">
        <div className="auth-card">
          <h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
          <p className="subtitle">
            {mode === 'login' ? 'Log in to see your trips.' : 'Start planning in under a minute.'}
          </p>

          <form onSubmit={handleSubmit}>
            <label>Email
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" />
            </label>
            <label>Password
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} placeholder="••••••••" />
            </label>
            {error && <p className="error">{error}</p>}
            <button type="submit" className="btn" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Please wait...' : mode === 'login' ? 'Log In' : 'Sign Up'}
            </button>
          </form>

          <div className="divider">or</div>
          <button type="button" className="btn secondary google-btn" onClick={handleGoogleSignIn}>
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.98v2.33A9 9 0 0 0 9 18z" />
              <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.66 9c0-.59.1-1.17.29-1.7V4.97H.98A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.03l2.97-2.33z" />
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .98 4.97l2.97 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
            </svg>
            Continue with Google
          </button>

          <p className="auth-switch">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button className="link-btn" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
              {mode === 'login' ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}