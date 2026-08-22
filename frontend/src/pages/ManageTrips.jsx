import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import {
  IconMap,
  IconPlus,
  IconSearch,
  IconCompass,
  IconWallet,
  IconTrash,
  IconCalendar,
  IconDownload,
  IconPin,
} from '../components/Icons'
import { generateItineraryPDF } from '../pdfService'

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

const STATUS_BADGE = {
  draft: { label: 'Draft', class: 'status-draft' },
  upcoming: { label: 'Upcoming', class: 'status-upcoming' },
  active: { label: 'In Progress', class: 'status-active' },
  past: { label: 'Completed', class: 'status-past' },
}

export default function ManageTrips() {
  const [trips, setTrips] = useState([])
  const [tripDaysMap, setTripDaysMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'table'
  const [actionSuccess, setActionSuccess] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    async function loadTrips() {
      try {
        const data = await api.listTrips() || []
        setTrips(data)

        // Load day items for each trip to compute accurate budgets and activity counts
        const daysMap = {}
        for (const t of data) {
          try {
            const res = await api.getTripDays(t.id)
            daysMap[t.id] = res.days || []
          } catch (e) {
            daysMap[t.id] = []
          }
        }
        setTripDaysMap(daysMap)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadTrips()
  }, [])

  async function handleDeleteTrip(e, tripId, tripName) {
    e.stopPropagation()
    if (!confirm(`Are you sure you want to delete "${tripName}"? This action cannot be undone.`)) return

    try {
      await api.deleteTrip(tripId)
      setTrips(prev => prev.filter(t => t.id !== tripId))
      setActionSuccess(`Deleted "${tripName}"`)
      setTimeout(() => setActionSuccess(''), 3000)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleExportPDF(e, trip) {
    e.stopPropagation()
    try {
      const days = tripDaysMap[trip.id] || []
      generateItineraryPDF(trip, days)
      setActionSuccess(`Exported PDF for ${trip.name}!`)
      setTimeout(() => setActionSuccess(''), 3000)
    } catch (err) {
      setError('Could not export PDF. Please open the trip planner to export.')
    }
  }

  // Calculate Aggregates
  const totalTripsCount = trips.length
  const upcomingCount = trips.filter(t => tripStatus(t.start_date, t.end_date) === 'upcoming').length
  const activeCount = trips.filter(t => tripStatus(t.start_date, t.end_date) === 'active').length
  const completedCount = trips.filter(t => tripStatus(t.start_date, t.end_date) === 'past').length
  const draftCount = trips.filter(t => tripStatus(t.start_date, t.end_date) === 'draft').length

  const totalDays = trips.reduce((sum, t) => {
    const daysArr = tripDaysMap[t.id] || []
    return sum + Math.max(daysArr.length, tripDurationDays(t.start_date, t.end_date) || 1)
  }, 0)

  let cumulativeBudget = 0
  trips.forEach(t => {
    const days = tripDaysMap[t.id] || []
    days.forEach(d => {
      ;(d.items || []).forEach(it => {
        cumulativeBudget += parseFloat(it.cost) || 0
      })
    })
  })

  // Filter & Search
  const filteredTrips = trips.filter(t => {
    const status = tripStatus(t.start_date, t.end_date)
    if (statusFilter !== 'all' && status !== statusFilter) return false

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const matchName = (t.name || '').toLowerCase().includes(q)
      const matchDest = (t.destination_city || t.description || '').toLowerCase().includes(q)
      if (!matchName && !matchDest) return false
    }

    return true
  })

  // Sort
  const sortedTrips = [...filteredTrips].sort((a, b) => {
    const daysA = tripDaysMap[a.id] || []
    const daysB = tripDaysMap[b.id] || []
    const costA = daysA.reduce((sum, d) => sum + (d.items || []).reduce((s, it) => s + (parseFloat(it.cost) || 0), 0), 0)
    const costB = daysB.reduce((sum, d) => sum + (d.items || []).reduce((s, it) => s + (parseFloat(it.cost) || 0), 0), 0)

    if (sortBy === 'newest') return new Date(b.created_at || b.start_date || 0) - new Date(a.created_at || a.start_date || 0)
    if (sortBy === 'start_date') return new Date(a.start_date || '9999') - new Date(b.start_date || '9999')
    if (sortBy === 'budget_high') return costB - costA
    if (sortBy === 'duration') return daysB.length - daysA.length
    return 0
  })

  if (loading) return <div className="page-loading">Loading your trip collection...</div>

  return (
    <div className="page manage-trips-page">
      {/* Top Header */}
      <div className="dash-header-section reveal">
        <div className="dash-title-wrap">
          <h2>Manage All Trips</h2>
          <p className="muted">Organize, customize, and review all your travel journeys in one unified hub.</p>
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

      {actionSuccess && (
        <div className="profile-alert-success reveal">
          <span>✓ {actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="profile-alert-error reveal">
          <span>{error}</span>
        </div>
      )}

      {/* Summary KPI Stats Bar */}
      <div className="dashboard-stats-grid reveal reveal-d1" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: 'rgba(245, 180, 41, 0.15)', color: '#E0A11C' }}>
            <IconMap size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Itineraries</span>
            <h3 className="stat-value">{totalTripsCount} Trips</h3>
            <span className="stat-subtext">{upcomingCount} Upcoming · {activeCount} Active</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#2563eb' }}>
            <IconCalendar size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Travel Days</span>
            <h3 className="stat-value">{totalDays} Days</h3>
            <span className="stat-subtext">Planned schedules</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669' }}>
            <IconWallet size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Estimated Budget</span>
            <h3 className="stat-value">₹{Math.round(cumulativeBudget).toLocaleString('en-IN')}</h3>
            <span className="stat-subtext">Cumulative cost</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: 'rgba(168, 85, 247, 0.12)', color: '#9333ea' }}>
            <IconCompass size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Completed Journeys</span>
            <h3 className="stat-value">{completedCount} Finished</h3>
            <span className="stat-subtext">{draftCount} in drafts</span>
          </div>
        </div>
      </div>

      {/* Filter, Search & Layout Toolbar */}
      <div className="manage-trips-toolbar reveal reveal-d2">
        <div className="manage-search-box">
          <IconSearch size={15} className="search-icon" />
          <input
            type="text"
            placeholder="Search by trip name or destination..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button type="button" className="search-clear-btn" onClick={() => setSearchQuery('')}>✕</button>
          )}
        </div>

        <div className="manage-status-chips">
          {[
            { id: 'all', label: `All (${totalTripsCount})` },
            { id: 'upcoming', label: `Upcoming (${upcomingCount})` },
            { id: 'active', label: `In Progress (${activeCount})` },
            { id: 'past', label: `Completed (${completedCount})` },
            { id: 'draft', label: `Drafts (${draftCount})` },
          ].map(chip => (
            <button
              key={chip.id}
              type="button"
              className={`chip ${statusFilter === chip.id ? 'active' : ''}`}
              onClick={() => setStatusFilter(chip.id)}
            >
              {chip.label}
            </button>
          ))}
        </div>

        <div className="manage-controls-right">
          <select
            className="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="newest">Recently Created</option>
            <option value="start_date">Departure Date</option>
            <option value="budget_high">Budget: High to Low</option>
            <option value="duration">Longest Duration</option>
          </select>

          <div className="view-mode-toggle">
            <button
              type="button"
              className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              ⊞ Grid
            </button>
            <button
              type="button"
              className={`view-mode-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              ☰ Table
            </button>
          </div>
        </div>
      </div>

      {/* Trips Display */}
      {sortedTrips.length === 0 ? (
        <div className="empty-state reveal">
          <div className="empty-icon-wrap">
            <IconMap size={32} />
          </div>
          <h3>No trips match your filter</h3>
          <p className="muted">
            {searchQuery
              ? `No itineraries found matching "${searchQuery}".`
              : 'Start by planning a trip with our smart TripAdvisor-style day planner.'}
          </p>
          <Link to="/trips/new" className="btn">+ Plan New Trip</Link>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="trips-grid reveal reveal-d3">
          {sortedTrips.map(t => {
            const stKey = tripStatus(t.start_date, t.end_date)
            const stBadge = STATUS_BADGE[stKey]
            const days = tripDaysMap[t.id] || []
            const duration = Math.max(days.length, tripDurationDays(t.start_date, t.end_date) || 1)
            const tripCost = days.reduce((sum, d) => sum + (d.items || []).reduce((s, it) => s + (parseFloat(it.cost) || 0), 0), 0)
            const destination = t.destination_city || t.description || 'Custom Destination'

            return (
              <div
                key={t.id}
                className="trip-card"
                onClick={() => navigate(`/trips/${t.id}/builder`)}
              >
                <div className="trip-card-header">
                  <div className="row-between">
                    <span className="destination-badge">
                      <IconPin size={11} /> {destination}
                    </span>
                    <span className={`status-pill ${stBadge.class}`}>
                      {stBadge.label}
                    </span>
                  </div>
                  <h4 className="trip-card-title">{t.name}</h4>
                  <p className="trip-card-desc">{t.description || 'Custom travel itinerary.'}</p>
                </div>

                <div className="trip-card-body">
                  <div className="trip-card-stat">
                    <span className="trip-stat-label">DATES & SPAN</span>
                    <span className="trip-stat-val">
                      {t.start_date ? `${t.start_date} → ${t.end_date || ''}` : 'Flexible dates'}
                    </span>
                  </div>

                  <div className="trip-card-stat">
                    <span className="trip-stat-label">DURATION & ITEMS</span>
                    <span className="trip-stat-val">
                      {duration} {duration === 1 ? 'Day' : 'Days'} · {days.reduce((s, d) => s + (d.items || []).length, 0)} items
                    </span>
                  </div>

                  <div className="trip-card-stat">
                    <span className="trip-stat-label">ESTIMATED BUDGET</span>
                    <span className="trip-stat-val trip-cost-highlight">
                      ₹{Math.round(tripCost).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="trip-card-footer" onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <Link to={`/trips/${t.id}/builder`} className="btn small">
                      Open Planner
                    </Link>
                    <button
                      type="button"
                      className="btn secondary small"
                      onClick={(e) => handleExportPDF(e, t)}
                      title="Export PDF Itinerary"
                    >
                      <IconDownload size={13} />
                    </button>
                    <Link to={`/trips/${t.id}/edit`} className="btn secondary small" title="Edit Trip">
                      Edit
                    </Link>
                  </div>
                  <button
                    type="button"
                    className="trip-delete-btn"
                    onClick={(e) => handleDeleteTrip(e, t.id, t.name)}
                    title="Delete Trip"
                  >
                    <IconTrash size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Table View */
        <div className="manage-trips-table-card reveal reveal-d3">
          <table className="manage-trips-table">
            <thead>
              <tr>
                <th>Trip Name & Destination</th>
                <th>Status</th>
                <th>Departure / Dates</th>
                <th>Duration</th>
                <th>Est. Budget (₹)</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedTrips.map(t => {
                const stKey = tripStatus(t.start_date, t.end_date)
                const stBadge = STATUS_BADGE[stKey]
                const days = tripDaysMap[t.id] || []
                const duration = Math.max(days.length, tripDurationDays(t.start_date, t.end_date) || 1)
                const tripCost = days.reduce((sum, d) => sum + (d.items || []).reduce((s, it) => s + (parseFloat(it.cost) || 0), 0), 0)
                const destination = t.destination_city || t.description || 'Custom Destination'

                return (
                  <tr key={t.id} onClick={() => navigate(`/trips/${t.id}/builder`)} className="manage-table-row">
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '14px' }}>{t.name}</div>
                      <div className="muted" style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <IconPin size={11} /> {destination}
                      </div>
                    </td>
                    <td>
                      <span className={`status-pill ${stBadge.class}`}>{stBadge.label}</span>
                    </td>
                    <td>
                      <div style={{ fontSize: '13px', color: 'var(--text)' }}>
                        {t.start_date || 'Flexible'} {t.end_date ? `→ ${t.end_date}` : ''}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{duration} Days</span>
                    </td>
                    <td>
                      <strong style={{ color: 'var(--primary-dark)' }}>₹{Math.round(tripCost).toLocaleString('en-IN')}</strong>
                    </td>
                    <td onClick={e => e.stopPropagation()} style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                        <Link to={`/trips/${t.id}/builder`} className="btn small" style={{ padding: '4px 10px', fontSize: '12px' }}>
                          Planner
                        </Link>
                        <button
                          type="button"
                          className="btn secondary small"
                          style={{ padding: '4px 8px' }}
                          onClick={(e) => handleExportPDF(e, t)}
                          title="Export PDF"
                        >
                          <IconDownload size={13} />
                        </button>
                        <Link to={`/trips/${t.id}/edit`} className="btn secondary small" style={{ padding: '4px 8px' }} title="Edit">
                          ✎
                        </Link>
                        <button
                          type="button"
                          className="trip-delete-btn"
                          onClick={(e) => handleDeleteTrip(e, t.id, t.name)}
                          title="Delete"
                        >
                          <IconTrash size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
