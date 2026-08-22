import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useToast } from '../context/ToastContext'
import {
  IconPlane,
  IconMap,
  IconWallet,
  IconBookmark,
  IconSearch,
  IconCompass,
  IconPin,
  IconUtensils,
  IconBed,
  IconLandmark,
  IconTrash,
  IconPlus,
} from '../components/Icons'

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

function getDaysUntil(startDate) {
  if (!startDate) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(startDate)
  target.setHours(0, 0, 0, 0)
  const diffDays = Math.round((target - now) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return null
  if (diffDays === 0) return 'Starts today'
  if (diffDays === 1) return 'Starts tomorrow'
  return `in ${diffDays} days`
}

const STATUS_LABEL = { draft: 'Draft', upcoming: 'Upcoming', active: 'In progress', past: 'Completed' }

export default function Dashboard() {
  const [trips, setTrips] = useState([])
  const [saves, setSaves] = useState([])
  const [tripDaysMap, setTripDaysMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const toast = useToast()

  useEffect(() => {
    async function loadDashboard() {
      let tripsData = []
      let savesData = []

      try {
        tripsData = await api.listTrips() || []
      } catch (e) {
        console.warn('Could not load trips:', e)
      }

      try {
        savesData = await api.listSaves() || []
      } catch (e) {
        console.warn('Could not load saves:', e)
      }

      setTrips(tripsData)
      setSaves(savesData)

      // Load days data for each trip to compute overall budget & planned items
      const daysMap = {}
      for (const t of tripsData) {
        try {
          const d = await api.getTripDays(t.id)
          daysMap[t.id] = d.days || []
        } catch (e) {
          daysMap[t.id] = []
        }
      }
      setTripDaysMap(daysMap)
      setLoading(false)
    }

    loadDashboard()
  }, [])

  async function handleDelete(e, id) {
    e.stopPropagation()
    if (!confirm('Delete this trip?')) return
    try {
      await api.deleteTrip(id)
      setTrips(trips.filter(t => t.id !== id))
      toast.success('Trip deleted.')
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function handleDuplicate(e, id) {
    e.stopPropagation()
    try {
      const cloned = await api.duplicateTrip(id)
      setTrips(prev => [cloned, ...prev])
      toast.success('✨ Trip duplicated successfully!')
    } catch (err) {
      toast.error(err.message || 'Failed to duplicate trip.')
    }
  }

  if (loading) {
    return (
      <div className="page dashboard-page">
        <div className="dashboard-stats-grid">
          <div className="skeleton" style={{ height: 95, borderRadius: 16 }} />
          <div className="skeleton" style={{ height: 95, borderRadius: 16 }} />
          <div className="skeleton" style={{ height: 95, borderRadius: 16 }} />
          <div className="skeleton" style={{ height: 95, borderRadius: 16 }} />
        </div>
        <div className="dashboard-main-split">
          <div className="dashboard-trips-section">
            <div className="skeleton" style={{ height: 260, borderRadius: 16, marginBottom: 16 }} />
            <div className="skeleton" style={{ height: 260, borderRadius: 16 }} />
          </div>
          <div className="dashboard-side-column">
            <div className="skeleton" style={{ height: 320, borderRadius: 16 }} />
          </div>
        </div>
      </div>
    )
  }

  // Aggregate stats
  const totalDays = trips.reduce((sum, t) => {
    const daysArr = tripDaysMap[t.id] || []
    const duration = tripDurationDays(t.start_date, t.end_date) || 0
    return sum + Math.max(daysArr.length, duration, 1)
  }, 0)
  
  let totalBudget = 0
  let totalPlacesCount = 0
  const categorySpend = { food: 0, stay: 0, sightseeing: 0, flight: 0 }
  const destinationsSet = new Set()

  trips.forEach(t => {
    const dest = t.destination_city || t.description
    if (dest) destinationsSet.add(dest.toLowerCase().trim())

    const days = tripDaysMap[t.id] || []
    days.forEach(d => {
      if (d.city_name) destinationsSet.add(d.city_name.toLowerCase().trim())
      ;(d.items || []).forEach(it => {
        const cost = parseFloat(it.cost) || 0
        totalBudget += cost
        totalPlacesCount += 1
        const cat = (it.category || 'sightseeing').toLowerCase()
        if (categorySpend[cat] !== undefined) categorySpend[cat] += cost
        else if (cat === 'place') categorySpend.sightseeing += cost
      })
    })
  })

  const upcomingTripsCount = trips.filter(t => tripStatus(t.start_date, t.end_date) === 'upcoming').length
  const activeTripsCount = trips.filter(t => tripStatus(t.start_date, t.end_date) === 'active').length

  const maxCatCost = Math.max(1, ...Object.values(categorySpend))

  return (
    <div className="page dashboard-page">
      {/* Header & Quick Action Hub */}
      <div className="dash-header-section reveal">
        <div className="dash-title-wrap">
          <h2>Travel Dashboard</h2>
          <p className="muted">Your all-in-one travel control center. Manage itineraries, budget analytics, and saved places.</p>
        </div>
        <div className="dash-actions-row">
          <Link to="/trips/new" className="btn small">
            <IconPlus size={14} /> Plan New Trip
          </Link>
          <Link to="/discover" className="btn secondary small">
            <IconSearch size={14} /> Discover Places
          </Link>
        </div>
      </div>

      {error && <div className="profile-alert-error reveal"><span>{error}</span></div>}

      {/* Top 4 Key Metric Cards */}
      <div className="dashboard-stats-grid reveal reveal-d1">
        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: 'rgba(245, 180, 41, 0.15)', color: '#E0A11C' }}>
            <IconMap size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Itineraries</span>
            <h3 className="stat-value">{trips.length} {trips.length === 1 ? 'Trip' : 'Trips'}</h3>
            <span className="stat-subtext">
              {activeTripsCount > 0 ? `${activeTripsCount} Active · ${upcomingTripsCount} Upcoming` : `${upcomingTripsCount} Upcoming`}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#2563eb' }}>
            <IconCompass size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Travel Days Planned</span>
            <h3 className="stat-value">{totalDays} {totalDays === 1 ? 'Day' : 'Days'}</h3>
            <span className="stat-subtext">
              {destinationsSet.size > 0 ? `${destinationsSet.size} Destinations` : 'Across your trips'}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669' }}>
            <IconWallet size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Estimated Budget</span>
            <h3 className="stat-value">₹{Math.round(totalBudget).toLocaleString('en-IN')}</h3>
            <span className="stat-subtext">
              {totalPlacesCount} {totalPlacesCount === 1 ? 'place/activity' : 'places/activities'}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: 'rgba(168, 85, 247, 0.12)', color: '#9333ea' }}>
            <IconBookmark size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Saved Places</span>
            <h3 className="stat-value">{saves.length} {saves.length === 1 ? 'Place' : 'Places'}</h3>
            <span className="stat-subtext">
              Bookmarked pool
            </span>
          </div>
        </div>
      </div>

      {/* Dashboard 2-Column Split: Active Trips & Budget Analytics */}
      <div className="dashboard-main-split">
        {/* Left Column: Trips Grid */}
        <div className="dashboard-trips-section">
          <div className="row-between reveal reveal-d2" style={{ marginBottom: 18 }}>
            <div>
              <h3>My Trips</h3>
              <p className="muted" style={{ fontSize: '13px' }}>Click any card to open the TripAdvisor-style Day Planner.</p>
            </div>
            <Link to="/trips/new" className="btn secondary small">+ Add Trip</Link>
          </div>

          {trips.length === 0 ? (
            <div className="empty-state reveal reveal-d2">
              <div className="empty-icon-wrap">
                <IconPlane size={36} />
              </div>
              <h3>No trips yet</h3>
              <p className="muted">Plan your next adventure and organize everything day-by-day.</p>
              <Link to="/trips/new" className="btn">Plan Your First Trip</Link>
            </div>
          ) : (
            <div className="trip-grid">
              {trips.map((trip, i) => {
                const status = tripStatus(trip.start_date, trip.end_date)
                const days = tripDurationDays(trip.start_date, trip.end_date)
                const countdown = status === 'upcoming' ? getDaysUntil(trip.start_date) : null
                const delayClass = i < 8 ? `reveal-d${i + 1}` : 'reveal-d8'
                const daysCount = (tripDaysMap[trip.id] || []).length

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
                        <div className="row-center" style={{ gap: 6 }}>
                          <span className={`status-pill status-${status}`}>{STATUS_LABEL[status]}</span>
                          {countdown && (
                            <span className="countdown-pill" title={`Starts in ${countdown}`}>
                              ⏳ {countdown}
                            </span>
                          )}
                        </div>
                        <div className="row-center" style={{ gap: 4 }}>
                          <button
                            type="button"
                            className="trip-menu-btn"
                            title="Duplicate trip"
                            onClick={(e) => handleDuplicate(e, trip.id)}
                            style={{ fontSize: '13px' }}
                          >
                            📋
                          </button>
                          <button
                            type="button"
                            className="trip-menu-btn"
                            title="Delete trip"
                            onClick={(e) => handleDelete(e, trip.id)}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                      <h3>{trip.name}</h3>
                      <p className="muted trip-dates">
                        {trip.start_date || 'No dates'}{trip.end_date ? ` → ${trip.end_date}` : ''}
                        {days ? ` · ${days}d` : ''}
                      </p>
                      {trip.description && <p className="trip-desc">{trip.description}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right Column: Mini Budget Breakdown & Saved Highlights */}
        <div className="dashboard-side-column">
          {/* Quick Budget Card */}
          <div className="dashboard-widget-card reveal reveal-d2">
            <div className="widget-header">
              <div>
                <h4>Budget Analytics</h4>
                <span className="muted">Estimated spending by category</span>
              </div>
              <Link to="/budget" className="btn secondary small">Full Budget</Link>
            </div>

            <div className="budget-bars" style={{ marginTop: 16 }}>
              <div className="budget-row">
                <span className="budget-label"><IconBed size={13} /> Stays</span>
                <div className="budget-bar-track">
                  <div className="budget-bar-fill" style={{ width: `${(categorySpend.stay / maxCatCost) * 100}%` }} />
                </div>
                <span className="budget-value">₹{Math.round(categorySpend.stay).toLocaleString('en-IN')}</span>
              </div>

              <div className="budget-row">
                <span className="budget-label"><IconUtensils size={13} /> Food</span>
                <div className="budget-bar-track">
                  <div className="budget-bar-fill" style={{ width: `${(categorySpend.food / maxCatCost) * 100}%` }} />
                </div>
                <span className="budget-value">₹{Math.round(categorySpend.food).toLocaleString('en-IN')}</span>
              </div>

              <div className="budget-row">
                <span className="budget-label"><IconLandmark size={13} /> Sights</span>
                <div className="budget-bar-track">
                  <div className="budget-bar-fill" style={{ width: `${(categorySpend.sightseeing / maxCatCost) * 100}%` }} />
                </div>
                <span className="budget-value">₹{Math.round(categorySpend.sightseeing).toLocaleString('en-IN')}</span>
              </div>

              <div className="budget-row">
                <span className="budget-label"><IconPlane size={13} /> Flights</span>
                <div className="budget-bar-track">
                  <div className="budget-bar-fill" style={{ width: `${(categorySpend.flight / maxCatCost) * 100}%` }} />
                </div>
                <span className="budget-value">₹{Math.round(categorySpend.flight).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Saved Places Spotlight Card */}
          <div className="dashboard-widget-card reveal reveal-d3" style={{ marginTop: 24 }}>
            <div className="widget-header">
              <div>
                <h4>Saved Places ({saves.length})</h4>
                <span className="muted">Bookmarked attractions & dining</span>
              </div>
              <Link to="/saves" className="btn secondary small">View All</Link>
            </div>

            {saves.length === 0 ? (
              <p className="muted" style={{ fontSize: '13px', marginTop: 14 }}>
                No saved places yet. Browse the <Link to="/discover" className="link-btn">Discover</Link> page to bookmark places.
              </p>
            ) : (
              <div className="dash-saves-list" style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {saves.slice(0, 4).map(s => (
                  <div key={s.id} className="dash-save-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="dash-save-bullet">
                        {s.category === 'food' ? <IconUtensils size={13} /> : <IconPin size={13} />}
                      </div>
                      <div>
                        <strong style={{ fontSize: '14px', display: 'block' }}>{s.name}</strong>
                        <span className="muted" style={{ fontSize: '12px' }}>{s.city_name} · {s.category}</span>
                      </div>
                    </div>
                    {s.cost > 0 && <span className="save-cost-text" style={{ margin: 0 }}>₹{s.cost}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}