import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { supabase } from '../supabaseClient'
import { useToast } from '../context/ToastContext'
import TripMap from '../components/TripMap'
import {
  IconCompass,
  IconMap,
  IconCalendar,
  IconPin,
  IconBed,
  IconUtensils,
  IconLandmark,
  IconPlane,
  IconWallet,
  IconSparkles,
  IconGlobe,
  IconFileText,
  IconCheck,
} from '../components/Icons'

const CATEGORY_ICONS = {
  stay: <IconBed size={15} />,
  hotel: <IconBed size={15} />,
  flight: <IconPlane size={15} />,
  transit: <IconPlane size={15} />,
  food: <IconUtensils size={15} />,
  dining: <IconUtensils size={15} />,
  sightseeing: <IconLandmark size={15} />,
  attraction: <IconLandmark size={15} />,
  adventure: <IconCompass size={15} />,
  culture: <IconLandmark size={15} />,
  transport: <IconPlane size={15} />,
  other: <IconPin size={15} />,
}

export default function PublicTrip() {
  const { tripId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [trip, setTrip] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userSession, setUserSession] = useState(null)
  const [cloning, setCloning] = useState(false)
  const [showMap, setShowMap] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserSession(data.session))
  }, [])

  useEffect(() => {
    setLoading(true)
    api.getPublicTrip(tripId)
      .then(data => {
        setTrip(data)
      })
      .catch(err => {
        setError(err.message || 'This trip is private or does not exist.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [tripId])

  async function handleCopyToMyTrips() {
    if (!userSession) {
      navigate(`/login?redirect=/public/trips/${tripId}`)
      return
    }

    setCloning(true)
    try {
      const cloned = await api.duplicateTrip(tripId)
      toast.success('Trip copied successfully to your account!')
      navigate(`/trips/${cloned.id}/builder`)
    } catch (err) {
      toast.error(err.message || 'Failed to copy trip.')
    } finally {
      setCloning(false)
    }
  }

  function handleCopyShareLink() {
    navigator.clipboard.writeText(window.location.href)
    toast.success('Public itinerary link copied to clipboard!')
  }

  if (loading) {
    return (
      <div className="page public-trip-page">
        <div className="skeleton" style={{ height: 220, borderRadius: 16, marginBottom: 20 }} />
        <div className="skeleton" style={{ height: 80, borderRadius: 12, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 160, borderRadius: 12 }} />
      </div>
    )
  }

  if (error || !trip) {
    return (
      <div className="page public-trip-page" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div className="empty-icon-wrap" style={{ margin: '0 auto 16px' }}>
          <IconCompass size={36} />
        </div>
        <h2>Private or Unavailable Itinerary</h2>
        <p className="muted" style={{ margin: '12px 0 24px', maxWidth: 460, marginInline: 'auto' }}>
          {error || 'This travel itinerary is private and has not been shared publicly by its creator.'}
        </p>
        <Link to="/" className="btn">
          Go to GlobeTrotter Home
        </Link>
      </div>
    )
  }

  const stops = trip.stops || []
  const dayItems = trip.day_items || []
  const days = trip.days || []
  const totalCost = dayItems.reduce((s, it) => s + (parseFloat(it.cost) || 0), 0)

  // Map stops with coordinates for TripMap
  const mapStops = stops.map(s => ({
    city_name: s.city_name || s.name || trip.destination_city || 'Stop',
    start_date: s.start_date,
    end_date: s.end_date,
    lat: s.lat,
    lng: s.lng,
  }))

  return (
    <div className="page public-trip-page">
      {/* Top Banner / Cover */}
      <div className="public-trip-hero reveal">
        {trip.cover_photo_url ? (
          <img src={trip.cover_photo_url} alt={trip.name} className="public-hero-img" />
        ) : (
          <div className="public-hero-gradient" />
        )}
        <div className="public-hero-overlay">
          <div className="public-hero-badge-row">
            <span className="badge" style={{ background: 'var(--primary)', color: '#211C10', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <IconGlobe size={13} /> Public Shared Itinerary
            </span>
            <span className="destination-badge">
              <IconPin size={12} style={{ marginRight: 4, display: 'inline-block' }} />
              {trip.destination_city || trip.name}
            </span>
          </div>
          <h1 className="public-hero-title">{trip.name}</h1>
          <p className="public-hero-dates">
            <IconCalendar size={15} /> {trip.start_date || 'Flexible'} {trip.end_date ? `→ ${trip.end_date}` : ''}
          </p>
        </div>
      </div>

      {/* Action Bar */}
      <div className="public-action-bar reveal reveal-d1">
        <div className="public-summary-tags">
          <span className="public-tag">
            <IconPin size={14} /> {stops.length > 0 ? `${stops.length} Stops` : (trip.destination_city || '1 Destination')}
          </span>
          <span className="public-tag">
            <IconCalendar size={14} /> {dayItems.length} Scheduled Activities
          </span>
          {totalCost > 0 && (
            <span className="public-tag">
              <IconWallet size={14} /> Est. ₹{Math.round(totalCost).toLocaleString('en-IN')}
            </span>
          )}
        </div>

        <div className="public-action-buttons">
          <button
            type="button"
            className="btn secondary small row-center"
            onClick={() => setShowMap(!showMap)}
            style={{ gap: 6 }}
          >
            <IconMap size={14} />
            <span>{showMap ? 'Hide Map' : 'Show Map'}</span>
          </button>

          <button
            type="button"
            className="btn secondary small row-center"
            onClick={handleCopyShareLink}
            style={{ gap: 6 }}
            title="Copy shareable link"
          >
            <IconFileText size={14} />
            <span>Copy Link</span>
          </button>

          <a
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Check out this travel itinerary for ${trip.name} on GlobeTrotter: ${window.location.href}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn secondary small"
            style={{ textDecoration: 'none' }}
            title="Share on WhatsApp"
          >
            WhatsApp
          </a>

          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Exploring this travel plan for ${trip.name} on GlobeTrotter!`) }&url=${encodeURIComponent(window.location.href)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn secondary small"
            style={{ textDecoration: 'none' }}
            title="Share on X"
          >
            Share on X
          </a>

          <button
            type="button"
            className="btn small row-center"
            onClick={handleCopyToMyTrips}
            disabled={cloning}
            style={{ gap: 6 }}
          >
            <IconSparkles size={14} />
            <span>{cloning ? 'Copying...' : 'Copy to My Trips'}</span>
          </button>
        </div>
      </div>

      {trip.description && (
        <div className="public-trip-desc-card reveal reveal-d2">
          <p>{trip.description}</p>
        </div>
      )}

      {/* Interactive Leaflet Route Map */}
      {showMap && (
        <div className="builder-map-container reveal reveal-d2" style={{ marginBottom: 28 }}>
          <TripMap
            stops={mapStops.length > 0 ? mapStops : [{ city_name: trip.destination_city || trip.name }]}
            height="300px"
          />
        </div>
      )}

      {/* Main Public Day-by-Day Timeline */}
      <div className="public-timeline-section reveal reveal-d2">
        <h3 style={{ marginBottom: 18 }}>Itinerary Timeline & Scheduled Days</h3>

        {days.length === 0 ? (
          <div className="empty-state">
            <p className="muted">No scheduled activities listed on this shared itinerary.</p>
          </div>
        ) : (
          <div className="public-days-list">
            {days.map((day) => {
              const items = day.items || []
              const daySubtotal = items.reduce((s, it) => s + (parseFloat(it.cost) || 0), 0)

              return (
                <div key={day.date || day.day_number} className="public-day-card">
                  <div className="public-day-header">
                    <div className="row-center" style={{ gap: 10 }}>
                      <span className="day-number-badge">Day {day.day_number}</span>
                      <strong style={{ fontSize: '15px', color: 'var(--text)' }}>
                        {day.formatted_date || day.date}
                      </strong>
                      {day.city_name && (
                        <span className="muted" style={{ fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <IconPin size={11} color="var(--primary-dark)" /> {day.city_name}
                        </span>
                      )}
                    </div>
                    {daySubtotal > 0 && (
                      <span className="muted" style={{ fontSize: '13px', fontWeight: 600 }}>
                        ₹{Math.round(daySubtotal).toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>

                  <div className="public-day-items">
                    {items.length === 0 ? (
                      <div style={{ padding: '14px 18px', color: 'var(--muted)', fontSize: '13px', fontStyle: 'italic' }}>
                        Free exploration day or flexible travel time.
                      </div>
                    ) : (
                      items.map((it, itemIdx) => {
                        const catKey = (it.category || 'sightseeing').toLowerCase()
                        const catIcon = CATEGORY_ICONS[catKey] || <IconPin size={15} />

                        return (
                          <div key={it.id || itemIdx} className="public-activity-row">
                            <div className="public-activity-icon-wrap">
                              {catIcon}
                            </div>
                            <div className="public-activity-info">
                              <div className="row-between">
                                <strong className="public-activity-name">{it.name}</strong>
                                {parseFloat(it.cost) > 0 && (
                                  <span className="public-activity-cost">
                                    ₹{Math.round(it.cost).toLocaleString('en-IN')}
                                  </span>
                                )}
                              </div>
                              {it.location_name && (
                                <span className="public-activity-loc" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  <IconPin size={11} color="var(--primary-dark)" /> {it.location_name}
                                </span>
                              )}
                              {it.notes && (
                                <p className="public-activity-notes">{it.notes}</p>
                              )}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
