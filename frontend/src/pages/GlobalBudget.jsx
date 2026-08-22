import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { IconWallet, IconMap, IconUtensils, IconBed, IconLandmark, IconPlane, IconFileText } from '../components/Icons'

export default function GlobalBudget() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filterTripId = searchParams.get('tripId') || 'all'

  const [trips, setTrips] = useState([])
  const [tripDaysMap, setTripDaysMap] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadAll() {
      try {
        const tripList = await api.listTrips()
        setTrips(tripList || [])

        const daysObj = {}
        for (const t of (tripList || [])) {
          try {
            const data = await api.getTripDays(t.id)
            daysObj[t.id] = data.days || []
          } catch (e) {
            daysObj[t.id] = []
          }
        }
        setTripDaysMap(daysObj)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadAll()
  }, [])

  if (loading) return <div className="page-loading">Calculating budget analytics...</div>

  // Aggregate items
  let allItems = []
  const tripTotals = {}

  trips.forEach(t => {
    const days = tripDaysMap[t.id] || []
    let tSum = 0
    days.forEach(d => {
      (d.items || []).forEach(it => {
        const cost = parseFloat(it.cost) || 0
        tSum += cost
        allItems.push({
          ...it,
          tripId: t.id,
          tripName: t.name,
          date: d.formatted_date,
        })
      })
    })
    tripTotals[t.id] = tSum
  })

  // Filter if specific trip chosen
  if (filterTripId !== 'all') {
    allItems = allItems.filter(it => it.tripId === filterTripId)
  }

  const grandTotal = allItems.reduce((s, it) => s + (parseFloat(it.cost) || 0), 0)

  // Category breakdown
  const catTotals = {
    food: 0,
    stay: 0,
    sightseeing: 0,
    flight: 0,
    place: 0,
    other: 0,
  }

  allItems.forEach(it => {
    const cat = it.category || 'place'
    const cost = parseFloat(it.cost) || 0
    if (catTotals[cat] !== undefined) {
      catTotals[cat] += cost
    } else {
      catTotals.other += cost
    }
  })

  const maxCatCost = Math.max(1, ...Object.values(catTotals))

  return (
    <div className="page global-budget-page">
      {/* Header */}
      <div className="row-between reveal">
        <div>
          <h2>Travel Budget & Expenses</h2>
          <p className="muted">Track and analyze estimated costs across your travel itineraries in Rupees (₹).</p>
        </div>

        {/* Trip Switcher */}
        <div className="budget-trip-filter">
          <label style={{ margin: 0, fontSize: '13px' }}>Filter Trip:
            <select
              value={filterTripId}
              onChange={e => setSearchParams(e.target.value === 'all' ? {} : { tripId: e.target.value })}
              style={{ padding: '6px 12px', fontSize: '13px', marginLeft: 8, width: 'auto', display: 'inline-block' }}
            >
              <option value="all">All Trips Combined</option>
              {trips.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Main Metric Cards */}
      <div className="dashboard-stats-grid reveal reveal-d1" style={{ marginBottom: 32 }}>
        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: 'var(--primary-light)', color: 'var(--primary-dark)' }}>
            <IconWallet size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Estimated Budget</span>
            <h3 className="stat-value">₹{Math.round(grandTotal).toLocaleString('en-IN')}</h3>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: 'var(--bg-warm)', color: 'var(--text)' }}>
            <IconMap size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Active Trips</span>
            <h3 className="stat-value">{filterTripId === 'all' ? trips.length : 1}</h3>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: 'var(--primary-light)', color: 'var(--primary-dark)' }}>
            <IconUtensils size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Planned Line Items</span>
            <h3 className="stat-value">{allItems.length} Items</h3>
          </div>
        </div>
      </div>

      {/* Breakdown by Category */}
      <div className="budget-breakdown-card reveal reveal-d2" style={{ background: 'var(--card)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius)', padding: 28, marginBottom: 32 }}>
        <h3 style={{ marginBottom: 18 }}>Spending by Category</h3>
        
        <div className="budget-bars">
          <div className="budget-row">
            <span className="budget-label"><IconBed size={14} /> Stays & Hotels</span>
            <div className="budget-bar-track">
              <div className="budget-bar-fill" style={{ width: `${(catTotals.stay / maxCatCost) * 100}%` }} />
            </div>
            <span className="budget-value">₹{Math.round(catTotals.stay).toLocaleString('en-IN')}</span>
          </div>

          <div className="budget-row">
            <span className="budget-label"><IconUtensils size={14} /> Food & Dining</span>
            <div className="budget-bar-track">
              <div className="budget-bar-fill" style={{ width: `${(catTotals.food / maxCatCost) * 100}%` }} />
            </div>
            <span className="budget-value">₹{Math.round(catTotals.food).toLocaleString('en-IN')}</span>
          </div>

          <div className="budget-row">
            <span className="budget-label"><IconLandmark size={14} /> Attractions & Sightseeing</span>
            <div className="budget-bar-track">
              <div className="budget-bar-fill" style={{ width: `${((catTotals.sightseeing + catTotals.place) / maxCatCost) * 100}%` }} />
            </div>
            <span className="budget-value">₹{Math.round(catTotals.sightseeing + catTotals.place).toLocaleString('en-IN')}</span>
          </div>

          <div className="budget-row">
            <span className="budget-label"><IconPlane size={14} /> Transport & Flights</span>
            <div className="budget-bar-track">
              <div className="budget-bar-fill" style={{ width: `${(catTotals.flight / maxCatCost) * 100}%` }} />
            </div>
            <span className="budget-value">₹{Math.round(catTotals.flight).toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* Trips Comparison (When All Trips Selected) */}
      {filterTripId === 'all' && trips.length > 0 && (
        <div className="budget-trips-card reveal reveal-d3" style={{ background: 'var(--card)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius)', padding: 28 }}>
          <h3 style={{ marginBottom: 18 }}>Estimated Cost per Trip</h3>
          <div className="trips-budget-list" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {trips.map(t => {
              const tCost = tripTotals[t.id] || 0
              return (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-warm)', borderRadius: 12 }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '15px' }}>{t.name}</h4>
                    <span className="muted" style={{ fontSize: '12px' }}>{t.start_date || 'No date set'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <strong style={{ fontSize: '16px', color: 'var(--text)' }}>₹{Math.round(tCost).toLocaleString('en-IN')}</strong>
                    <Link to={`/trips/${t.id}/builder`} className="btn secondary small">Day Planner</Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
