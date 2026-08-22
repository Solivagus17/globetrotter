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

function Sidebar() {
  const session = useAuth()
  const navigate = useNavigate()
  if (!session) return null

  const user = session.user || {}
  const meta = user.user_metadata || {}
  const email = user.email || ''
  const displayName = meta.display_name || meta.full_name || email.split('@')[0] || 'Traveler'
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <Link to="/" className="brand">GlobeTrotter</Link>
        <nav className="sidebar-nav">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}>
            <IconLayoutDashboard size={17} /> Dashboard
          </NavLink>
          <NavLink to="/discover" className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}>
            <IconSearch size={17} /> Discover Places
          </NavLink>
          <NavLink to="/budget" className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}>
            <IconWallet size={17} /> Budget & Expenses
          </NavLink>
          <NavLink to="/saves" className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}>
            <IconBookmark size={17} /> Saved Places
          </NavLink>
          <NavLink to="/trips/new" className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}>
            <IconCompass size={17} /> Plan New Trip
          </NavLink>
          <NavLink to="/profile" className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}>
            <IconUser size={17} /> Profile & Settings
          </NavLink>
        </nav>
      </div>

      <div className="sidebar-bottom">
        <Link to="/profile" className="sidebar-user-card" title="Edit Profile & Settings">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-text">
            <span className="sidebar-name">{displayName}</span>
            <span className="sidebar-email">{email}</span>
          </div>
        </Link>
        <button
          type="button"
          className="btn secondary small logout-btn"
          onClick={async () => { await supabase.auth.signOut(); navigate('/login') }}
        >
          Log out
        </button>
      </div>
    </aside>
  )
}

export default function App() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-area">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/discover" element={<RequireAuth><Discover /></RequireAuth>} />
          <Route path="/discover/:placeId" element={<RequireAuth><PlaceDetail /></RequireAuth>} />
          <Route path="/budget" element={<RequireAuth><GlobalBudget /></RequireAuth>} />
          <Route path="/saves" element={<RequireAuth><SavedPlaces /></RequireAuth>} />
          <Route path="/trips/new" element={<RequireAuth><CreateTrip /></RequireAuth>} />
          <Route path="/trips/:tripId/edit" element={<RequireAuth><EditTrip /></RequireAuth>} />
          <Route path="/trips/:tripId/builder" element={<RequireAuth><DayPlanner /></RequireAuth>} />
          <Route path="/trips/:tripId/planner" element={<RequireAuth><DayPlanner /></RequireAuth>} />
          <Route path="/trips/:tripId/view" element={<RequireAuth><ItineraryView /></RequireAuth>} />
          <Route path="/trips/:tripId/budget" element={<RequireAuth><Budget /></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
        </Routes>
      </main>
    </div>
  )
}
