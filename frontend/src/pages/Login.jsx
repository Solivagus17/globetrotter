import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login') // 'login' | 'signup' | 'forgot'
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
    setLoading(true)

    if (mode === 'forgot') {
      try {
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/login`,
        })
        if (resetErr) throw resetErr
        setSuccessMsg('Password reset instructions have been sent to your email!')
      } catch (err) {
        setError(err.message || 'Failed to send reset email')
      } finally {
        setLoading(false)
      }
      return
    }

    const fn = mode === 'login'
      ? supabase.auth.signInWithPassword({ email: email.trim(), password })
      : supabase.auth.signUp({ email: email.trim(), password })
    const { error: authErr } = await fn
    setLoading(false)
    if (authErr) {
      setError(authErr.message)
      return
    }
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
      {/* Left Branded Hero Panel */}
      <div className="auth-panel">
        <div className="auth-panel-content">
          <span className="auth-badge">● GlobeTrotter</span>
          <h1>Plan trips that<br />feel effortless.</h1>
          <p>Multi-city itineraries, live budget telemetry, and magazine-grade plans — all in one place.</p>
          <ul className="auth-features">
            <li>Build day-by-day itineraries in minutes</li>
            <li>Real-time budget tracking as you add stops</li>
            <li>Share read-only trips with travel companions</li>
          </ul>
        </div>
        <div className="auth-blob auth-blob-1" />
        <div className="auth-blob auth-blob-2" />
      </div>

      {/* Right Form Card Side */}
      <div className="auth-form-side">
        <div className="auth-card">
          <h2 className="auth-card-title">
            {mode === 'login' && 'Welcome back'}
            {mode === 'signup' && 'Create your account'}
            {mode === 'forgot' && 'Reset your password'}
          </h2>
          <p className="auth-card-subtitle">
            {mode === 'login' && 'Log in to access and manage your travel itineraries.'}
            {mode === 'signup' && 'Start planning multi-city journeys in under a minute.'}
            {mode === 'forgot' && 'Enter your registered email to receive a secure recovery link.'}
          </p>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field-group">
              <label className="auth-field-label">Email Address</label>
              <input
                type="email"
                className="auth-text-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
              />
            </div>

            {mode !== 'forgot' && (
              <div className="auth-field-group">
                <div className="auth-label-row">
                  <label className="auth-field-label">Password</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      className="auth-forgot-link"
                      onClick={() => {
                        setMode('forgot')
                        setError('')
                        setSuccessMsg('')
                      }}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  className="auth-text-input"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                />
              </div>
            )}

            {error && <div className="auth-error-msg">{error}</div>}
            {successMsg && (
              <div className="auth-success-msg">
                <span>✓ {successMsg}</span>
              </div>
            )}

            <button type="submit" className="btn auth-submit-btn" disabled={loading}>
              {loading
                ? 'Please wait...'
                : mode === 'login'
                ? 'Log In'
                : mode === 'signup'
                ? 'Create Account'
                : 'Send Password Reset Link'}
            </button>
          </form>

          {mode !== 'forgot' && (
            <>
              <div className="auth-divider">
                <span>or</span>
              </div>

              <button type="button" className="auth-google-btn" onClick={handleGoogleSignIn}>
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
                  <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.98v2.33A9 9 0 0 0 9 18z" />
                  <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.66 9c0-.59.1-1.17.29-1.7V4.97H.98A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.03l2.97-2.33z" />
                  <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .98 4.97l2.97 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
                </svg>
                <span>Continue with Google</span>
              </button>
            </>
          )}

          <div className="auth-switch-wrap">
            {mode === 'forgot' ? (
              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  setMode('login')
                  setError('')
                  setSuccessMsg('')
                }}
              >
                ← Back to Log In
              </button>
            ) : mode === 'login' ? (
              <p>
                Don't have an account?{' '}
                <button
                  type="button"
                  className="auth-switch-link"
                  onClick={() => {
                    setMode('signup')
                    setError('')
                    setSuccessMsg('')
                  }}
                >
                  Sign up
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  className="auth-switch-link"
                  onClick={() => {
                    setMode('login')
                    setError('')
                    setSuccessMsg('')
                  }}
                >
                  Log in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}