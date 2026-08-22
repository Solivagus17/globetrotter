import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'

export default function ItineraryView() {
  const { tripId } = useParams()
  const [trip, setTrip] = useState(null)

  useEffect(() => { api.getTrip(tripId).then(setTrip) }, [tripId])

  if (!trip) return <div className="page-loading">Loading...</div>

  return (
    <div className="page">
      <div className="row-between">
        <h2>{trip.name} — Itinerary</h2>
        <Link to={`/trips/${tripId}/builder`} className="btn secondary">Edit</Link>
      </div>
      <p className="muted">{trip.start_date} → {trip.end_date}</p>

      {trip.cover_photo_url && (
        <div className="trip-hero">
          <img src={trip.cover_photo_url} alt={`${trip.name} cover`} />
        </div>
      )}

      <div className="timeline">
        {(trip.stops || []).map((stop, i) => (
          <div key={stop.id} className="timeline-stop">
            <div className="timeline-marker">{i + 1}</div>
            <div className="timeline-content">
              <h3>{stop.city_name}, {stop.country}</h3>
              <p className="muted">{stop.start_date || ''} {stop.end_date ? `→ ${stop.end_date}` : ''}</p>
              <ul className="activity-list">
                {(stop.activities || []).map(a => (
                  <li key={a.id}>
                    <strong>{a.name}</strong> — {a.category}, {a.duration_hours}h, ${a.cost}
                  </li>
                ))}
                {(!stop.activities || stop.activities.length === 0) && <li className="muted">No activities added yet</li>}
              </ul>
            </div>
          </div>
        ))}
        {(!trip.stops || trip.stops.length === 0) && <p>No stops added yet.</p>}
      </div>
    </div>
  )
}
