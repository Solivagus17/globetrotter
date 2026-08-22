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
  listTrips: () => request('/api/trips'),
  createTrip: (body) => request('/api/trips', { method: 'POST', body: JSON.stringify(body) }),
  getTrip: (id) => request(`/api/trips/${id}`),
  updateTrip: (id, body) => request(`/api/trips/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteTrip: (id) => request(`/api/trips/${id}`, { method: 'DELETE' }),
  uploadCover: (tripId, file) => uploadCoverRequest(tripId, file),

  addStop: (tripId, body) => request(`/api/trips/${tripId}/stops`, { method: 'POST', body: JSON.stringify(body) }),
  updateStop: (id, body) => request(`/api/stops/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteStop: (id) => request(`/api/stops/${id}`, { method: 'DELETE' }),

  addActivity: (stopId, body) => request(`/api/stops/${stopId}/activities`, { method: 'POST', body: JSON.stringify(body) }),
  updateActivity: (id, body) => request(`/api/activities/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteActivity: (id) => request(`/api/activities/${id}`, { method: 'DELETE' }),

  budget: (tripId) => request(`/api/trips/${tripId}/budget`),

  searchCities: (q) => request(`/api/catalog/cities?q=${encodeURIComponent(q || '')}`),
  searchActivities: (city) => request(`/api/catalog/activities?city=${encodeURIComponent(city || '')}`),
}
