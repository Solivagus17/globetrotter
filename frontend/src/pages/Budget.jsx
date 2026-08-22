import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'
import {
  IconWallet,
  IconPlane,
  IconBed,
  IconUtensils,
  IconLandmark,
  IconCompass,
  IconMap,
  IconSearch,
  IconPlus,
} from '../components/Icons'

const CATEGORY_ICONS = {
  flight: <IconPlane size={18} />,
  stay: <IconBed size={18} />,
  food: <IconUtensils size={18} />,
  sightseeing: <IconLandmark size={18} />,
  adventure: <IconCompass size={18} />,
  culture: <IconLandmark size={18} />,
  transport: <IconPlane size={18} />,
  other: <IconWallet size={18} />,
}

export default function Budget() {
  const { tripId } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [itemSearch, setItemSearch] = useState('')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all')

  useEffect(() => {
    async function fetchTripBudget() {
      setLoading(true)
      setError('')

      let tripDaysData = null
      let budgetApiData = null

      try {
        tripDaysData = await api.getTripDays(tripId)
      } catch (e) {
        console.warn('Could not load trip days:', e)
      }

      try {
        budgetApiData = await api.budget(tripId)
      } catch (e) {
        console.warn('Budget endpoint fallback:', e)
      }

      // If we got trip days data, compute full category analytics locally to ensure 100% real-time accuracy
      if (tripDaysData && tripDaysData.trip) {
        const trip = tripDaysData.trip || {}
        const days = tripDaysData.days || []
        const stops = tripDaysData.stops || []

        const categoryMap = {
          flight: { id: 'flight', name: 'Flights & Airfare', total: 0, count: 0, color: '#2563eb', items: [] },
          stay: { id: 'stay', name: 'Hotels & Stays', total: 0, count: 0, color: '#0284c7', items: [] },
          food: { id: 'food', name: 'Dining & Food', total: 0, count: 0, color: '#ea580c', items: [] },
          sightseeing: { id: 'sightseeing', name: 'Sightseeing & Monuments', total: 0, count: 0, color: '#16a34a', items: [] },
          adventure: { id: 'adventure', name: 'Adventure & Activities', total: 0, count: 0, color: '#d97706', items: [] },
          culture: { id: 'culture', name: 'Culture & Heritage', total: 0, count: 0, color: '#dc2626', items: [] },
          transport: { id: 'transport', name: 'Local Transit & Cabs', total: 0, count: 0, color: '#7c3aed', items: [] },
          other: { id: 'other', name: 'General & Miscellaneous', total: 0, count: 0, color: '#64748b', items: [] },
        }

        let totalCost = 0
        const allItemsList = []
        const byDayList = []

        days.forEach(d => {
          let daySubtotal = 0
          ;(d.items || []).forEach(it => {
            const cost = parseFloat(it.cost) || 0
            totalCost += cost
            daySubtotal += cost

            const rawCat = (it.category || 'other').toLowerCase().trim()
            let targetCat = 'other'
            if (['flight', 'flights', 'plane', 'airline'].includes(rawCat)) targetCat = 'flight'
            else if (['stay', 'hotel', 'resort', 'accommodation', 'airbnb'].includes(rawCat)) targetCat = 'stay'
            else if (['food', 'dining', 'restaurant', 'cafe', 'street food', 'drink'].includes(rawCat)) targetCat = 'food'
            else if (['sightseeing', 'place', 'attraction', 'monument', 'landmark'].includes(rawCat)) targetCat = 'sightseeing'
            else if (['adventure', 'tour', 'hike', 'activity', 'safari'].includes(rawCat)) targetCat = 'adventure'
            else if (['culture', 'temple', 'museum', 'church', 'heritage'].includes(rawCat)) targetCat = 'culture'
            else if (['transport', 'transit', 'cab', 'train', 'metro', 'bus'].includes(rawCat)) targetCat = 'transport'

            categoryMap[targetCat].total += cost
            categoryMap[targetCat].count += 1
            const itemObj = {
              id: it.id,
              name: it.name,
              cost: cost,
              date: d.formatted_date || d.date,
              notes: it.notes || '',
              category: targetCat,
            }
            categoryMap[targetCat].items.push(itemObj)
            allItemsList.push(itemObj)
          })

          byDayList.push({
            date: d.date,
            formatted_date: d.formatted_date,
            day_number: d.day_number,
            total: daySubtotal,
            items: d.items || [],
          })
        })

        // Also add activities from stops if not already counted
        stops.forEach(s => {
          ;(s.activities || []).forEach(act => {
            const cost = parseFloat(act.cost) || 0
            if (cost > 0 && !allItemsList.some(it => it.name === act.name)) {
              totalCost += cost
              const rawCat = (act.category || 'sightseeing').toLowerCase()
              const targetCat = categoryMap[rawCat] ? rawCat : 'sightseeing'
              categoryMap[targetCat].total += cost
              categoryMap[targetCat].count += 1
              const actObj = {
                id: act.id,
                name: act.name,
                cost: cost,
                date: s.start_date || 'Flexible',
                notes: act.notes || s.city_name || '',
                category: targetCat,
              }
              categoryMap[targetCat].items.push(actObj)
              allItemsList.push(actObj)
            }
          })
        })

        // Percentages & averages
        Object.values(categoryMap).forEach(cat => {
          cat.percentage = totalCost > 0 ? Math.round((cat.total / totalCost) * 1000) / 10 : 0
          cat.avg_cost = cat.count > 0 ? Math.round(cat.total / cat.count) : 0
        })

        const sortedCategories = Object.values(categoryMap)
          .filter(c => c.count > 0 || c.total > 0)
          .sort((a, b) => b.total - a.total)

        const daysCount = Math.max(1, days.length)
        const avgDaily = Math.round(totalCost / daysCount)
        const topCategory = sortedCategories[0]

        const insights = []
        if (totalCost === 0) {
          insights.push('No expenses added yet. Use the Day Planner to schedule stays, flights, dining, and attractions with costs in ₹.')
        } else {
          if (topCategory && topCategory.percentage >= 35) {
            insights.push(`${topCategory.name} accounts for ${topCategory.percentage}% of your overall trip budget.`)
          }
          if (categoryMap.food.total > 0) {
            insights.push(`Estimated food & dining budget is ₹${Math.round(categoryMap.food.total / daysCount).toLocaleString('en-IN')} per day across your itinerary.`)
          }
          if (categoryMap.flight.total > 0) {
            insights.push(`Flight & transit bookings represent ₹${Math.round(categoryMap.flight.total).toLocaleString('en-IN')} of your total expenditure.`)
          }
          insights.push(`Your itinerary spans ${days.length} days with ${allItemsList.length} scheduled entries.`)
        }

        setData({
          trip,
          total: totalCost,
          avg_daily_spend: avgDaily,
          days_count: days.length,
          total_items_count: allItemsList.length,
          paid_items_count: allItemsList.filter(it => it.cost > 0).length,
          free_items_count: allItemsList.filter(it => it.cost === 0).length,
          categories: sortedCategories,
          by_day: byDayList,
          analysis: {
            highest_spending_category: topCategory ? topCategory.name : 'General',
            highest_spending_percentage: topCategory ? topCategory.percentage : 0,
            insights,
          },
        })
      } else if (budgetApiData) {
        setData(budgetApiData)
      } else {
        setError('Could not fetch trip budget.')
      }

      setLoading(false)
    }

    fetchTripBudget()
  }, [tripId])

  if (loading) {
    return (
      <div className="page budget-page">
        <div className="dashboard-stats-grid">
          <div className="skeleton" style={{ height: 95, borderRadius: 16 }} />
          <div className="skeleton" style={{ height: 95, borderRadius: 16 }} />
          <div className="skeleton" style={{ height: 95, borderRadius: 16 }} />
          <div className="skeleton" style={{ height: 95, borderRadius: 16 }} />
        </div>
        <div className="skeleton" style={{ height: 180, borderRadius: 16, marginBottom: 24 }} />
        <div className="skeleton" style={{ height: 280, borderRadius: 16 }} />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="page" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <h3>Budget Not Available</h3>
        <p className="muted" style={{ margin: '12px 0 24px' }}>{error || 'Unable to retrieve budget data for this trip.'}</p>
        <Link to={`/trips/${tripId}/builder`} className="btn">Return to Day Planner</Link>
      </div>
    )
  }

  const trip = data.trip || {}
  const total = data.total || 0
  const categories = data.categories || []
  const byDay = data.by_day || []
  const analysis = data.analysis || {}
  const insights = analysis.insights || []
  const targetBudget = parseFloat(trip.budget_target) || 0
  const isOverBudget = targetBudget > 0 && total > targetBudget
  const budgetUsagePct = targetBudget > 0 ? Math.round((total / targetBudget) * 100) : null

  // Flatten all items for the itemized ledger
  const allItems = categories.flatMap(cat => cat.items || [])
  const filteredItems = allItems.filter(it => {
    if (selectedCategoryFilter !== 'all' && it.category !== selectedCategoryFilter) return false
    if (itemSearch.trim()) {
      const q = itemSearch.toLowerCase()
      return (it.name || '').toLowerCase().includes(q) || (it.notes || '').toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div className="page budget-page">
      {/* Header */}
      <div className="dash-header-section reveal">
        <div className="dash-title-wrap">
          <div className="row-center" style={{ gap: 8 }}>
            <h2>Trip Budget & Financial Analytics</h2>
            <span className="destination-badge">{trip.destination_city || trip.name}</span>
          </div>
          <p className="muted">
            Detailed category-wise expense breakdown, analytics, and spending optimization for {trip.name}.
          </p>
        </div>
        <div className="dash-actions-row">
          <Link to={`/trips/${tripId}/builder`} className="btn small">
            <IconMap size={14} /> Open Day Planner
          </Link>
          <Link to="/budget" className="btn secondary small">
            <IconWallet size={14} /> All Trips Budget
          </Link>
        </div>
      </div>

      {/* Target Budget Progress / Warning Banner (Tier 2 Item 8) */}
      {targetBudget > 0 && (
        <div
          className={`budget-target-banner reveal ${isOverBudget ? 'overbudget' : 'on-track'}`}
          style={{
            padding: '16px 20px',
            borderRadius: 14,
            marginBottom: 24,
            background: isOverBudget ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
            border: `1.5px solid ${isOverBudget ? '#ef4444' : '#10b981'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <strong style={{ color: isOverBudget ? '#dc2626' : '#059669', fontSize: '15px' }}>
              {isOverBudget ? '⚠️ Budget Limit Exceeded' : '✅ Budget On Track'}
            </strong>
            <p className="muted" style={{ fontSize: '13px', margin: '3px 0 0' }}>
              {isOverBudget
                ? `You have exceeded your target of ₹${Math.round(targetBudget).toLocaleString('en-IN')} by ₹${Math.round(total - targetBudget).toLocaleString('en-IN')} (${budgetUsagePct}% used).`
                : `₹${Math.round(total).toLocaleString('en-IN')} used of ₹${Math.round(targetBudget).toLocaleString('en-IN')} target budget (${budgetUsagePct}% used).`}
            </p>
          </div>
          <div style={{ minWidth: 160 }}>
            <div className="budget-bar-track" style={{ height: 8, borderRadius: 4, background: 'rgba(0,0,0,0.06)' }}>
              <div
                className="budget-bar-fill"
                style={{
                  width: `${Math.min(100, budgetUsagePct)}%`,
                  background: isOverBudget ? '#ef4444' : '#10b981',
                  height: '100%',
                  borderRadius: 4,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Top 4 Financial Metric Cards */}
      <div className="dashboard-stats-grid reveal reveal-d1">
        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669' }}>
            <IconWallet size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">TOTAL ESTIMATED BUDGET</span>
            <h3 className="stat-value">₹{Math.round(total).toLocaleString('en-IN')}</h3>
            <span className="stat-subtext">Across {data.days_count} planned days</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: 'rgba(245, 180, 41, 0.15)', color: '#E0A11C' }}>
            <IconCompass size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">DAILY AVERAGE SPEND</span>
            <h3 className="stat-value">₹{Math.round(data.avg_daily_spend).toLocaleString('en-IN')}</h3>
            <span className="stat-subtext">Per day estimated cost</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#2563eb' }}>
            <IconPlane size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">TOP SPENDING CATEGORY</span>
            <h3 className="stat-value" style={{ fontSize: '18px' }}>
              {analysis.highest_spending_category || 'General'}
            </h3>
            <span className="stat-subtext">
              {analysis.highest_spending_percentage}% of total budget
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: 'rgba(168, 85, 247, 0.12)', color: '#9333ea' }}>
            <IconLandmark size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">ACTIVITIES & ENTRIES</span>
            <h3 className="stat-value">{data.total_items_count} Planned</h3>
            <span className="stat-subtext">
              {data.paid_items_count} Paid · {data.free_items_count} Free/Included
            </span>
          </div>
        </div>
      </div>

      {/* Multi-Color Category Distribution Progress Bar */}
      {total > 0 && (
        <div className="budget-distribution-card reveal reveal-d2">
          <div className="row-between" style={{ marginBottom: 12 }}>
            <h4 style={{ margin: 0, fontSize: '15px' }}>Category Spending Distribution</h4>
            <span className="muted" style={{ fontSize: '12px' }}>Visual allocation of costs</span>
          </div>

          <div className="budget-stacked-bar">
            {categories.map(cat => {
              if (cat.percentage <= 0) return null
              return (
                <div
                  key={cat.id}
                  className="budget-stacked-segment"
                  style={{
                    width: `${cat.percentage}%`,
                    backgroundColor: cat.color,
                  }}
                  title={`${cat.name}: ₹${Math.round(cat.total).toLocaleString('en-IN')} (${cat.percentage}%)`}
                />
              )
            })}
          </div>

          {/* Interactive Legend */}
          <div className="budget-legend-row">
            {categories.map(cat => (
              <div
                key={cat.id}
                className={`budget-legend-item ${selectedCategoryFilter === cat.id ? 'active' : ''}`}
                onClick={() =>
                  setSelectedCategoryFilter(prev => (prev === cat.id ? 'all' : cat.id))
                }
              >
                <span className="budget-legend-dot" style={{ backgroundColor: cat.color }} />
                <span className="budget-legend-label">{cat.name}</span>
                <span className="budget-legend-val">
                  ₹{Math.round(cat.total).toLocaleString('en-IN')} ({cat.percentage}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category-wise Breakdown Cards Grid */}
      <div className="budget-categories-section reveal reveal-d3">
        <h3 style={{ marginBottom: 16 }}>Category-wise Breakdown</h3>

        {categories.length === 0 ? (
          <div className="empty-state">
            <p className="muted">No scheduled expenses found for this trip. Add activities, dining, or flights in your Day Planner to view detailed analytics.</p>
            <Link to={`/trips/${tripId}/builder`} className="btn small">+ Add Expenses in Planner</Link>
          </div>
        ) : (
          <div className="budget-categories-grid">
            {categories.map(cat => (
              <div
                key={cat.id}
                className="budget-cat-card"
                style={{ borderTop: `3px solid ${cat.color}` }}
              >
                <div className="budget-cat-header">
                  <div className="budget-cat-icon-wrap" style={{ color: cat.color, backgroundColor: `${cat.color}18` }}>
                    {CATEGORY_ICONS[cat.id] || <IconWallet size={18} />}
                  </div>
                  <div>
                    <h4 className="budget-cat-name">{cat.name}</h4>
                    <span className="budget-cat-count">{cat.count} {cat.count === 1 ? 'entry' : 'entries'}</span>
                  </div>
                </div>

                <div className="budget-cat-amounts">
                  <div className="budget-cat-total">
                    ₹{Math.round(cat.total).toLocaleString('en-IN')}
                  </div>
                  <span className="budget-cat-pct-badge" style={{ backgroundColor: `${cat.color}20`, color: cat.color }}>
                    {cat.percentage}% share
                  </span>
                </div>

                <div className="budget-cat-meta">
                  <span>Avg per entry: ₹{Math.round(cat.avg_cost).toLocaleString('en-IN')}</span>
                </div>

                {/* Top items in this category */}
                {cat.items && cat.items.length > 0 && (
                  <div className="budget-cat-items-preview">
                    {cat.items.slice(0, 3).map((it, idx) => (
                      <div key={it.id || idx} className="budget-item-mini-row">
                        <span className="budget-item-mini-name">{it.name}</span>
                        <span className="budget-item-mini-cost">₹{Math.round(it.cost).toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                    {cat.items.length > 3 && (
                      <span className="muted" style={{ fontSize: '11px', textAlign: 'center', display: 'block', marginTop: 4 }}>
                        +{cat.items.length - 3} more entries
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Financial Insights Box */}
      {insights.length > 0 && (
        <div className="budget-insights-card reveal reveal-d4" style={{ marginTop: 28 }}>
          <div className="row-center" style={{ gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: '20px' }}>💡</span>
            <h4 style={{ margin: 0, fontSize: '16px' }}>Voyage AI Financial Insights & Analysis</h4>
          </div>
          <div className="budget-insights-list">
            {insights.map((tip, idx) => (
              <div key={idx} className="budget-insight-row">
                <span className="insight-bullet">✓</span>
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Day-by-Day Financial Breakdown & Ledger */}
      <div className="budget-ledger-section reveal reveal-d4" style={{ marginTop: 32 }}>
        <div className="row-between" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3>Itemized Expense Ledger</h3>
            <p className="muted" style={{ fontSize: '13px' }}>Every scheduled cost tracked in chronological order.</p>
          </div>

          <div className="row-center" style={{ gap: 10 }}>
            <div className="manage-search-box" style={{ minWidth: 220 }}>
              <IconSearch size={14} className="search-icon" />
              <input
                type="text"
                placeholder="Search expense items..."
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
              />
            </div>
            {selectedCategoryFilter !== 'all' && (
              <button
                type="button"
                className="btn secondary small"
                onClick={() => setSelectedCategoryFilter('all')}
              >
                Reset Filter ✕
              </button>
            )}
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="empty-state">
            <p className="muted">No expenses match your search filter.</p>
          </div>
        ) : (
          <div className="manage-trips-table-card">
            <table className="manage-trips-table">
              <thead>
                <tr>
                  <th>Activity / Item</th>
                  <th>Category</th>
                  <th>Scheduled Date</th>
                  <th>Notes / Booking Ref</th>
                  <th style={{ textAlign: 'right' }}>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((it, idx) => {
                  const catObj = categories.find(c => c.id === it.category) || { name: 'General', color: '#64748b' }
                  return (
                    <tr key={it.id || idx}>
                      <td>
                        <strong style={{ color: 'var(--text)', fontSize: '13.5px' }}>{it.name}</strong>
                      </td>
                      <td>
                        <span
                          className="status-pill"
                          style={{
                            backgroundColor: `${catObj.color}18`,
                            color: catObj.color,
                            fontWeight: 700,
                            fontSize: '11px',
                          }}
                        >
                          {catObj.name}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '12.5px', color: 'var(--text)' }}>{it.date || 'Flexible'}</span>
                      </td>
                      <td>
                        <span className="muted" style={{ fontSize: '12px' }}>
                          {it.notes ? it.notes.slice(0, 45) : '—'}
                        </span>
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
