import { supabase } from './supabaseClient'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

async function authHeaders() {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function request(path, options = {}) {
  const headers = await authHeaders()
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'Request failed')
  }
  if (res.status === 204) return null
  return res.json()
}

async function uploadCoverRequest(tripId, file) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch(`${BASE_URL}/api/trips/${tripId}/cover`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'Upload failed')
  }
  return res.json()
}

export const api = {
  // Trips
  listTrips: () => request('/api/trips'),
  createTrip: (body) => request('/api/trips', { method: 'POST', body: JSON.stringify(body) }),
  getTrip: (id) => request(`/api/trips/${id}`),
  updateTrip: (id, body) => request(`/api/trips/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteTrip: (id) => request(`/api/trips/${id}`, { method: 'DELETE' }),
  uploadCover: (tripId, file) => uploadCoverRequest(tripId, file),

  // Stops
  addStop: (tripId, body) => request(`/api/trips/${tripId}/stops`, { method: 'POST', body: JSON.stringify(body) }),
  updateStop: (id, body) => request(`/api/stops/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteStop: (id) => request(`/api/stops/${id}`, { method: 'DELETE' }),

  // Activities
  addActivity: (stopId, body) => request(`/api/stops/${stopId}/activities`, { method: 'POST', body: JSON.stringify(body) }),
  updateActivity: (id, body) => request(`/api/activities/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteActivity: (id) => request(`/api/activities/${id}`, { method: 'DELETE' }),

  // Budget
  budget: (tripId) => request(`/api/trips/${tripId}/budget`),

  // TripAdvisor-Style Discovery Layer
  discoverPlaces: (city = '', category = '', query = '') =>
    request(`/api/places/search?city=${encodeURIComponent(city)}&category=${encodeURIComponent(category)}&q=${encodeURIComponent(query)}`),
  getPlace: (id, city = '', name = '') =>
    request(`/api/places/${id}?city=${encodeURIComponent(city)}&name=${encodeURIComponent(name)}`),

  // User Saves Pool
  listSaves: () => request('/api/saves'),
  createSave: (body) => request('/api/saves', { method: 'POST', body: JSON.stringify(body) }),
  deleteSave: (id) => request(`/api/saves/${id}`, { method: 'DELETE' }),

  // TripAdvisor-Style Day-by-Day Planner
  getTripDays: (tripId) => request(`/api/trips/${tripId}/days`),
  addDayItem: (tripId, date, body) => request(`/api/trips/${tripId}/days/${date}/items`, { method: 'POST', body: JSON.stringify(body) }),
  updateDayItem: (id, body) => request(`/api/day-items/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteDayItem: (id) => request(`/api/day-items/${id}`, { method: 'DELETE' }),

  // Legacy catalog
  searchCities: (q) => request(`/api/catalog/cities?q=${encodeURIComponent(q || '')}`),
  searchActivities: (city) => request(`/api/catalog/activities?city=${encodeURIComponent(city || '')}`),
}
