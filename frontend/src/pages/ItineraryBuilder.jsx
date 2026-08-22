import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'

export default function ItineraryBuilder() {
  const { tripId } = useParams()
  const [trip, setTrip] = useState(null)
  const [cityQuery, setCityQuery] = useState('')
  const [cityResults, setCityResults] = useState([])
  const [error, setError] = useState('')

  async function load() {
    const data = await api.getTrip(tripId)
    setTrip(data)
  }

  useEffect(() => { load() }, [tripId])

  async function searchCities(q) {
    setCityQuery(q)
    if (q.length < 1) { setCityResults([]); return }
    const results = await api.searchCities(q)
    setCityResults(results)
  }

  async function addStop(city) {
    try {
      await api.addStop(tripId, {
        city_name: city.city_name,
        country: city.country,
        order_index: trip.stops?.length || 0,
      })
      setCityQuery('')
      setCityResults([])
      load()
    } catch (e) { setError(e.message) }
  }

  async function removeStop(stopId) {
    if (!confirm('Remove this stop and its activities?')) return
    await api.deleteStop(stopId)
    load()
  }

  if (!trip) return <div className="page-loading">Loading trip...</div>

  return (
    <div className="page">
      <div className="row-between">
        <h2>{trip.name}</h2>
        <div className="header-actions">
          <Link to={`/trips/${tripId}/edit`} className="btn secondary">Edit Trip</Link>
          <Link to={`/trips/${tripId}/view`} className="btn secondary">View Itinerary</Link>
          <Link to={`/trips/${tripId}/budget`} className="btn secondary">Budget</Link>
        </div>
      </div>

      <div className="add-stop-box">
        <label>Add a city stop
          <input
            value={cityQuery}
            onChange={e => searchCities(e.target.value)}
            placeholder="Search cities... e.g. Paris"
          />
        </label>
        {cityResults.length > 0 && (
          <ul className="dropdown">
            {cityResults.map(c => (
              <li key={c.id} onClick={() => addStop(c)}>
                {c.city_name}, {c.country} <span className="muted">(cost index {c.cost_index}/5)</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <p className="error">{error}</p>}

      <div className="stops-list">
        {(trip.stops || []).map(stop => (
          <StopCard key={stop.id} stop={stop} onRemove={() => removeStop(stop.id)} onChange={load} />
        ))}
        {(!trip.stops || trip.stops.length === 0) && <p className="muted">No stops yet — search a city above to start building your itinerary.</p>}
      </div>
    </div>
  )
}

function StopCard({ stop, onRemove, onChange }) {
  const [activityQuery, setActivityQuery] = useState('')
  const [activityResults, setActivityResults] = useState([])
  const [customName, setCustomName] = useState('')
  const [customCost, setCustomCost] = useState('')

  async function searchActivities() {
    const results = await api.searchActivities(stop.city_name)
    setActivityResults(results)
  }

  async function addActivity(a) {
    await api.addActivity(stop.id, {
      name: a.name,
      category: a.category,
      cost: a.typical_cost,
      duration_hours: a.duration_hours,
    })
    onChange()
  }

  async function addCustomActivity(e) {
    e.preventDefault()
    if (!customName) return
    await api.addActivity(stop.id, { name: customName, cost: Number(customCost) || 0, category: 'custom' })
    setCustomName('')
    setCustomCost('')
    onChange()
  }

  async function removeActivity(id) {
    await api.deleteActivity(id)
    onChange()
  }

  return (
    <div className="stop-card">
      <div className="row-between">
        <h3>{stop.city_name}, {stop.country}</h3>
        <button className="link-btn danger" onClick={onRemove}>Remove stop</button>
      </div>

      <ul className="activity-list">
        {(stop.activities || []).map(a => (
          <li key={a.id}>
            {a.name} <span className="muted">({a.category}, ${a.cost})</span>
            <button className="link-btn danger" onClick={() => removeActivity(a.id)}>x</button>
          </li>
        ))}
      </ul>

      <details onToggle={searchActivities}>
        <summary>+ Add activity</summary>
        <div className="activity-picker">
          {activityResults.map(a => (
            <button key={a.id} type="button" className="chip" onClick={() => addActivity(a)}>
              {a.name} (${a.typical_cost})
            </button>
          ))}
          <form onSubmit={addCustomActivity} className="custom-activity-form">
            <input placeholder="Custom activity name" value={customName} onChange={e => setCustomName(e.target.value)} />
            <input placeholder="Cost" type="number" value={customCost} onChange={e => setCustomCost(e.target.value)} />
            <button type="submit">Add</button>
          </form>
        </div>
      </details>
    </div>
  )
}
