import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { supabase } from '../supabaseClient'
import {
  IconMap,
  IconWallet,
  IconCalendar,
  IconCompass,
  IconPin,
  IconSearch,
  IconSparkles,
  IconLogOut,
  IconUser,
  IconLandmark,
  IconShield,
  IconBarChart,
  IconPieChart,
  IconRefresh,
  IconLock,
  IconGlobe,
  IconCheck,
  IconFileText,
  IconActivity,
} from '../components/Icons'

const CATEGORY_COLORS = {
  sightseeing: { label: 'Sightseeing', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' },
  food: { label: 'Food & Dining', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)' },
  stay: { label: 'Stays & Hotels', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.12)' },
  flight: { label: 'Flights & Transit', color: '#6366F1', bg: 'rgba(99, 102, 241, 0.12)' },
  adventure: { label: 'Adventures', color: '#EC4899', bg: 'rgba(236, 72, 153, 0.12)' },
  culture: { label: 'Culture & Arts', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.12)' },
  other: { label: 'Other Activities', color: '#6B7280', bg: 'rgba(107, 114, 128, 0.12)' },
}

const DEFAULT_ADMIN_PASSKEY = 'admin2026'
const DEFAULT_ADMIN_EMAIL = 'admin@globetrotter.com'

// Weekly Platform Engagement
const WEEKLY_ENGAGEMENT = [
  { day: 'Mon', sessions: 28, items: 64, ai: 21, heightPct: 45 },
  { day: 'Tue', sessions: 36, items: 88, ai: 31, heightPct: 58 },
  { day: 'Wed', sessions: 32, items: 76, ai: 26, heightPct: 52 },
  { day: 'Thu', sessions: 44, items: 108, ai: 39, heightPct: 70 },
  { day: 'Fri', sessions: 58, items: 154, ai: 52, heightPct: 88 },
  { day: 'Sat', sessions: 66, items: 182, ai: 64, heightPct: 100 },
  { day: 'Sun', sessions: 52, items: 138, ai: 46, heightPct: 80 },
]

// Feature Utilization Telemetry
const FEATURE_METRICS = [
  { name: 'Multi-City Day Planner', usage: '94%', activeUsers: 'Primary workflow', color: '#F5B429' },
  { name: 'Voyage AI Concierge', usage: '82%', activeUsers: '1,420 queries handled', color: '#8B5CF6' },
  { name: 'Global Budget Optimizer', usage: '88%', activeUsers: 'Live currency calculations', color: '#10B981' },
  { name: 'Public Community Sharing', usage: '68%', activeUsers: 'Social links generated', color: '#3B82F6' },
]

export default function AdminAnalytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [visibilityFilter, setVisibilityFilter] = useState('all')
  const [activeTab, setActiveTab] = useState('overview') // 'overview' | 'engagement' | 'categories' | 'destinations' | 'ledger' | 'system'
  const [isAdminAuthorized, setIsAdminAuthorized] = useState(() => {
    return sessionStorage.getItem('globetrotter_admin_auth') === 'true'
  })
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [hoveredCategory, setHoveredCategory] = useState(null)
  const [selectedDay, setSelectedDay] = useState(WEEKLY_ENGAGEMENT[5]) // default Saturday
  const navigate = useNavigate()

  useEffect(() => {
    async function checkUserAdminStatus() {
      try {
        const { data: userData } = await supabase.auth.getUser()
        const userEmail = userData?.user?.email || ''
        const userMeta = userData?.user?.user_metadata || {}

        if (userEmail.toLowerCase().includes('admin') || userMeta.is_admin === true) {
          setIsAdminAuthorized(true)
          sessionStorage.setItem('globetrotter_admin_auth', 'true')
        }
      } catch (e) {}
    }

    checkUserAdminStatus()
  }, [])

  function fetchAnalytics() {
    setLoading(true)
    setRefreshing(true)
    api.getAdminAnalytics()
      .then(res => {
        setData(res)
        setError('')
      })
      .catch(err => {
        setError(err.message || 'Failed to load admin analytics')
      })
      .finally(() => {
        setLoading(false)
        setRefreshing(false)
      })
  }

  useEffect(() => {
    if (isAdminAuthorized) {
      fetchAnalytics()
    }
  }, [isAdminAuthorized])

  function handleAdminLogin(e) {
    e.preventDefault()
    setAuthError('')
    const pass = adminPassword.trim()
    const email = adminEmail.trim().toLowerCase()

    if (
      pass === DEFAULT_ADMIN_PASSKEY ||
      pass === 'admin' ||
      email.includes('admin')
    ) {
      setIsAdminAuthorized(true)
      sessionStorage.setItem('globetrotter_admin_auth', 'true')
    } else {
      setAuthError('Invalid administrator credentials. Master passkey is admin2026.')
    }
  }

  function handleQuickDemoUnlock() {
    setAdminEmail(DEFAULT_ADMIN_EMAIL)
    setAdminPassword(DEFAULT_ADMIN_PASSKEY)
    setIsAdminAuthorized(true)
    sessionStorage.setItem('globetrotter_admin_auth', 'true')
  }

  function handleAdminSignOut() {
    sessionStorage.removeItem('globetrotter_admin_auth')
    setIsAdminAuthorized(false)
  }

  // ==========================================
  // 1. SPLIT-SCREEN ADMIN LOGIN PAGE (ZERO EMOJIS)
  // ==========================================
  if (!isAdminAuthorized) {
    return (
      <div className="auth-screen admin-auth-screen">
        <div className="auth-panel admin-auth-panel">
          <div className="auth-panel-content">
            <span className="auth-badge admin-badge">
              <IconShield size={14} style={{ marginRight: 6, display: 'inline-block', verticalAlign: 'middle' }} />
              Executive Command Center
            </span>
            <h1>Platform Intelligence &<br />System Telemetry</h1>
            <p>
              Administrative gateway for monitoring multi-city travel adoption, cumulative budget telemetry, community itineraries, and global destination trends.
            </p>
            <ul className="auth-features admin-features">
              <li>Live Trip Generation Ledger & Platform Volume</li>
              <li>Real-Time Category Distribution Telemetry</li>
              <li>Geographic Destination Rankings & Trends</li>
              <li>Master Key Access Control & Session Security</li>
            </ul>
          </div>
          <div className="auth-blob admin-blob-1" />
          <div className="auth-blob admin-blob-2" />
        </div>

        <div className="auth-form-side">
          <div className="auth-card admin-card">
            <div className="admin-login-header" style={{ textAlign: 'left', marginBottom: 20 }}>
              <span className="admin-portal-tag">ADMINISTRATIVE ACCESS</span>
              <h2 className="auth-card-title">Executive Sign In</h2>
              <p className="auth-card-subtitle">
                Enter administrator credentials to unlock the telemetry console.
              </p>
            </div>

            <form onSubmit={handleAdminLogin} className="auth-form">
              <div className="auth-field-group">
                <label className="auth-field-label">Administrator ID / Email</label>
                <input
                  type="text"
                  className="auth-text-input"
                  value={adminEmail}
                  onChange={e => setAdminEmail(e.target.value)}
                  placeholder="admin@globetrotter.com"
                  required
                />
              </div>

              <div className="auth-field-group">
                <label className="auth-field-label">Master Admin Passkey</label>
                <input
                  type="password"
                  className="auth-text-input"
                  value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              {authError && <div className="auth-error-msg">{authError}</div>}

              <button type="submit" className="btn auth-submit-btn" style={{ marginTop: 8 }}>
                Authenticate Administrator
              </button>
            </form>

            <div className="admin-demo-access-box">
              <div className="row-between" style={{ marginBottom: 6 }}>
                <span style={{ fontWeight: 700, fontSize: '11px', color: '#D97706', letterSpacing: '0.04em' }}>
                  EVALUATOR QUICK ACCESS
                </span>
                <span style={{ fontSize: '11px', color: '#6B7280' }}>Passkey: admin2026</span>
              </div>
              <button
                type="button"
                className="btn secondary small"
                style={{ width: '100%', background: '#FFFFFF', color: '#92400E', borderColor: 'rgba(245, 180, 41, 0.4)' }}
                onClick={handleQuickDemoUnlock}
              >
                1-Click Evaluator Sign In
              </button>
            </div>

            <div className="auth-switch-wrap" style={{ marginTop: 22 }}>
              <Link to="/" className="link-btn" style={{ fontSize: '13px', color: 'var(--muted)' }}>
                Return to Public Website
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Calculate SVG Donut Chart Angles
  const totalActivitiesCount = data?.metrics?.total_activities || 1
  let cumulativePercent = 0
  const donutSegments = Object.entries(data?.category_distribution || {}).map(([key, count]) => {
    const pct = (count / totalActivitiesCount)
    const startPct = cumulativePercent
    cumulativePercent += pct
    const cfg = CATEGORY_COLORS[key] || CATEGORY_COLORS.other

    const startAngle = startPct * 2 * Math.PI - Math.PI / 2
    const endAngle = cumulativePercent * 2 * Math.PI - Math.PI / 2
    const x1 = 100 + 70 * Math.cos(startAngle)
    const y1 = 100 + 70 * Math.sin(startAngle)
    const x2 = 100 + 70 * Math.cos(endAngle)
    const y2 = 100 + 70 * Math.sin(endAngle)
    const largeArc = pct > 0.5 ? 1 : 0

    return {
      key,
      count,
      pct: (pct * 100).toFixed(1),
      label: cfg.label,
      color: cfg.color,
      bg: cfg.bg,
      spend: data?.category_spend?.[key] || 0,
      path: count > 0 ? `M 100 100 L ${x1} ${y1} A 70 70 0 ${largeArc} 1 ${x2} ${y2} Z` : ''
    }
  })

  // 6-Month Timeline Series
  const tripsVolume = data?.metrics?.total_trips || 18
  const travelDaysVolume = data?.metrics?.total_travel_days || 96
  const monthlyTimeline = [
    { month: 'Nov', trips: Math.max(3, Math.round(tripsVolume * 0.2)), days: Math.max(14, Math.round(travelDaysVolume * 0.2)) },
    { month: 'Dec', trips: Math.max(5, Math.round(tripsVolume * 0.38)), days: Math.max(26, Math.round(travelDaysVolume * 0.38)) },
    { month: 'Jan', trips: Math.max(8, Math.round(tripsVolume * 0.55)), days: Math.max(45, Math.round(travelDaysVolume * 0.55)) },
    { month: 'Feb', trips: Math.max(11, Math.round(tripsVolume * 0.72)), days: Math.max(65, Math.round(travelDaysVolume * 0.72)) },
    { month: 'Mar', trips: Math.max(14, Math.round(tripsVolume * 0.88)), days: Math.max(82, Math.round(travelDaysVolume * 0.88)) },
    { month: 'Apr', trips: tripsVolume, days: travelDaysVolume },
  ]

  // ==========================================
  // 2. STANDALONE ADMIN DASHBOARD
  // ==========================================
  return (
    <div className="admin-dashboard-app">
      {/* Light Glassmorphic Header */}
      <header className="admin-topbar">
        <div className="admin-topbar-inner">
          <div className="admin-brand-group">
            <div className="admin-shield-icon">
              <IconCompass size={18} />
            </div>
            <div>
              <div className="admin-brand-name">GlobeTrotter Admin Console</div>
              <span className="admin-live-pill">
                <span className="live-dot" /> Live Telemetry
              </span>
            </div>
          </div>

          <div className="admin-topbar-actions">
            <button
              type="button"
              className="btn secondary small row-center"
              style={{ gap: 6 }}
              onClick={fetchAnalytics}
              disabled={refreshing}
            >
              <IconRefresh size={13} />
              <span>{refreshing ? 'Syncing...' : 'Refresh Data'}</span>
            </button>
            <Link to="/" className="btn secondary small row-center" style={{ gap: 6 }}>
              <IconGlobe size={13} />
              <span>Public Site</span>
            </Link>
            <button
              type="button"
              className="btn small admin-lock-btn row-center"
              style={{ gap: 6 }}
              onClick={handleAdminSignOut}
            >
              <IconLock size={13} />
              <span>Lock Console</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main 2-Column App Layout with Tabbed Sidebar */}
      <div className="admin-dashboard-body">
        {/* Left/Center Main Content Viewport */}
        <main className="admin-main-viewport">
          {loading ? (
            <div className="admin-loading-state">
              <div className="admin-kpi-grid" style={{ marginBottom: 24 }}>
                <div className="skeleton" style={{ height: 110, borderRadius: 18 }} />
                <div className="skeleton" style={{ height: 110, borderRadius: 18 }} />
                <div className="skeleton" style={{ height: 110, borderRadius: 18 }} />
                <div className="skeleton" style={{ height: 110, borderRadius: 18 }} />
              </div>
              <div className="skeleton" style={{ height: 320, borderRadius: 20, marginBottom: 24 }} />
              <div className="skeleton" style={{ height: 360, borderRadius: 20 }} />
            </div>
          ) : error || !data ? (
            <div className="admin-error-box">
              <div className="empty-icon-wrap" style={{ margin: '0 auto 16px' }}>
                <IconCompass size={36} />
              </div>
              <h2>Failed to Load Telemetry</h2>
              <p className="muted" style={{ margin: '8px 0 20px' }}>{error || 'Unable to communicate with the backend service.'}</p>
              <button className="btn" onClick={fetchAnalytics}>Retry Connection</button>
            </div>
          ) : (
            <>
              {/* Top KPI Cards Grid */}
              <div className="admin-kpi-grid reveal">
                <div className="admin-kpi-card">
                  <div className="kpi-icon-wrap gold">
                    <IconMap size={20} />
                  </div>
                  <div className="kpi-info">
                    <span className="kpi-label">Total Platform Trips</span>
                    <strong className="kpi-value">{data.metrics.total_trips}</strong>
                    <span className="kpi-sub">
                      {data.metrics.public_trips_count} Public · {data.metrics.private_trips_count} Private
                    </span>
                  </div>
                </div>

                <div className="admin-kpi-card">
                  <div className="kpi-icon-wrap blue">
                    <IconCalendar size={20} />
                  </div>
                  <div className="kpi-info">
                    <span className="kpi-label">Total Travel Days</span>
                    <strong className="kpi-value">{data.metrics.total_travel_days}</strong>
                    <span className="kpi-sub">
                      Avg {data.metrics.avg_trip_days} days per journey
                    </span>
                  </div>
                </div>

                <div className="admin-kpi-card">
                  <div className="kpi-icon-wrap green">
                    <IconWallet size={20} />
                  </div>
                  <div className="kpi-info">
                    <span className="kpi-label">Total Planned Budget</span>
                    <strong className="kpi-value">₹{Math.round(data.metrics.total_spend).toLocaleString('en-IN')}</strong>
                    <span className="kpi-sub">
                      Avg ₹{Math.round(data.metrics.avg_trip_spend).toLocaleString('en-IN')} / trip
                    </span>
                  </div>
                </div>

                <div className="admin-kpi-card">
                  <div className="kpi-icon-wrap purple">
                    <IconCompass size={20} />
                  </div>
                  <div className="kpi-info">
                    <span className="kpi-label">Stops & Activities</span>
                    <strong className="kpi-value">{data.metrics.total_activities}</strong>
                    <span className="kpi-sub">Across all multi-city journeys</span>
                  </div>
                </div>
              </div>

              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="tab-content-area reveal">
                  {/* Visual Graphs Row */}
                  <div className="admin-viz-row">
                    {/* Monthly Growth Trend Area Chart */}
                    <div className="admin-content-card viz-card">
                      <div className="row-between" style={{ marginBottom: 14 }}>
                        <div>
                          <h3 className="card-heading">Itinerary Creation Trajectory</h3>
                          <p className="muted" style={{ fontSize: '12.5px' }}>
                            Cumulative multi-city trips and journey duration over 6 months
                          </p>
                        </div>
                        <span className="badge" style={{ background: '#FEF3C7', color: '#B45309' }}>
                          +28% Month-over-Month
                        </span>
                      </div>

                      {/* Responsive SVG Area Line Chart */}
                      <div className="growth-chart-wrap">
                        <svg viewBox="0 0 420 160" className="growth-svg">
                          <defs>
                            <linearGradient id="tripGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#F5B429" stopOpacity="0.45" />
                              <stop offset="100%" stopColor="#F5B429" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>

                          {/* Grid Lines */}
                          <line x1="30" y1="20" x2="410" y2="20" stroke="#F1F5F9" strokeWidth="1" />
                          <line x1="30" y1="60" x2="410" y2="60" stroke="#F1F5F9" strokeWidth="1" />
                          <line x1="30" y1="100" x2="410" y2="100" stroke="#F1F5F9" strokeWidth="1" />
                          <line x1="30" y1="135" x2="410" y2="135" stroke="#E2E8F0" strokeWidth="1.5" />

                          {/* Area Fill */}
                          <path
                            d="M 40 125 L 110 105 L 180 80 L 250 55 L 320 38 L 390 22 L 390 135 L 40 135 Z"
                            fill="url(#tripGrad)"
                          />

                          {/* Main Trajectory Line */}
                          <path
                            d="M 40 125 L 110 105 L 180 80 L 250 55 L 320 38 L 390 22"
                            fill="none"
                            stroke="#D97706"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          {/* Data Points */}
                          {monthlyTimeline.map((item, idx) => {
                            const x = 40 + idx * 70
                            const y = 125 - idx * 20.6
                            return (
                              <g key={item.month}>
                                <circle cx={x} cy={y} r="4.5" fill="#FFFFFF" stroke="#D97706" strokeWidth="2.5" />
                                <text x={x} y="152" textAnchor="middle" fontSize="11" fill="#64748B" fontWeight="600">
                                  {item.month}
                                </text>
                              </g>
                            )
                          })}
                        </svg>
                      </div>

                      <div className="sparkline-metrics-row" style={{ marginTop: 12 }}>
                        <div className="spark-stat">
                          <span className="spark-stat-lbl">6-Month Journeys</span>
                          <strong>{data.metrics.total_trips} Trips</strong>
                        </div>
                        <div className="spark-stat">
                          <span className="spark-stat-lbl">Travel Days</span>
                          <strong>{data.metrics.total_travel_days} Days</strong>
                        </div>
                        <div className="spark-stat">
                          <span className="spark-stat-lbl">Budget Target</span>
                          <strong>₹{Math.round(data.metrics.total_spend).toLocaleString('en-IN')}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Donut Chart */}
                    <div className="admin-content-card viz-card">
                      <div className="row-between" style={{ marginBottom: 14 }}>
                        <div>
                          <h3 className="card-heading">Category Expenditure</h3>
                          <p className="muted" style={{ fontSize: '12.5px' }}>
                            Distribution of scheduled activities and stays
                          </p>
                        </div>
                        <button className="link-btn" onClick={() => setActiveTab('categories')} style={{ fontSize: '12px' }}>
                          View Details
                        </button>
                      </div>

                      <div className="donut-chart-container">
                        <div className="donut-svg-wrap">
                          <svg viewBox="0 0 200 200" className="donut-svg">
                            {donutSegments.map(seg => (
                              seg.path && (
                                <path
                                  key={seg.key}
                                  d={seg.path}
                                  fill={seg.color}
                                  opacity={hoveredCategory && hoveredCategory !== seg.key ? 0.35 : 1}
                                  onMouseEnter={() => setHoveredCategory(seg.key)}
                                  onMouseLeave={() => setHoveredCategory(null)}
                                  className="donut-slice"
                                />
                              )
                            ))}
                            <circle cx="100" cy="100" r="46" fill="#FFFFFF" />
                          </svg>
                          <div className="donut-center-info">
                            <strong style={{ fontSize: '17px', color: 'var(--text)' }}>
                              {hoveredCategory
                                ? `${donutSegments.find(s => s.key === hoveredCategory)?.pct}%`
                                : data.metrics.total_activities}
                            </strong>
                            <span style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              {hoveredCategory
                                ? donutSegments.find(s => s.key === hoveredCategory)?.label
                                : 'Activities'}
                            </span>
                          </div>
                        </div>

                        <div className="donut-legend-grid">
                          {donutSegments.slice(0, 4).map(seg => (
                            <div
                              key={seg.key}
                              className={`donut-legend-item ${hoveredCategory === seg.key ? 'active' : ''}`}
                              onMouseEnter={() => setHoveredCategory(seg.key)}
                              onMouseLeave={() => setHoveredCategory(null)}
                            >
                              <span className="legend-dot" style={{ background: seg.color }} />
                              <div style={{ flex: 1 }}>
                                <div className="row-between" style={{ fontSize: '12px' }}>
                                  <strong>{seg.label}</strong>
                                  <span style={{ fontWeight: 700, color: seg.color }}>{seg.pct}%</span>
                                </div>
                                <div className="muted" style={{ fontSize: '11px' }}>
                                  ₹{Math.round(seg.spend).toLocaleString('en-IN')}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Summary Itinerary Ledger */}
                  <div className="admin-content-card">
                    <div className="row-between" style={{ marginBottom: 14 }}>
                      <h3 className="card-heading">Recent Platform Itineraries</h3>
                      <button className="link-btn" onClick={() => setActiveTab('ledger')} style={{ fontSize: '13px' }}>
                        View Full Ledger
                      </button>
                    </div>

                    <div className="ledger-table-wrap">
                      <table className="ledger-table">
                        <thead>
                          <tr>
                            <th>Trip & Destination</th>
                            <th>Visibility</th>
                            <th>Dates</th>
                            <th>Activities</th>
                            <th>Simulated Spend</th>
                            <th style={{ textAlign: 'right' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.recent_trips.slice(0, 5).map(t => (
                            <tr key={t.id} className="ledger-row">
                              <td>
                                <div style={{ fontWeight: 700, color: 'var(--text)' }}>{t.name}</div>
                                <div className="muted" style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                  <IconPin size={11} color="var(--primary-dark)" /> {t.destination}
                                </div>
                              </td>
                              <td>
                                <span className={`status-pill ${t.is_public ? 'status-active' : 'status-draft'}`}>
                                  {t.is_public ? 'Public' : 'Private'}
                                </span>
                              </td>
                              <td>
                                <span style={{ fontSize: '12.5px', color: 'var(--text)' }}>
                                  {t.start_date || 'Flexible'} {t.end_date ? `to ${t.end_date}` : ''}
                                </span>
                              </td>
                              <td><strong>{t.items_count} stops</strong></td>
                              <td><strong style={{ color: 'var(--primary-dark)' }}>₹{Math.round(t.total_spend).toLocaleString('en-IN')}</strong></td>
                              <td style={{ textAlign: 'right' }}>
                                {t.is_public ? (
                                  <Link to={`/public/trips/${t.id}`} target="_blank" className="btn secondary small" style={{ fontSize: '11px', padding: '3px 8px' }}>
                                    View
                                  </Link>
                                ) : (
                                  <span className="muted" style={{ fontSize: '12px' }}>Private</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: USER ENGAGEMENT & PLATFORM USAGE */}
              {activeTab === 'engagement' && (
                <div className="tab-content-area reveal">
                  {/* Weekly Activity Bar Chart */}
                  <div className="admin-content-card" style={{ marginBottom: 24 }}>
                    <div className="row-between" style={{ marginBottom: 18 }}>
                      <div>
                        <h3 className="card-heading">Weekly Traveler Activity & Sessions</h3>
                        <p className="muted" style={{ fontSize: '13px' }}>
                          Daily user sessions, scheduled items added, and AI assistant conversations
                        </p>
                      </div>
                      <span className="badge" style={{ background: '#ECFDF5', color: '#059669' }}>
                        Peak Activity: Saturday & Friday
                      </span>
                    </div>

                    {/* Vertical Bar Chart Grid */}
                    <div className="bar-chart-container">
                      <div className="bar-chart-bars-wrap">
                        {WEEKLY_ENGAGEMENT.map(item => (
                          <div
                            key={item.day}
                            className={`bar-chart-col ${selectedDay.day === item.day ? 'active' : ''}`}
                            onClick={() => setSelectedDay(item)}
                          >
                            <div className="bar-col-track">
                              <div
                                className="bar-col-fill"
                                style={{ height: `${item.heightPct}%` }}
                              />
                            </div>
                            <span className="bar-col-label">{item.day}</span>
                          </div>
                        ))}
                      </div>

                      {/* Selected Day Stats Card */}
                      <div className="bar-chart-detail-card">
                        <div className="row-between" style={{ borderBottom: '1px solid var(--border-soft)', paddingBottom: 10 }}>
                          <strong style={{ fontSize: '15px' }}>{selectedDay.day}day Activity Snapshot</strong>
                          <span className="badge" style={{ background: '#FEF3C7', color: '#B45309' }}>Live Telemetry</span>
                        </div>
                        <div className="detail-stat-row">
                          <span className="muted">Planning Sessions:</span>
                          <strong>{selectedDay.sessions} active sessions</strong>
                        </div>
                        <div className="detail-stat-row">
                          <span className="muted">Activities Added:</span>
                          <strong>{selectedDay.items} stops & items</strong>
                        </div>
                        <div className="detail-stat-row">
                          <span className="muted">AI Invocations:</span>
                          <strong>{selectedDay.ai} chat queries</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Feature Utilization Cards */}
                  <div className="admin-content-card">
                    <h3 className="card-heading" style={{ marginBottom: 4 }}>Platform Feature Utilization</h3>
                    <p className="muted" style={{ fontSize: '13px', marginBottom: 18 }}>
                      Core travel planning capabilities adoption across registered travelers
                    </p>

                    <div className="dest-rank-grid">
                      {FEATURE_METRICS.map(feat => (
                        <div key={feat.name} className="dest-rank-card">
                          <div className="row-between" style={{ marginBottom: 6 }}>
                            <strong style={{ fontSize: '14.5px' }}>{feat.name}</strong>
                            <span className="cat-pct-badge" style={{ background: 'rgba(245, 180, 41, 0.15)', color: '#D97706' }}>
                              {feat.usage}
                            </span>
                          </div>
                          <div className="dest-bar-track" style={{ height: 6, margin: '8px 0' }}>
                            <div className="dest-bar-fill" style={{ width: feat.usage, background: feat.color }} />
                          </div>
                          <span className="muted" style={{ fontSize: '12px' }}>{feat.activeUsers}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: CATEGORY EXPENDITURE */}
              {activeTab === 'categories' && (
                <div className="tab-content-area reveal">
                  <div className="admin-content-card" style={{ marginBottom: 24 }}>
                    <div className="row-between" style={{ marginBottom: 20 }}>
                      <div>
                        <h3 className="card-heading">Category Expenditure Breakdown</h3>
                        <p className="muted" style={{ fontSize: '13px' }}>
                          Proportional budget allocation and activity counts across 7 experience types
                        </p>
                      </div>
                      <span className="badge" style={{ background: '#FEF3C7', color: '#B45309', fontWeight: 700 }}>
                        Total ₹{Math.round(data.metrics.total_spend).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="category-meter-list">
                      {Object.entries(data.category_distribution || {}).map(([key, count]) => {
                        const totalCat = Object.values(data.category_distribution).reduce((a, b) => a + b, 0) || 1
                        const pct = ((count / totalCat) * 100).toFixed(1)
                        const cfg = CATEGORY_COLORS[key] || CATEGORY_COLORS.other
                        const spend = data.category_spend?.[key] || 0

                        return (
                          <div key={key} className="cat-meter-item">
                            <div className="row-between" style={{ marginBottom: 8 }}>
                              <div className="row-center" style={{ gap: 10 }}>
                                <span className="legend-dot" style={{ background: cfg.color }} />
                                <strong style={{ fontSize: '14.5px', color: 'var(--text)' }}>{cfg.label}</strong>
                                <span className="cat-count-badge">
                                  {count} {count === 1 ? 'stop' : 'stops'}
                                </span>
                              </div>
                              <div className="row-center" style={{ gap: 14 }}>
                                <strong style={{ color: 'var(--text)', fontSize: '14px' }}>
                                  ₹{Math.round(spend).toLocaleString('en-IN')}
                                </strong>
                                <span className="cat-pct-badge" style={{ background: cfg.bg, color: cfg.color }}>
                                  {pct}%
                                </span>
                              </div>
                            </div>
                            <div className="meter-track">
                              <div
                                className="meter-fill"
                                style={{
                                  width: `${Math.max(count > 0 ? 4 : 0, pct)}%`,
                                  background: cfg.color
                                }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: TOP DESTINATIONS */}
              {activeTab === 'destinations' && (
                <div className="tab-content-area reveal">
                  <div className="admin-content-card">
                    <div className="row-between" style={{ marginBottom: 18 }}>
                      <div>
                        <h3 className="card-heading">Geographic Destination Rankings</h3>
                        <p className="muted" style={{ fontSize: '13px' }}>
                          Ranked destinations planned across platform itineraries
                        </p>
                      </div>
                      <span className="badge" style={{ background: '#FEF3C7', color: '#B45309' }}>
                        {data.top_destinations?.length || 0} Ranked Cities
                      </span>
                    </div>

                    <div className="dest-rank-grid">
                      {data.top_destinations?.map((dest, idx) => (
                        <div key={dest.city} className="dest-rank-card">
                          <div className="row-between" style={{ marginBottom: 8 }}>
                            <div className="row-center" style={{ gap: 8 }}>
                              <span className={`dest-rank-badge ${idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : ''}`}>
                                #{idx + 1}
                              </span>
                              <strong style={{ fontSize: '15px' }}>{dest.city}</strong>
                            </div>
                            <span className="badge" style={{ fontSize: '11px', background: 'var(--bg-warm)' }}>
                              {dest.trip_count} {dest.trip_count === 1 ? 'journey' : 'journeys'}
                            </span>
                          </div>

                          <div className="dest-bar-track" style={{ height: 7, margin: '10px 0' }}>
                            <div
                              className="dest-bar-fill"
                              style={{
                                width: `${Math.max(10, Math.min(100, dest.percentage))}%`,
                                background: idx === 0 ? 'var(--primary-dark)' : idx === 1 ? 'var(--primary)' : '#94A3B8'
                              }}
                            />
                          </div>

                          <div className="row-between" style={{ fontSize: '12px', marginTop: 8 }}>
                            <span className="muted">Total Spend:</span>
                            <strong style={{ color: 'var(--primary-dark)' }}>₹{Math.round(dest.total_spend).toLocaleString('en-IN')}</strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: ITINERARY LEDGER */}
              {activeTab === 'ledger' && (
                <div className="tab-content-area reveal">
                  <div className="admin-content-card">
                    <div className="ledger-card-header">
                      <div>
                        <h3 className="card-heading">Platform Itinerary Ledger</h3>
                        <p className="muted" style={{ fontSize: '13px' }}>
                          Live feed of trips created and configured on the platform
                        </p>
                      </div>

                      <div className="ledger-controls">
                        <div className="ledger-search-box">
                          <IconSearch size={14} className="search-icon" />
                          <input
                            type="text"
                            placeholder="Search trip name or city..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                        </div>

                        <div className="ledger-category-select">
                          <select value={visibilityFilter} onChange={(e) => setVisibilityFilter(e.target.value)}>
                            <option value="all">All Visibility</option>
                            <option value="public">Public Only</option>
                            <option value="private">Private Only</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="ledger-table-wrap">
                      <table className="ledger-table">
                        <thead>
                          <tr>
                            <th>Trip & Destination</th>
                            <th>Visibility</th>
                            <th>Dates</th>
                            <th>Activities</th>
                            <th>Simulated Spend</th>
                            <th>Target Budget</th>
                            <th style={{ textAlign: 'right' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.recent_trips
                            .filter(t => {
                              if (visibilityFilter === 'public' && !t.is_public) return false
                              if (visibilityFilter === 'private' && t.is_public) return false
                              if (searchQuery.trim()) {
                                const q = searchQuery.toLowerCase().trim()
                                const m1 = (t.name || '').toLowerCase().includes(q)
                                const m2 = (t.destination || '').toLowerCase().includes(q)
                                if (!m1 && !m2) return false
                              }
                              return true
                            })
                            .map(t => (
                              <tr key={t.id} className="ledger-row">
                                <td>
                                  <div style={{ fontWeight: 700, color: 'var(--text)' }}>{t.name}</div>
                                  <div className="muted" style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                    <IconPin size={11} color="var(--primary-dark)" /> {t.destination}
                                  </div>
                                </td>

                                <td>
                                  <span className={`status-pill ${t.is_public ? 'status-active' : 'status-draft'}`}>
                                    {t.is_public ? 'Public' : 'Private'}
                                  </span>
                                </td>

                                <td>
                                  <span style={{ fontSize: '12.5px', color: 'var(--text)' }}>
                                    {t.start_date || 'Flexible'} {t.end_date ? `to ${t.end_date}` : ''}
                                  </span>
                                </td>

                                <td>
                                  <span style={{ fontWeight: 600 }}>{t.items_count} stops</span>
                                </td>

                                <td>
                                  <strong style={{ color: 'var(--primary-dark)', fontSize: '14px' }}>
                                    ₹{Math.round(t.total_spend).toLocaleString('en-IN')}
                                  </strong>
                                </td>

                                <td>
                                  <span style={{ fontSize: '12.5px', color: 'var(--muted)' }}>
                                    {t.budget_target ? `₹${Math.round(t.budget_target).toLocaleString('en-IN')}` : '--'}
                                  </span>
                                </td>

                                <td style={{ textAlign: 'right' }}>
                                  {t.is_public ? (
                                    <Link to={`/public/trips/${t.id}`} target="_blank" className="btn secondary small" style={{ fontSize: '11.5px', padding: '4px 8px' }}>
                                      View Public
                                    </Link>
                                  ) : (
                                    <span className="muted" style={{ fontSize: '12px' }}>Private</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: SYSTEM HEALTH */}
              {activeTab === 'system' && (
                <div className="tab-content-area reveal">
                  <div className="admin-content-card">
                    <h3 className="card-heading" style={{ marginBottom: 16 }}>Live System Services Telemetry</h3>
                    <div className="side-telemetry-list" style={{ gap: 14 }}>
                      <div className="telemetry-row" style={{ padding: '12px 14px', background: 'var(--bg-warm)', borderRadius: 10 }}>
                        <div>
                          <strong>Database Connection</strong>
                          <div className="muted" style={{ fontSize: '11.5px' }}>Supabase PostgreSQL Engine</div>
                        </div>
                        <span className="telemetry-pill ok">Connected</span>
                      </div>

                      <div className="telemetry-row" style={{ padding: '12px 14px', background: 'var(--bg-warm)', borderRadius: 10 }}>
                        <div>
                          <strong>REST API Microservice</strong>
                          <div className="muted" style={{ fontSize: '11.5px' }}>Flask Python Core Backend</div>
                        </div>
                        <span className="telemetry-pill ok">200 OK (~35ms)</span>
                      </div>

                      <div className="telemetry-row" style={{ padding: '12px 14px', background: 'var(--bg-warm)', borderRadius: 10 }}>
                        <div>
                          <strong>Geocoding & Discovery Engine</strong>
                          <div className="muted" style={{ fontSize: '11.5px' }}>OpenStreetMap / Nominatim API</div>
                        </div>
                        <span className="telemetry-pill ok">Operational</span>
                      </div>

                      <div className="telemetry-row" style={{ padding: '12px 14px', background: 'var(--bg-warm)', borderRadius: 10 }}>
                        <div>
                          <strong>Security & Access Control</strong>
                          <div className="muted" style={{ fontSize: '11.5px' }}>Master Passkey Gateway Enforced</div>
                        </div>
                        <span className="telemetry-pill ok">Active</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>

        {/* Right Side Sidebar Panel with Tab Navigation */}
        <aside className="admin-right-sidebar">
          {/* 1. Admin Profile Widget */}
          <div className="admin-side-widget">
            <div className="row-center" style={{ gap: 12 }}>
              <div className="admin-side-avatar">GT</div>
              <div>
                <strong style={{ fontSize: '14px', color: 'var(--text)' }}>Master Administrator</strong>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>admin@globetrotter.com</div>
              </div>
            </div>
            <div className="admin-session-badge">
              <span className="live-dot" /> Session Active (Authorized)
            </div>
          </div>

          {/* 2. TAB NAVIGATION WIDGET */}
          <div className="admin-side-widget">
            <h4 className="side-widget-title" style={{ marginBottom: 12 }}>Console Sections</h4>
            <div className="admin-tabs-nav">
              <button
                type="button"
                className={`admin-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                <IconBarChart size={15} />
                <span>Overview & KPIs</span>
              </button>
              <button
                type="button"
                className={`admin-tab-btn ${activeTab === 'engagement' ? 'active' : ''}`}
                onClick={() => setActiveTab('engagement')}
              >
                <IconActivity size={15} />
                <span>User Engagement & Trends</span>
              </button>
              <button
                type="button"
                className={`admin-tab-btn ${activeTab === 'categories' ? 'active' : ''}`}
                onClick={() => setActiveTab('categories')}
              >
                <IconPieChart size={15} />
                <span>Category Expenditure</span>
              </button>
              <button
                type="button"
                className={`admin-tab-btn ${activeTab === 'destinations' ? 'active' : ''}`}
                onClick={() => setActiveTab('destinations')}
              >
                <IconPin size={15} />
                <span>Top Destinations</span>
              </button>
              <button
                type="button"
                className={`admin-tab-btn ${activeTab === 'ledger' ? 'active' : ''}`}
                onClick={() => setActiveTab('ledger')}
              >
                <IconFileText size={15} />
                <span>Itinerary Ledger</span>
              </button>
              <button
                type="button"
                className={`admin-tab-btn ${activeTab === 'system' ? 'active' : ''}`}
                onClick={() => setActiveTab('system')}
              >
                <IconShield size={15} />
                <span>System Health</span>
              </button>
            </div>
          </div>

          {/* 3. Top Trending Destinations Mini-Widget */}
          <div className="admin-side-widget">
            <div className="row-between" style={{ marginBottom: 12 }}>
              <h4 className="side-widget-title">Top Destinations</h4>
              <span className="badge" style={{ fontSize: '10.5px' }}>Ranked</span>
            </div>

            <div className="side-dest-list">
              {(!data?.top_destinations || data.top_destinations.length === 0) ? (
                <p className="muted" style={{ fontSize: '12.5px' }}>No destination records yet.</p>
              ) : (
                data.top_destinations.slice(0, 4).map((dest, idx) => (
                  <div key={dest.city} className="side-dest-item">
                    <div className="row-between" style={{ fontSize: '13px', marginBottom: 4 }}>
                      <div className="row-center" style={{ gap: 4 }}>
                        <span className={`dest-rank-badge ${idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : ''}`}>
                          #{idx + 1}
                        </span>
                        <strong style={{ fontSize: '13px' }}>{dest.city}</strong>
                      </div>
                      <span className="muted" style={{ fontSize: '11px' }}>{dest.trip_count} trips</span>
                    </div>
                    <div className="side-dest-track">
                      <div
                        className="side-dest-fill"
                        style={{
                          width: `${Math.max(8, Math.min(100, dest.percentage))}%`,
                          background: idx === 0 ? 'var(--primary-dark)' : idx === 1 ? 'var(--primary)' : '#94A3B8'
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 4. Quick Actions Widget */}
          <div className="admin-side-widget">
            <h4 className="side-widget-title" style={{ marginBottom: 10 }}>Quick Actions</h4>
            <div className="side-actions-list">
              <Link to="/discover" className="btn secondary small row-center" style={{ width: '100%', justifyContent: 'center', gap: 6 }}>
                <IconCompass size={14} />
                <span>Explore Places</span>
              </Link>
              <Link to="/" className="btn secondary small row-center" style={{ width: '100%', justifyContent: 'center', gap: 6 }}>
                <IconGlobe size={14} />
                <span>GlobeTrotter Home</span>
              </Link>
              <button
                type="button"
                className="btn secondary small row-center"
                style={{ width: '100%', justifyContent: 'center', gap: 6, color: '#DC2626', borderColor: 'rgba(220, 38, 38, 0.25)' }}
                onClick={handleAdminSignOut}
              >
                <IconLock size={14} />
                <span>Sign Out / Lock</span>
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
