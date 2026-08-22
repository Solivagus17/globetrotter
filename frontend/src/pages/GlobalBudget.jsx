import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import {
  IconWallet,
  IconMap,
  IconUtensils,
  IconBed,
  IconLandmark,
  IconPlane,
  IconCompass,
  IconSearch,
  IconPin,
} from '../components/Icons'

const CATEGORY_COLORS = {
  stay: { name: 'Hotels & Stays', color: '#0284c7', icon: <IconBed size={18} /> },
  flight: { name: 'Flights & Airfare', color: '#2563eb', icon: <IconPlane size={18} /> },
  food: { name: 'Dining & Food', color: '#ea580c', icon: <IconUtensils size={18} /> },
  sightseeing: { name: 'Attractions & Sights', color: '#16a34a', icon: <IconLandmark size={18} /> },
  adventure: { name: 'Adventures & Tours', color: '#d97706', icon: <IconCompass size={18} /> },
  culture: { name: 'Culture & Heritage', color: '#dc2626', icon: <IconLandmark size={18} /> },
  transport: { name: 'Local Transit & Cabs', color: '#7c3aed', icon: <IconPlane size={18} /> },
  other: { name: 'General & Miscellaneous', color: '#64748b', icon: <IconWallet size={18} /> },
}

const CITY_PALETTE = ['#F5B429', '#2563EB', '#10B981', '#9333EA', '#EA580C', '#06B6D4', '#E11D48', '#8B5CF6']

export default function GlobalBudget() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filterTripId = searchParams.get('tripId') || 'all'

  const [trips, setTrips] = useState([])
  const [tripDaysMap, setTripDaysMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCityFilter, setSelectedCityFilter] = useState('all')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all')

  useEffect(() => {
    async function loadAll() {
      try {
        const tripList = await api.listTrips()
        setTrips(tripList || [])

        const daysObj = {}
        for (const t of tripList || []) {
          try {
            const data = await api.getTripDays(t.id)
            daysObj[t.id] = data
          } catch (e) {
            daysObj[t.id] = { days: [], stops: [] }
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

  if (loading) return <div className="page-loading">Calculating global geographic budget analytics...</div>

  // Aggregate items across trips
  let allItems = []
  const tripTotals = {}
  const cityTotals = {}

  trips.forEach(t => {
    const tData = tripDaysMap[t.id] || { days: [], stops: [] }
    const days = tData.days || []
    const stops = tData.stops || []
    let tSum = 0

    // Process Day items
    days.forEach(d => {
      ;(d.items || []).forEach(it => {
        const cost = parseFloat(it.cost) || 0
        tSum += cost

        const city = (it.location_name || d.city_name || t.destination_city || t.description || 'Main Destination').trim()
        cityTotals[city] = (cityTotals[city] || 0) + cost

        allItems.push({
          id: it.id,
          name: it.name,
          cost: cost,
          category: it.category || 'other',
          city: city,
          tripId: t.id,
          tripName: t.name,
          date: d.formatted_date || d.date || 'Flexible',
          notes: it.notes || '',
        })
      })
    })

    // Process stop activities if not already counted
    stops.forEach(s => {
      const sCity = (s.city_name || t.destination_city || 'Main Destination').trim()
      ;(s.activities || []).forEach(act => {
        const cost = parseFloat(act.cost) || 0
        if (cost > 0 && !allItems.some(it => it.name === act.name)) {
          tSum += cost
          cityTotals[sCity] = (cityTotals[sCity] || 0) + cost
          allItems.push({
            id: act.id,
            name: act.name,
            cost: cost,
            category: act.category || 'sightseeing',
            city: sCity,
            tripId: t.id,
            tripName: t.name,
            date: s.start_date || 'Flexible',
            notes: act.notes || '',
          })
        }
      })
    })

    tripTotals[t.id] = tSum
  })

  // Filter by selected Trip
  const activeItems = filterTripId === 'all' ? allItems : allItems.filter(it => it.tripId === filterTripId)
  const grandTotal = activeItems.reduce((s, it) => s + it.cost, 0)

  // Compute City Breakdown for the active scope
  const activeCityTotals = {}
  const activeCityCounts = {}
  activeItems.forEach(it => {
    const c = it.city || 'Main Destination'
    activeCityTotals[c] = (activeCityTotals[c] || 0) + it.cost
    activeCityCounts[c] = (activeCityCounts[c] || 0) + 1
  })

  const sortedCities = Object.entries(activeCityTotals)
    .map(([cityName, cost], idx) => ({
      name: cityName,
      cost: cost,
      count: activeCityCounts[cityName] || 0,
      percentage: grandTotal > 0 ? Math.round((cost / grandTotal) * 1000) / 10 : 0,
      color: CITY_PALETTE[idx % CITY_PALETTE.length],
    }))
    .sort((a, b) => b.cost - a.cost)

  const maxCityCost = Math.max(1, ...sortedCities.map(c => c.cost))

  // Compute Category Breakdown
  const catTotals = {
    stay: 0,
    flight: 0,
    food: 0,
    sightseeing: 0,
    adventure: 0,
    culture: 0,
    transport: 0,
    other: 0,
  }

  activeItems.forEach(it => {
    const rawCat = (it.category || 'other').toLowerCase().trim()
    let target = 'other'
    if (['stay', 'hotel', 'resort', 'accommodation', 'airbnb'].includes(rawCat)) target = 'stay'
    else if (['flight', 'flights', 'plane', 'airline'].includes(rawCat)) target = 'flight'
    else if (['food', 'dining', 'restaurant', 'cafe', 'street food'].includes(rawCat)) target = 'food'
    else if (['sightseeing', 'place', 'attraction', 'monument'].includes(rawCat)) target = 'sightseeing'
    else if (['adventure', 'tour', 'hike', 'activity'].includes(rawCat)) target = 'adventure'
    else if (['culture', 'temple', 'museum', 'church', 'heritage'].includes(rawCat)) target = 'culture'
    else if (['transport', 'transit', 'cab', 'train', 'metro', 'bus'].includes(rawCat)) target = 'transport'

    catTotals[target] += it.cost
  })

  const sortedCategories = Object.entries(catTotals)
    .map(([catKey, cost]) => ({
      id: catKey,
      name: CATEGORY_COLORS[catKey].name,
      cost: cost,
      color: CATEGORY_COLORS[catKey].color,
      icon: CATEGORY_COLORS[catKey].icon,
      percentage: grandTotal > 0 ? Math.round((cost / grandTotal) * 1000) / 10 : 0,
      count: activeItems.filter(it => {
        const c = (it.category || 'other').toLowerCase()
        return catKey === 'other' ? !['stay','flight','food','sightseeing','adventure','culture','transport'].some(k => c.includes(k)) : c.includes(catKey)
      }).length,
    }))
    .filter(c => c.cost > 0 || c.count > 0)
    .sort((a, b) => b.cost - a.cost)

  // Filtered ledger entries
  const filteredLedger = activeItems.filter(it => {
    if (selectedCityFilter !== 'all' && it.city !== selectedCityFilter) return false
    if (selectedCategoryFilter !== 'all' && !it.category.toLowerCase().includes(selectedCategoryFilter)) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return (
        it.name.toLowerCase().includes(q) ||
        it.city.toLowerCase().includes(q) ||
        it.tripName.toLowerCase().includes(q) ||
        it.notes.toLowerCase().includes(q)
      )
    }
    return true
  })

  const topCity = sortedCities[0]
  const topCategory = sortedCategories[0]
  const avgCostPerItem = activeItems.length > 0 ? Math.round(grandTotal / activeItems.length) : 0

  return (
    <div className="page global-budget-page">
      {/* Header & Controls */}
      <div className="dash-header-section reveal">
        <div className="dash-title-wrap">
          <div className="row-center" style={{ gap: 8 }}>
            <h2>Travel Budget & Financial Analytics</h2>
            <span className="destination-badge">
              {filterTripId === 'all' ? 'All Trips' : (trips.find(t => t.id === filterTripId)?.name || 'Filtered Trip')}
            </span>
          </div>
          <p className="muted">
            Detailed graph-based analysis of where your travel money is being spent across destinations, cities, and categories.
          </p>
        </div>

        {/* Trip Filter Dropdown */}
        <div className="voyage-context-picker">
          <span className="voyage-context-label">Select Trip:</span>
          <select
            value={filterTripId}
            onChange={e => setSearchParams(e.target.value === 'all' ? {} : { tripId: e.target.value })}
            className="voyage-trip-select"
          >
            <option value="all">🌍 All Trips Combined ({trips.length})</option>
            {trips.map(t => (
              <option key={t.id} value={t.id}>
                ✈️ {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Top 4 Financial Metric Cards */}
      <div className="dashboard-stats-grid reveal reveal-d1">
        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669' }}>
            <IconWallet size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">TOTAL ESTIMATED BUDGET</span>
            <h3 className="stat-value">₹{Math.round(grandTotal).toLocaleString('en-IN')}</h3>
            <span className="stat-subtext">Across {sortedCities.length} destinations</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: 'rgba(245, 180, 41, 0.15)', color: '#E0A11C' }}>
            <IconPin size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">TOP SPEND DESTINATION</span>
            <h3 className="stat-value" style={{ fontSize: '18px' }}>
              {topCity ? topCity.name : 'None'}
            </h3>
            <span className="stat-subtext">
              {topCity ? `₹${Math.round(topCity.cost).toLocaleString('en-IN')} (${topCity.percentage}%)` : 'No spend yet'}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#2563eb' }}>
            <IconPlane size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">PRIMARY EXPENSE TYPE</span>
            <h3 className="stat-value" style={{ fontSize: '18px' }}>
              {topCategory ? topCategory.name : 'General'}
            </h3>
            <span className="stat-subtext">
              {topCategory ? `${topCategory.percentage}% of overall spend` : 'Evenly distributed'}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: 'rgba(168, 85, 247, 0.12)', color: '#9333ea' }}>
            <IconCompass size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">PLANNED EXPENSE ITEMS</span>
            <h3 className="stat-value">{activeItems.length} Entries</h3>
            <span className="stat-subtext">Avg ₹{avgCostPerItem.toLocaleString('en-IN')} per entry</span>
          </div>
        </div>
      </div>

      {/* 2-Column Split: Geographic Location Analysis Graph & Category Breakdown */}
      <div className="budget-analytics-grid reveal reveal-d2" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20, marginBottom: 28 }}>
        
        {/* GRAPH 1: Where Money is Being Spent (By Destination / Location) */}
        <div className="budget-graph-card" style={{ background: 'var(--card)', border: '1.5px solid var(--border-soft)', borderRadius: 'var(--radius)', padding: 24, boxShadow: 'var(--shadow)' }}>
          <div className="row-between" style={{ marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px' }}>📍 Geographic Spending Analysis</h3>
              <p className="muted" style={{ fontSize: '12.5px', margin: '4px 0 0' }}>Where your budget is allocated by city & location</p>
            </div>
            <span className="badge" style={{ fontSize: '11px', padding: '4px 8px', borderRadius: 8 }}>{sortedCities.length} Cities</span>
          </div>

          {sortedCities.length === 0 ? (
            <p className="muted" style={{ padding: '24px 0', textAlign: 'center' }}>No expenses found for this selection.</p>
          ) : (
            <div className="city-bars-container" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {sortedCities.map((city, idx) => {
                const barWidth = Math.max(8, (city.cost / maxCityCost) * 100)
                const isSelected = selectedCityFilter === city.name
                return (
                  <div
                    key={city.name}
                    className={`city-spend-row ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedCityFilter(prev => (prev === city.name ? 'all' : city.name))}
                    style={{
                      cursor: 'pointer',
                      padding: '8px 10px',
                      borderRadius: '10px',
                      background: isSelected ? 'var(--primary-light)' : 'transparent',
                      transition: 'all 150ms ease',
                    }}
                  >
                    <div className="row-between" style={{ marginBottom: 6 }}>
                      <div className="row-center" style={{ gap: 8 }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: city.color, background: `${city.color}15`, padding: '2px 6px', borderRadius: 6 }}>
                          #{idx + 1}
                        </span>
                        <strong style={{ fontSize: '13.5px', color: 'var(--text)' }}>{city.name}</strong>
                        <span className="muted" style={{ fontSize: '11.5px' }}>({city.count} {city.count === 1 ? 'activity' : 'activities'})</span>
                      </div>
                      <div className="row-center" style={{ gap: 8 }}>
                        <strong style={{ fontSize: '14px', color: 'var(--text)' }}>₹{Math.round(city.cost).toLocaleString('en-IN')}</strong>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)' }}>{city.percentage}%</span>
                      </div>
                    </div>

                    {/* Progress Bar Track */}
                    <div className="budget-bar-track" style={{ height: 9, borderRadius: 5, background: 'var(--bg-warm)', overflow: 'hidden' }}>
                      <div
                        className="budget-bar-fill"
                        style={{
                          width: `${barWidth}%`,
                          background: `linear-gradient(90deg, ${city.color}cc 0%, ${city.color} 100%)`,
                          height: '100%',
                          borderRadius: 5,
                          transition: 'width 400ms ease',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {selectedCityFilter !== 'all' && (
            <div style={{ marginTop: 14, textAlign: 'right' }}>
              <button type="button" className="link-btn" onClick={() => setSelectedCityFilter('all')} style={{ fontSize: '12px' }}>
                Reset Destination Filter ✕
              </button>
            </div>
          )}
        </div>

        {/* GRAPH 2: What Money is Being Spent On (Category Distribution) */}
        <div className="budget-graph-card" style={{ background: 'var(--card)', border: '1.5px solid var(--border-soft)', borderRadius: 'var(--radius)', padding: 24, boxShadow: 'var(--shadow)' }}>
          <div className="row-between" style={{ marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px' }}>🏷️ Expense Category Distribution</h3>
              <p className="muted" style={{ fontSize: '12.5px', margin: '4px 0 0' }}>Proportional share of stays, flights, food & activities</p>
            </div>
          </div>

          {/* Multi-Color Segmented Distribution Bar */}
          {grandTotal > 0 && (
            <div className="budget-stacked-bar" style={{ height: 16, borderRadius: 8, margin: '8px 0 16px', display: 'flex', overflow: 'hidden', background: 'var(--bg-warm)' }}>
              {sortedCategories.map(cat => (
                <div
                  key={cat.id}
                  style={{
                    width: `${cat.percentage}%`,
                    backgroundColor: cat.color,
                    height: '100%',
                    transition: 'width 300ms ease',
                  }}
                  title={`${cat.name}: ₹${Math.round(cat.cost).toLocaleString('en-IN')} (${cat.percentage}%)`}
                />
              ))}
            </div>
          )}

          <div className="categories-list-compact" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sortedCategories.map(cat => {
              const isSelected = selectedCategoryFilter === cat.id
              return (
                <div
                  key={cat.id}
                  onClick={() => setSelectedCategoryFilter(prev => (prev === cat.id ? 'all' : cat.id))}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: 10,
                    background: isSelected ? 'var(--primary-light)' : 'var(--bg-warm)',
                    border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-soft)',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                  }}
                >
                  <div className="row-center" style={{ gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: `${cat.color}18`, color: cat.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {cat.icon}
                    </div>
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{cat.name}</span>
                      <span className="muted" style={{ fontSize: '11px', display: 'block' }}>{cat.count} {cat.count === 1 ? 'entry' : 'entries'}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <strong style={{ fontSize: '13.5px', color: 'var(--text)' }}>₹{Math.round(cat.cost).toLocaleString('en-IN')}</strong>
                    <span style={{ fontSize: '11px', color: cat.color, fontWeight: 700, display: 'block' }}>{cat.percentage}% share</span>
                  </div>
                </div>
              )
            })}
          </div>

          {selectedCategoryFilter !== 'all' && (
            <div style={{ marginTop: 14, textAlign: 'right' }}>
              <button type="button" className="link-btn" onClick={() => setSelectedCategoryFilter('all')} style={{ fontSize: '12px' }}>
                Reset Category Filter ✕
              </button>
            </div>
          )}
        </div>
      </div>

      {/* GRAPH 3: Trip-by-Trip Financial Comparison Cards */}
      {filterTripId === 'all' && trips.length > 0 && (
        <div className="budget-trips-card reveal reveal-d3" style={{ background: 'var(--card)', border: '1.5px solid var(--border-soft)', borderRadius: 'var(--radius)', padding: 24, marginBottom: 28, boxShadow: 'var(--shadow)' }}>
          <div className="row-between" style={{ marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px' }}>✈️ Itinerary Cost Comparison</h3>
              <p className="muted" style={{ fontSize: '12.5px', margin: '4px 0 0' }}>Cumulative budget allocation per travel itinerary</p>
            </div>
          </div>

          <div className="trips-budget-comparison-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            {trips.map(t => {
              const tCost = tripTotals[t.id] || 0
              const tPct = grandTotal > 0 ? Math.round((tCost / grandTotal) * 1000) / 10 : 0
              return (
                <div key={t.id} style={{ background: 'var(--bg-warm)', border: '1px solid var(--border-soft)', borderRadius: 12, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div className="row-between">
                    <div>
                      <h4 style={{ margin: 0, fontSize: '14.5px' }}>{t.name}</h4>
                      <span className="muted" style={{ fontSize: '11.5px' }}>{t.destination_city || t.description || 'Custom Tour'}</span>
                    </div>
                    <span className="badge" style={{ background: 'rgba(245, 180, 41, 0.2)', color: '#D97706', fontWeight: 800 }}>
                      {tPct}%
                    </span>
                  </div>

                  <div className="row-between" style={{ alignItems: 'baseline' }}>
                    <strong style={{ fontSize: '18px', color: 'var(--text)' }}>₹{Math.round(tCost).toLocaleString('en-IN')}</strong>
                    <Link to={`/trips/${t.id}/budget`} className="link-btn" style={{ fontSize: '12px' }}>
                      Trip Analytics ›
                    </Link>
                  </div>

                  <div className="budget-bar-track" style={{ height: 6, borderRadius: 3, background: 'var(--border-soft)' }}>
                    <div className="budget-bar-fill" style={{ width: `${tPct}%`, background: 'var(--primary)', height: '100%', borderRadius: 3 }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Itemized Cross-Trip Ledger Table */}
      <div className="budget-ledger-card reveal reveal-d4" style={{ background: 'var(--card)', border: '1.5px solid var(--border-soft)', borderRadius: 'var(--radius)', padding: 24, boxShadow: 'var(--shadow)' }}>
        <div className="row-between" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '17px' }}>📋 Comprehensive Expense Ledger</h3>
            <p className="muted" style={{ fontSize: '12.5px', margin: '4px 0 0' }}>All scheduled expenses with destination, category, and cost</p>
          </div>

          <div className="row-center" style={{ gap: 10 }}>
            <div className="manage-search-box" style={{ minWidth: 220 }}>
              <IconSearch size={14} className="search-icon" />
              <input
                type="text"
                placeholder="Search expense, city, or trip..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            {(selectedCityFilter !== 'all' || selectedCategoryFilter !== 'all' || searchQuery) && (
              <button
                type="button"
                className="btn secondary small"
                onClick={() => {
                  setSelectedCityFilter('all')
                  setSelectedCategoryFilter('all')
                  setSearchQuery('')
                }}
              >
                Reset All Filters ✕
              </button>
            )}
          </div>
        </div>

        {filteredLedger.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px 16px', textAlign: 'center' }}>
            <p className="muted">No expenses match your search filter.</p>
          </div>
        ) : (
          <div className="manage-trips-table-card" style={{ boxShadow: 'none', border: '1px solid var(--border-soft)' }}>
            <table className="manage-trips-table">
              <thead>
                <tr>
                  <th>Activity / Expense</th>
                  <th>Destination / City</th>
                  <th>Category</th>
                  <th>Itinerary Trip</th>
                  <th>Scheduled Date</th>
                  <th style={{ textAlign: 'right' }}>Cost (₹)</th>
                </tr>
              </thead>
              <tbody>
                {filteredLedger.map((it, idx) => {
                  const catObj = CATEGORY_COLORS[it.category] || CATEGORY_COLORS.other
                  return (
                    <tr key={it.id || idx}>
                      <td>
                        <strong style={{ color: 'var(--text)', fontSize: '13.5px' }}>{it.name}</strong>
                      </td>
                      <td>
                        <span className="row-center" style={{ gap: 4, color: 'var(--text)', fontSize: '12.5px' }}>
                          <IconPin size={12} color="var(--primary-dark)" />
                          {it.city}
                        </span>
                      </td>
                      <td>
                        <span
                          className="status-pill"
                          style={{
                            backgroundColor: `${catObj.color}15`,
                            color: catObj.color,
                            fontWeight: 700,
                            fontSize: '11px',
                          }}
                        >
                          {catObj.name}
                        </span>
                      </td>
                      <td>
                        <span className="muted" style={{ fontSize: '12.5px' }}>{it.tripName}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: '12.5px', color: 'var(--text)' }}>{it.date}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <strong style={{ color: it.cost > 0 ? 'var(--primary-dark)' : 'var(--muted)', fontSize: '14px' }}>
                          {it.cost > 0 ? `₹${Math.round(it.cost).toLocaleString('en-IN')}` : 'Free'}
                        </strong>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
