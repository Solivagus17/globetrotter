import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, Link, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import CreateTrip from './pages/CreateTrip'
import EditTrip from './pages/EditTrip'
import DayPlanner from './pages/DayPlanner'
import ItineraryView from './pages/ItineraryView'
import Discover from './pages/Discover'
import PlaceDetail from './pages/PlaceDetail'
import Budget from './pages/Budget'
import GlobalBudget from './pages/GlobalBudget'
import SavedPlaces from './pages/SavedPlaces'
import Profile from './pages/Profile'
import {
  IconLayoutDashboard,
  IconSearch,
  IconWallet,
  IconBookmark,
  IconCompass,
  IconUser,
  IconChevronLeft,
  IconChevronRight,
  IconLogOut,
} from './components/Icons'

function useAuth() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  return session
}

function RequireAuth({ children }) {
  const session = useAuth()
  if (session === undefined) return <p style={{ padding: 24 }}>Loading...</p>
  if (!session) return <Navigate to="/login" replace />
  return children
}

function Sidebar({ isCollapsed, onToggleCollapse }) {
  const session = useAuth()
  const navigate = useNavigate()
  if (!session) return null

  const user = session.user || {}
  const meta = user.user_metadata || {}
  const email = user.email || ''
  const displayName = meta.display_name || meta.full_name || email.split('@')[0] || 'Traveler'
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-top">
        <div className="sidebar-brand-row">
          <Link to="/" className="brand" title="GlobeTrotter">
            {isCollapsed ? <span className="brand-dot-logo">GT</span> : 'GlobeTrotter'}
          </Link>
          <button
            type="button"
            className="sidebar-collapse-toggle-btn"
            onClick={onToggleCollapse}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <IconChevronRight size={14} /> : <IconChevronLeft size={14} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'} title="Dashboard">
            <IconLayoutDashboard size={18} />
            {!isCollapsed && <span>Dashboard</span>}
          </NavLink>
          <NavLink to="/discover" className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'} title="Discover Places">
            <IconSearch size={18} />
            {!isCollapsed && <span>Discover Places</span>}
          </NavLink>
          <NavLink to="/budget" className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'} title="Budget & Expenses">
            <IconWallet size={18} />
            {!isCollapsed && <span>Budget & Expenses</span>}
          </NavLink>
          <NavLink to="/saves" className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'} title="Saved Places">
            <IconBookmark size={18} />
            {!isCollapsed && <span>Saved Places</span>}
          </NavLink>
          <NavLink to="/trips/new" className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'} title="Plan New Trip">
            <IconCompass size={18} />
            {!isCollapsed && <span>Plan New Trip</span>}
          </NavLink>
          <NavLink to="/profile" className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'} title="Profile & Settings">
            <IconUser size={18} />
            {!isCollapsed && <span>Profile & Settings</span>}
          </NavLink>
        </nav>
      </div>

      <div className="sidebar-bottom">
        <Link to="/profile" className="sidebar-user-card" title={`Profile: ${displayName} (${email})`}>
          <div className="sidebar-avatar">{initials}</div>
          {!isCollapsed && (
            <div className="sidebar-user-text">
              <span className="sidebar-name">{displayName}</span>
              <span className="sidebar-email">{email}</span>
            </div>
          )}
        </Link>
        <button
          type="button"
          className={`btn secondary small logout-btn ${isCollapsed ? 'collapsed' : ''}`}
          onClick={async () => { await supabase.auth.signOut(); navigate('/login') }}
          title="Log out"
        >
          {isCollapsed ? <IconLogOut size={16} /> : 'Log out'}
        </button>
      </div>
    </aside>
  )
}

export default function App() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('globetrotter_sidebar_collapsed') === 'true'
  })

  function handleToggleCollapse() {
    setIsCollapsed(prev => {
      const next = !prev
      localStorage.setItem('globetrotter_sidebar_collapsed', String(next))
      return next
    })
  }

  return (
    <div className="app-shell">
      <Sidebar isCollapsed={isCollapsed} onToggleCollapse={handleToggleCollapse} />
      <main className="main-area">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/trips" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/discover" element={<RequireAuth><Discover /></RequireAuth>} />
          <Route path="/discover/:placeId" element={<RequireAuth><PlaceDetail /></RequireAuth>} />
          <Route path="/budget" element={<RequireAuth><GlobalBudget /></RequireAuth>} />
          <Route path="/saves" element={<RequireAuth><SavedPlaces /></RequireAuth>} />
          <Route path="/trips/new" element={<RequireAuth><CreateTrip /></RequireAuth>} />
          <Route path="/trips/:tripId" element={<RequireAuth><DayPlanner /></RequireAuth>} />
          <Route path="/trips/:tripId/edit" element={<RequireAuth><EditTrip /></RequireAuth>} />
          <Route path="/trips/:tripId/builder" element={<RequireAuth><DayPlanner /></RequireAuth>} />
          <Route path="/trips/:tripId/planner" element={<RequireAuth><DayPlanner /></RequireAuth>} />
          <Route path="/trips/:tripId/view" element={<RequireAuth><ItineraryView /></RequireAuth>} />
          <Route path="/trips/:tripId/budget" element={<RequireAuth><Budget /></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
