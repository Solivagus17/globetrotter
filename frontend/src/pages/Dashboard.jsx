import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'

function tripDurationDays(start, end) {
  if (!start || !end) return null
  const ms = new Date(end) - new Date(start)
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)) + 1)
}

function tripStatus(start, end) {
  const today = new Date().toISOString().slice(0, 10)
  if (!start || !end) return 'draft'
  if (today < start) return 'upcoming'
  if (today > end) return 'past'
  return 'active'
}

const STATUS_LABEL = { draft: 'Draft', upcoming: 'Upcoming', active: 'In progress', past: 'Completed' }

export default function Dashboard() {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    api.listTrips()
      .then(setTrips)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete(e, id) {
    e.stopPropagation()
    if (!confirm('Delete this trip?')) return
    await api.deleteTrip(id)
    setTrips(trips.filter(t => t.id !== id))
  }

  if (loading) return <div className="page-loading">Loading your trips…</div>

  const upcomingCount = trips.filter(t => tripStatus(t.start_date, t.end_date) === 'upcoming').length
  const totalDays = trips.reduce((sum, t) => sum + (tripDurationDays(t.start_date, t.end_date) || 0), 0)

  return (
    <div className="page">
      <div className="dash-header reveal">
        <div>
          <h2>My Trips</h2>
          <p className="muted">Everything you're planning, in one place.</p>
        </div>
        <Link to="/trips/new" className="btn">+ New Trip</Link>
      </div>

      {trips.length > 0 && (
        <div className="stat-row">
          <div className="stat-card reveal reveal-d1">
            <span className="stat-value">{trips.length}</span>
            <span className="stat-label">Total trips</span>
          </div>
          <div className="stat-card reveal reveal-d2">
            <span className="stat-value">{upcomingCount}</span>
            <span className="stat-label">Upcoming</span>
          </div>
          <div className="stat-card reveal reveal-d3">
            <span className="stat-value">{totalDays}</span>
            <span className="stat-label">Days planned</span>
          </div>
        </div>
      )}

      {error && <p className="error">{error}</p>}

      {trips.length === 0 && (
        <div className="empty-state reveal">
          <div className="empty-icon">✈️</div>
          <h3>No trips yet</h3>
          <p className="muted">Plan your first adventure and watch it come together here.</p>
          <Link to="/trips/new" className="btn">Plan Your First Trip</Link>
        </div>
      )}

      <div className="trip-grid">
        {trips.map((trip, i) => {
          const status = tripStatus(trip.start_date, trip.end_date)
          const days = tripDurationDays(trip.start_date, trip.end_date)
          const delayClass = i < 10 ? `reveal-d${i + 1}` : 'reveal-d10'
          return (
            <div
              key={trip.id}
              className={`trip-card reveal ${delayClass}`}
              onClick={() => navigate(`/trips/${trip.id}/builder`)}
              style={{ cursor: 'pointer' }}
            >
              {trip.cover_photo_url && (
                <div className="trip-cover">
                  <img src={trip.cover_photo_url} alt={`${trip.name} cover`} />
                </div>
              )}
              <div className={trip.cover_photo_url ? 'trip-card-body' : 'trip-card-body-no-cover'}>
                <div className="trip-card-top">
                  <span className={`status-pill status-${status}`}>{STATUS_LABEL[status]}</span>
                  <button
                    className="trip-menu-btn"
                    title="Delete trip"
                    onClick={(e) => handleDelete(e, trip.id)}
                  >×</button>
                </div>
                <h3>{trip.name}</h3>
                <p className="muted trip-dates">
                  {trip.start_date || 'No dates'}{trip.end_date ? ` → ${trip.end_date}` : ''}
                  {days ? ` · ${days}d` : ''}
                </p>
                {trip.description && <p className="trip-desc">{trip.description}</p>}
                <div className="trip-card-footer">
                  <Link to={`/trips/${trip.id}/edit`} className="btn secondary small" onClick={e => e.stopPropagation()}>Edit</Link>
                  <Link to={`/trips/${trip.id}/view`} className="btn secondary small" onClick={e => e.stopPropagation()}>View</Link>
                  <Link to={`/trips/${trip.id}/budget`} className="btn secondary small" onClick={e => e.stopPropagation()}>Budget</Link>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}