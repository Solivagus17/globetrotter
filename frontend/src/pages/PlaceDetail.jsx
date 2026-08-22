import { useEffect, useState } from 'react'
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { IconStar, IconBookmark, IconPlus, IconPin, IconMap } from '../components/Icons'
import TripMap from '../components/TripMap'

export default function PlaceDetail() {
  const { placeId } = useParams()
  const [searchParams] = useSearchParams()
  const city = searchParams.get('city') || 'Paris'
  const name = searchParams.get('name') || 'Historic Destination'
  const navigate = useNavigate()

  const [place, setPlace] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isSaved, setIsSaved] = useState(false)
  const [trips, setTrips] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedTripId, setSelectedTripId] = useState('')
  const [selectedStopId, setSelectedStopId] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    api.getPlace(placeId, city, name)
      .then(data => {
        if (cancelled) return
        setPlace(data)
      })
      .catch(e => setError(e.message))
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    api.listSaves().then(saves => {
      if ((saves || []).some(s => s.place_id === placeId || s.name === name)) {
        setIsSaved(true)
      }
    }).catch(() => {})

    api.listTrips().then(data => {
      setTrips(data || [])
      if (data && data.length > 0) {
        setSelectedTripId(data[0].id)
      }
    }).catch(() => {})

    return () => { cancelled = true }
  }, [placeId, city, name])

  async function handleToggleSave() {
    if (isSaved) return
    try {
      await api.createSave({
        place_id: place.id,
        name: place.name,
        category: place.category,
        photo_url: place.photo_url,
        description: place.description,
        cost: place.cost,
        city_name: place.city_name,
        rating: place.rating,
        address: place.address,
        lat: place.lat,
        lng: place.lng,
      })
      setIsSaved(true)
      setActionSuccess(`Saved "${place.name}" to your personal Saves!`)
      setTimeout(() => setActionSuccess(''), 3500)
    } catch (err) {
      setError(err.message)
    }
  }

  const [tripDays, setTripDays] = useState([])
  const [selectedDayDate, setSelectedDayDate] = useState('')

  async function openAddModal() {
    setShowAddModal(true)
    const tId = selectedTripId || (trips.length > 0 ? trips[0].id : null)
    if (tId) {
      try {
        const data = await api.getTripDays(tId)
        const days = data.days || []
        setTripDays(days)
        if (days.length > 0) setSelectedDayDate(days[0].date)
      } catch (err) {
        console.error(err)
      }
    }
  }

  async function handleTripSelect(tId) {
    setSelectedTripId(tId)
    try {
      const data = await api.getTripDays(tId)
      const days = data.days || []
      setTripDays(days)
      if (days.length > 0) setSelectedDayDate(days[0].date)
    } catch (err) {
      console.error(err)
    }
  }

  async function handleConfirmAddToTrip() {
    if (!selectedTripId) {
      setError('Please select a trip first.')
      return
    }

    try {
      const targetDate = selectedDayDate || (tripDays.length > 0 ? tripDays[0].date : new Date().toISOString().slice(0, 10))
      await api.addDayItem(selectedTripId, targetDate, {
        name: place.name,
        category: place.category || 'place',
        cost: place.cost || 0,
        notes: place.address || place.description || '',
        photo_url: place.photo_url || '',
        location_name: place.city_name || '',
      })

      setActionSuccess(`Added "${place.name}" to day schedule!`)
      setShowAddModal(false)
      setTimeout(() => setActionSuccess(''), 4000)
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <div className="page-loading">Loading place details...</div>
  if (!place) return <div className="page-loading">Place not found.</div>

  const mapStops = [{
    id: place.id,
    city_name: place.name,
    country: place.address || place.city_name,
    lat: place.lat || 48.8566,
    lon: place.lng || 2.3522,
    activities: [{ category: place.category, name: place.name, cost: place.cost }],
  }]

  return (
    <div className="page place-detail-page">
      {/* Top Breadcrumb */}
      <div className="row-between reveal">
        <Link to={`/discover?city=${encodeURIComponent(place.city_name)}`} className="link-btn">
          ← Back to Discover in {place.city_name}
        </Link>
        <div className="header-actions">
          <button
            type="button"
            className={`btn secondary small ${isSaved ? 'active' : ''}`}
            onClick={handleToggleSave}
          >
            <IconBookmark size={14} filled={isSaved} /> {isSaved ? 'Saved in My Places' : 'Save to My Places'}
          </button>
          <button
            type="button"
            className="btn small"
            onClick={openAddModal}
          >
            <IconPlus size={14} /> Add to Trip
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="profile-alert-success reveal">
          <span>✓ {actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="profile-alert-error reveal">
          <span>{error}</span>
        </div>
      )}

      {/* Place Hero Card */}
      <div className="place-detail-hero reveal reveal-d1">
        <img src={place.photo_url} alt={place.name} />
        <div className="place-detail-hero-content">
          <span className="discover-category-badge">{place.category}</span>
          <h2>{place.name}</h2>
          <div className="place-detail-meta-row">
            <div className="discover-rating-pill">
              <IconStar size={14} filled={true} />
              <strong>{place.rating}</strong>
              <span className="muted">({place.reviews_count} reviews)</span>
            </div>
            {place.cost > 0 && <span className="discover-price-tag">₹{place.cost}</span>}
          </div>
        </div>
      </div>

      {/* Content & Map Grid */}
      <div className="place-detail-grid reveal reveal-d2">
        <div className="place-detail-main">
          <h3>About This Place</h3>
          <p className="place-detail-desc">{place.description}</p>

          <h3 style={{ marginTop: 24 }}>Location & Details</h3>
          <p className="place-detail-address">
            <IconPin size={14} /> {place.address}
          </p>
        </div>

        {/* Embedded Leaflet Map */}
        <div className="place-detail-map-side">
          <span className="field-label">Map Location</span>
          <div className="builder-map-container" style={{ height: '240px' }}>
            <TripMap stops={mapStops} height="240px" />
          </div>
        </div>
      </div>

      {/* Add to Trip Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>Add to Trip</h3>
            <p className="muted" style={{ marginBottom: 16 }}>
              Add <strong>{place.name}</strong> to one of your upcoming trips.
            </p>

            {trips.length === 0 ? (
              <div>
                <p className="muted" style={{ marginBottom: 16 }}>No trips created yet.</p>
                <Link to="/trips/new" className="btn">Plan a New Trip</Link>
              </div>
            ) : (
              <div>
                <label>Select Trip
                  <select
                    value={selectedTripId}
                    onChange={e => handleTripSelect(e.target.value)}
                  >
                    {trips.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </label>

                <label>Select Day in Trip
                  <select
                    value={selectedDayDate}
                    onChange={e => setSelectedDayDate(e.target.value)}
                  >
                    {tripDays.map(d => (
                      <option key={d.date} value={d.date}>{d.formatted_date} ({d.city_name || 'Day'})</option>
                    ))}
                  </select>
                </label>

                <div className="form-actions" style={{ marginTop: 20 }}>
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={handleConfirmAddToTrip}
                  >
                    Confirm & Add
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
