import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, Link, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import CreateTrip from './pages/CreateTrip'
import EditTrip from './pages/EditTrip'
import ItineraryBuilder from './pages/ItineraryBuilder'
import ItineraryView from './pages/ItineraryView'
import Budget from './pages/Budget'

function useAuth() {
  const [session, setSession] = useState(undefined) // undefined = loading

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
  const email = session.user?.email || ''
  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <Link to="/" className="brand">GlobeTrotter</Link>
        <nav className="sidebar-nav">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}>
            My Trips
          </NavLink>
          <NavLink to="/trips/new" className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}>
            Plan New Trip
          </NavLink>
        </nav>
      </div>
      <div className="sidebar-bottom">
        {email && <p className="sidebar-user">{email}</p>}
        <button
          className="btn secondary small"
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
          <Route path="/trips/new" element={<RequireAuth><CreateTrip /></RequireAuth>} />
          <Route path="/trips/:tripId/edit" element={<RequireAuth><EditTrip /></RequireAuth>} />
          <Route path="/trips/:tripId/builder" element={<RequireAuth><ItineraryBuilder /></RequireAuth>} />
          <Route path="/trips/:tripId/view" element={<RequireAuth><ItineraryView /></RequireAuth>} />
          <Route path="/trips/:tripId/budget" element={<RequireAuth><Budget /></RequireAuth>} />
        </Routes>
      </main>
    </div>
  )
}
