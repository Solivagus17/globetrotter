import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useToast } from '../context/ToastContext'
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
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'table'
  const navigate = useNavigate()
  const toast = useToast()

  async function loadTrips() {
    try {
      const data = await api.listTrips() || []
      setTrips(data)

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
      toast.error(err.message || 'Failed to load trips')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTrips()
  }, [])

  async function handleDeleteTrip(e, tripId, tripName) {
    e.stopPropagation()
    if (!confirm(`Are you sure you want to delete "${tripName}"? This action cannot be undone.`)) return

    try {
      await api.deleteTrip(tripId)
      setTrips(prev => prev.filter(t => t.id !== tripId))
      toast.success(`Deleted "${tripName}"`)
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function handleDuplicateTrip(e, tripId) {
    e.stopPropagation()
    try {
      const cloned = await api.duplicateTrip(tripId)
      setTrips(prev => [cloned, ...prev])
      toast.success('✨ Trip duplicated successfully!')
    } catch (err) {
      toast.error(err.message || 'Failed to duplicate trip')
    }
  }

  async function handleExportPDF(e, trip) {
    e.stopPropagation()
    try {
      const days = tripDaysMap[trip.id] || []
      generateItineraryPDF(trip, days)
      toast.success(`Exported PDF for ${trip.name}!`)
    } catch (err) {
      toast.error('Could not export PDF. Please open the trip planner to export.')
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

  if (loading) {
    return (
      <div className="page manage-trips-page">
        <div className="dashboard-stats-grid" style={{ marginBottom: 24 }}>
          <div className="skeleton" style={{ height: 95, borderRadius: 16 }} />
          <div className="skeleton" style={{ height: 95, borderRadius: 16 }} />
          <div className="skeleton" style={{ height: 95, borderRadius: 16 }} />
          <div className="skeleton" style={{ height: 95, borderRadius: 16 }} />
        </div>
        <div className="manage-trips-grid">
          <div className="skeleton" style={{ height: 280, borderRadius: 16 }} />
          <div className="skeleton" style={{ height: 280, borderRadius: 16 }} />
          <div className="skeleton" style={{ height: 280, borderRadius: 16 }} />
        </div>
      </div>
    )
  }

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
              : 'Start by planning your first multi-day journey.'}
          </p>
          <Link to="/trips/new" className="btn">+ Plan New Trip</Link>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="manage-trips-grid reveal reveal-d3">
          {sortedTrips.map(t => {
            const stKey = tripStatus(t.start_date, t.end_date)
            const stBadge = STATUS_BADGE[stKey]
            const countdown = stKey === 'upcoming' ? getDaysUntil(t.start_date) : null
            const days = tripDaysMap[t.id] || []
            const duration = Math.max(days.length, tripDurationDays(t.start_date, t.end_date) || 1)
            const itemCount = days.reduce((s, d) => s + (d.items || []).length, 0)
            const tripCost = days.reduce((sum, d) => sum + (d.items || []).reduce((s, it) => s + (parseFloat(it.cost) || 0), 0), 0)
            const destination = t.destination_city || t.description || 'Custom Destination'

            return (
              <div
                key={t.id}
                className="manage-trip-card"
                onClick={() => navigate(`/trips/${t.id}/builder`)}
              >
                {t.cover_photo_url && (
                  <div className="manage-card-cover">
                    <img src={t.cover_photo_url} alt={t.name} />
                  </div>
                )}

                <div className="manage-card-content">
                  {/* Card Header Top */}
                  <div className="manage-card-top">
                    <span className="destination-badge">
                      <IconPin size={11} /> {destination}
                    </span>
                    <div className="row-center" style={{ gap: 6 }}>
                      <span className={`status-pill ${stBadge.class}`}>{stBadge.label}</span>
                      {countdown && (
                        <span className="countdown-pill" title={`Starts in ${countdown}`}>
                          ⏳ {countdown}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Trip Title & Description */}
                  <div className="manage-card-header-info">
                    <h3 className="manage-card-title">{t.name}</h3>
                    {t.description && <p className="manage-card-desc">{t.description}</p>}
                  </div>

                  {/* Clean Metric Rows with Labels & Values */}
                  <div className="manage-card-details">
                    <div className="manage-detail-row">
                      <span className="manage-detail-label">Dates & Schedule</span>
                      <strong className="manage-detail-val">
                        {t.start_date ? `${t.start_date} → ${t.end_date || ''}` : 'Flexible dates'}
                      </strong>
                    </div>

                    <div className="manage-detail-row">
                      <span className="manage-detail-label">Duration & Items</span>
                      <strong className="manage-detail-val">
                        {duration} {duration === 1 ? 'Day' : 'Days'} · {itemCount} {itemCount === 1 ? 'activity' : 'activities'}
                      </strong>
                    </div>

                    <div className="manage-detail-row">
                      <span className="manage-detail-label">Estimated Budget</span>
                      <strong className="manage-detail-val manage-cost-val">
                        {tripCost > 0 ? `₹${Math.round(tripCost).toLocaleString('en-IN')}` : '₹0'}
                      </strong>
                    </div>
                  </div>

                  {/* Action Buttons Footer */}
                  <div className="manage-card-footer" onClick={e => e.stopPropagation()}>
                    <div className="manage-card-actions-left">
                      <Link to={`/trips/${t.id}/builder`} className="btn small manage-open-btn">
                        Open Planner
                      </Link>
                      <button
                        type="button"
                        className="btn secondary small manage-icon-btn"
                        onClick={(e) => handleExportPDF(e, t)}
                        title="Export PDF Itinerary"
                      >
                        <IconDownload size={13} />
                      </button>
                      <Link to={`/trips/${t.id}/edit`} className="btn secondary small manage-icon-btn" title="Edit Trip">
                        Edit
                      </Link>
                      <button
                        type="button"
                        className="btn secondary small manage-icon-btn"
                        onClick={(e) => handleDuplicateTrip(e, t.id)}
                        title="Duplicate Trip"
                      >
                        📋
                      </button>
                    </div>
                    <button
                      type="button"
                      className="manage-delete-btn"
                      onClick={(e) => handleDeleteTrip(e, t.id, t.name)}
                      title="Delete Trip"
                    >
                      <IconTrash size={14} />
                    </button>
                  </div>
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
                      <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '14.5px' }}>{t.name}</div>
                      <div className="muted" style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <IconPin size={11} color="var(--primary-dark)" /> {destination}
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
                      <strong style={{ color: 'var(--primary-dark)', fontSize: '14.5px' }}>
                        ₹{Math.round(tripCost).toLocaleString('en-IN')}
                      </strong>
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
                          className="btn secondary small"
                          style={{ padding: '4px 8px' }}
                          onClick={(e) => handleDuplicateTrip(e, t.id)}
                          title="Duplicate"
                        >
                          📋
                        </button>
                        <button
                          type="button"
                          className="manage-delete-btn"
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
