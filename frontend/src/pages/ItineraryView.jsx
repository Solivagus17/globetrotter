import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'
import TripMap from '../components/TripMap'
import { IconMap, IconPin, IconUtensils, IconActivity, IconLandmark, IconBed, IconCamera, IconPlane, IconFileText } from '../components/Icons'

export default function ItineraryView() {
  const { tripId } = useParams()
  const [plannerData, setPlannerData] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [showMap, setShowMap] = useState(true)

  useEffect(() => {
    api.getTripDays(tripId).then(data => {
      setPlannerData(data)
      if (data.days && data.days.length > 0) {
        setSelectedDate(data.days[0].date)
      }
    })
  }, [tripId])

  if (!plannerData) return <div className="page-loading">Loading your itinerary...</div>

  const trip = plannerData.trip || {}
  const days = plannerData.days || []
  const totalItems = days.reduce((sum, d) => sum + (d.items?.length || 0), 0)

  // Extract map stops for days that have items
  const storedCities = JSON.parse(localStorage.getItem(`trip_${tripId}_day_cities`) || '{}')
  const mapStops = []
  days.forEach((day, dIdx) => {
    const items = day.items || []
    if (items.length > 0) {
      const dayCity = storedCities[day.date] || day.city_name || ''
      mapStops.push({
        id: `day-${dIdx}`,
        city_name: `${day.formatted_date}${dayCity ? ': ' + dayCity : ''}`,
        country: `${items.length} ${items.length === 1 ? 'Place' : 'Places'} Planned`,
        lat: 48.8566 + (dIdx * 0.03),
        lon: 2.3522 + (dIdx * 0.03),
        activities: items.map(item => ({ category: item.category, name: item.name, cost: item.cost })),
      })
    }
  })

  return (
    <div className="page itinerary-view-page">
      {/* View Header */}
      <div className="row-between reveal">
        <div>
          <h2>{trip.name}</h2>
          <p className="muted">
            {trip.start_date ? `${trip.start_date} → ${trip.end_date || ''} · ` : ''}
            {days.length} {days.length === 1 ? 'Day' : 'Days'} · {totalItems} Planned Places
          </p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className={`btn small ${showMap ? 'active' : 'secondary'}`}
            onClick={() => setShowMap(!showMap)}
          >
            <IconMap size={14} /> {showMap ? 'Hide Map' : 'Show Map'}
          </button>
          <Link to={`/trips/${tripId}/builder`} className="btn small">Day Planner</Link>
          <Link to={`/trips/${tripId}/budget`} className="btn secondary small">Budget (₹)</Link>
        </div>
      </div>

      {/* Hero Cover Image if exists */}
      {trip.cover_photo_url && (
        <div className="trip-hero reveal reveal-d1">
          <img src={trip.cover_photo_url} alt={`${trip.name} cover`} />
        </div>
      )}

      {/* Interactive OpenStreetMap */}
      {showMap && mapStops.length > 0 && (
        <div className="builder-map-container reveal reveal-d2" style={{ marginBottom: 32 }}>
          <TripMap
            stops={mapStops}
            height="320px"
          />
        </div>
      )}

      {/* Day-by-Day Timeline */}
      <div className="timeline">
        {days.map((day, i) => {
          const items = day.items || []
          const dayCity = storedCities[day.date] || day.city_name || ''

          return (
            <div
              key={day.date}
              className={`timeline-stop reveal ${selectedDate === day.date ? 'timeline-stop-active' : ''}`}
              style={{ animationDelay: `${0.06 * (i + 1)}s` }}
            >
              <div
                className="timeline-marker"
                onClick={() => setSelectedDate(day.date)}
                style={{ cursor: 'pointer' }}
                title="Click to select day"
              >
                {day.day_number}
              </div>

              <div className="timeline-content">
                <div className="timeline-stop-header">
                  <div>
                    <h3>{day.formatted_date}</h3>
                    {dayCity && (
                      <p className="muted">
                        <IconPin size={12} /> {dayCity}
                      </p>
                    )}
                  </div>
                  <span className="badge">{items.length} {items.length === 1 ? 'place' : 'places'}</span>
                </div>

                {items.length === 0 ? (
                  <p className="muted" style={{ marginTop: 8 }}>No items scheduled for this day.</p>
                ) : (
                  <ul className="timeline-activity-items" style={{ marginTop: 12 }}>
                    {items.map(item => (
                      <li key={item.id} className="timeline-activity-item">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ color: 'var(--primary-dark)' }}>
                            {item.category === 'food' ? <IconUtensils size={14} /> :
                             item.category === 'stay' ? <IconBed size={14} /> :
                             item.category === 'photo' ? <IconCamera size={14} /> :
                             item.category === 'flight' ? <IconPlane size={14} /> :
                             item.category === 'note' ? <IconFileText size={14} /> :
                             <IconPin size={14} />}
                          </span>
                          <span className="item-name">{item.name}</span>
                        </div>
                        <span className="item-meta">
                          {item.cost > 0 && `₹${item.cost}`}
                          {item.notes ? ` · ${item.notes}` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )
        })}

        {days.length === 0 && (
          <div className="empty-state reveal">
            <div className="empty-icon-wrap">
              <IconPin size={36} />
            </div>
            <h3>No itinerary days found</h3>
            <p className="muted">Go to Day Planner to start organizing your days, saves, and activities.</p>
            <Link to={`/trips/${tripId}/builder`} className="btn">Open Day Planner</Link>
          </div>
        )}
      </div>
    </div>
  )
}
