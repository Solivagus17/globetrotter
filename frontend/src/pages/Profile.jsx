import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { IconPin, IconUser, IconCompass } from '../components/Icons'

const TRAVEL_STYLES = [
  'Backpacker',
  'Food & Culinary',
  'Culture & Heritage',
  'Adventure & Nature',
  'Luxury & Wellness',
  'Solo Explorer',
  'Family & Friends',
  'Photography Tour',
]

const AVATAR_INITIALS = ['GT', 'TR', 'EX', 'WN', 'VL', 'NV', 'OC', 'AL', 'SK', 'MR', 'JP', 'IN']

export default function Profile() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [error, setError] = useState('')

  // Form state
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [homeCity, setHomeCity] = useState('')
  const [selectedStyles, setSelectedStyles] = useState([])
  const [avatarInitials, setAvatarInitials] = useState('GT')
  const [currency, setCurrency] = useState('INR')
  const [distanceUnit, setDistanceUnit] = useState('km')

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser()
      if (data?.user) {
        setUser(data.user)
        const meta = data.user.user_metadata || {}
        const defaultName = meta.display_name || meta.full_name || data.user.email.split('@')[0]
        setDisplayName(defaultName)
        setBio(meta.bio || '')
        setHomeCity(meta.home_city || 'New Delhi, India')
        setSelectedStyles(meta.travel_styles || ['Food & Culinary', 'Culture & Heritage'])
        setAvatarInitials(meta.avatar_initials || defaultName.slice(0, 2).toUpperCase() || 'GT')
        setCurrency(meta.currency || 'INR')
        setDistanceUnit(meta.distance_unit || 'km')
      }
      setLoading(false)
    }
    loadUser()
  }, [])

  function toggleStyle(style) {
    if (selectedStyles.includes(style)) {
      setSelectedStyles(selectedStyles.filter(s => s !== style))
    } else {
      setSelectedStyles([...selectedStyles, style])
    }
  }

  async function handleSaveProfile(e) {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
    setSaving(true)

    try {
      const { error: updateErr } = await supabase.auth.updateUser({
        data: {
          display_name: displayName,
          bio,
          home_city: homeCity,
          travel_styles: selectedStyles,
          avatar_initials: avatarInitials,
          currency,
          distance_unit: distanceUnit,
        },
      })

      if (updateErr) throw updateErr

      localStorage.setItem('globetrotter_user_meta', JSON.stringify({
        display_name: displayName,
        avatar_initials: avatarInitials,
        home_city: homeCity,
      }))

      setSuccessMsg('Profile and settings updated successfully.')
      setTimeout(() => setSuccessMsg(''), 4000)
    } catch (err) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="page-loading">Loading your profile...</div>

  const email = user?.email || ''
  const createdAt = user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '2026'

  return (
    <div className="page profile-page">
      {/* Header */}
      <div className="row-between reveal">
        <div>
          <h2>Account & Profile</h2>
          <p className="muted">Manage your traveler profile, preferences, and journey settings.</p>
        </div>
        <Link to="/" className="btn secondary small">Back to My Trips</Link>
      </div>

      {successMsg && (
        <div className="profile-alert-success reveal">
          <span>✓ {successMsg}</span>
        </div>
      )}

      {error && (
        <div className="profile-alert-error reveal">
          <span>{error}</span>
        </div>
      )}

      <div className="profile-layout-grid reveal reveal-d1">
        {/* Left Column: Profile Card */}
        <div className="profile-card-side">
          <div className="profile-hero-card">
            <div className="profile-avatar-circle">{avatarInitials}</div>
            <h3 className="profile-hero-name">{displayName || 'Traveler'}</h3>
            <span className="profile-hero-email">{email}</span>
            {homeCity && <span className="profile-hero-city"><IconPin size={12} /> {homeCity}</span>}
            
            <div className="profile-hero-divider"></div>
            
            <div className="profile-hero-meta">
              <span>Member Since</span>
              <strong>{createdAt}</strong>
            </div>

            {selectedStyles.length > 0 && (
              <div className="profile-hero-tags">
                {selectedStyles.slice(0, 3).map((st, i) => (
                  <span key={i} className="profile-tag-pill">{st}</span>
                ))}
              </div>
            )}
          </div>

          {/* Quick Monogram Badge Chooser */}
          <div className="avatar-picker-card">
            <span className="field-label">Traveler Monogram Badge</span>
            <div className="avatar-options-grid">
              {AVATAR_INITIALS.map((init) => (
                <button
                  key={init}
                  type="button"
                  className={`avatar-option-btn ${avatarInitials === init ? 'active' : ''}`}
                  onClick={() => setAvatarInitials(init)}
                >
                  {init}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Settings Form */}
        <div className="profile-form-side">
          <form onSubmit={handleSaveProfile} className="profile-settings-form">
            <h3 className="form-section-title">Personal Information</h3>

            <div className="row">
              <label>Display Name
                <input
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="e.g. Alex River"
                  required
                />
              </label>

              <label>Home Base / City
                <input
                  value={homeCity}
                  onChange={e => setHomeCity(e.target.value)}
                  placeholder="e.g. Mumbai, India"
                />
              </label>
            </div>

            <label>Traveler Bio & Motto
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                rows={3}
                placeholder="Share your travel philosophy, favorite food adventures, or bucket list destinations..."
              />
            </label>

            <h3 className="form-section-title" style={{ marginTop: 24 }}>Travel Styles & Preferences</h3>
            <p className="muted" style={{ marginBottom: 12 }}>Select the styles that best describe how you explore new places:</p>
            
            <div className="travel-styles-grid">
              {TRAVEL_STYLES.map(style => {
                const isSelected = selectedStyles.includes(style)
                return (
                  <button
                    key={style}
                    type="button"
                    className={`travel-style-chip ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleStyle(style)}
                  >
                    <span>{style}</span>
                    {isSelected && <span className="check-mark">✓</span>}
                  </button>
                )
              })}
            </div>

            <h3 className="form-section-title" style={{ marginTop: 28 }}>Regional & Map Preferences</h3>

            <div className="row">
              <label>Default Currency
                <select value={currency} onChange={e => setCurrency(e.target.value)}>
                  <option value="INR">₹ Indian Rupee (INR)</option>
                  <option value="USD">$ US Dollar (USD)</option>
                  <option value="EUR">€ Euro (EUR)</option>
                  <option value="GBP">£ British Pound (GBP)</option>
                  <option value="JPY">¥ Japanese Yen (JPY)</option>
                </select>
              </label>

              <label>Distance Units
                <select value={distanceUnit} onChange={e => setDistanceUnit(e.target.value)}>
                  <option value="km">Kilometers (km)</option>
                  <option value="miles">Miles (mi)</option>
                </select>
              </label>

              <label>Language Preference
                <select defaultValue="en-US">
                  <option value="en-US">English (US)</option>
                  <option value="en-GB">English (UK)</option>
                  <option value="hi-IN">Hindi (हिंदी)</option>
                  <option value="fr-FR">French (Français)</option>
                  <option value="es-ES">Spanish (Español)</option>
                  <option value="de-DE">German (Deutsch)</option>
                </select>
              </label>
            </div>

            <div className="profile-form-footer">
              <button
                type="submit"
                className="btn"
                disabled={saving}
              >
                {saving ? 'Saving Changes...' : 'Save Profile & Settings'}
              </button>
            </div>
          </form>

          {/* Danger Zone: Delete Account */}
          <div className="profile-settings-form" style={{ marginTop: 28, borderColor: 'rgba(220, 38, 38, 0.3)', background: '#FEF2F2' }}>
            <h4 style={{ color: '#DC2626', marginBottom: 6 }}>Account Danger Zone</h4>
            <p className="muted" style={{ fontSize: '13px', marginBottom: 14 }}>
              Permanently remove your traveler profile, saved itineraries, and preferences from GlobeTrotter.
            </p>
            <button
              type="button"
              className="btn secondary small"
              style={{ color: '#DC2626', borderColor: '#DC2626', background: '#FFFFFF' }}
              onClick={async () => {
                if (window.confirm('Are you sure you want to sign out and clear your account session?')) {
                  await supabase.auth.signOut()
                  window.location.href = '/login'
                }
              }}
            >
              Delete / Reset Account Session
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
