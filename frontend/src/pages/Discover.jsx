import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { IconSearch, IconStar, IconBookmark, IconPlus, IconMap, IconPin } from '../components/Icons'
import TripMap from '../components/TripMap'

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'sightseeing', label: 'Sightseeing' },
  { id: 'food', label: 'Food & Drink' },
  { id: 'adventure', label: 'Adventure' },
  { id: 'culture', label: 'Culture & Arts' },
  { id: 'relaxation', label: 'Relaxation' },
]

export default function Discover() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialCity = searchParams.get('city') || 'Paris'
  const initialCategory = searchParams.get('category') || 'all'

  const [city, setCity] = useState(initialCity)
  const [cityInput, setCityInput] = useState(initialCity)
  const [category, setCategory] = useState(initialCategory)
  const [sortBy, setSortBy] = useState('rating')
  const [places, setPlaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [showMap, setShowMap] = useState(false)
  const [savedPlaceIds, setSavedPlaceIds] = useState(new Set())
  const [trips, setTrips] = useState([])
  const [selectedPlaceForTrip, setSelectedPlaceForTrip] = useState(null)
  const [selectedTripId, setSelectedTripId] = useState('')
  const [tripDays, setTripDays] = useState([])
  const [selectedDayDate, setSelectedDayDate] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api.listSaves().then(saves => {
      setSavedPlaceIds(new Set((saves || []).map(s => s.place_id || s.name)))
    }).catch(() => {})

    api.listTrips().then(data => {
      setTrips(data || [])
      if (data && data.length > 0) {
        setSelectedTripId(data[0].id)
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    api.discoverPlaces(city, category)
      .then(results => {
        if (cancelled) return
        setPlaces(results || [])
      })
      .catch(e => {
        if (cancelled) return
        setError(e.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [city, category])

  function handleCitySearch(e) {
    e.preventDefault()
    if (cityInput.trim()) {
      setCity(cityInput.trim())
      setSearchParams({ city: cityInput.trim(), category })
    }
  }

  function handleCategoryChange(catId) {
    setCategory(catId)
    setSearchParams({ city, category: catId })
  }

  async function handleToggleSave(place) {
    const isSaved = savedPlaceIds.has(place.id || place.name)
    if (isSaved) return

    try {
      await api.createSave({
        place_id: place.id,
        name: place.name,
        category: place.category,
        photo_url: place.photo_url,
        description: place.description,
        cost: place.cost,
        city_name: place.city_name || city,
        rating: place.rating,
        address: place.address,
        lat: place.lat,
        lng: place.lng,
      })
      setSavedPlaceIds(prev => new Set([...prev, place.id || place.name]))
      setActionSuccess(`Saved "${place.name}" to your Saves!`)
      setTimeout(() => setActionSuccess(''), 3000)
    } catch (err) {
      setError(err.message)
    }
  }

  async function openAddToTripModal(place) {
    setSelectedPlaceForTrip(place)
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
        name: selectedPlaceForTrip.name,
        category: selectedPlaceForTrip.category || 'place',
        cost: selectedPlaceForTrip.cost || 0,
        notes: selectedPlaceForTrip.address || selectedPlaceForTrip.description || '',
        photo_url: selectedPlaceForTrip.photo_url || '',
        location_name: selectedPlaceForTrip.city_name || city,
      })

      setActionSuccess(`Added "${selectedPlaceForTrip.name}" to day schedule!`)
      setSelectedPlaceForTrip(null)
      setTimeout(() => setActionSuccess(''), 3500)
    } catch (err) {
      setError(err.message)
    }
  }

  const sortedPlaces = [...places].sort((a, b) => {
    if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0)
    if (sortBy === 'popularity') return (b.reviews_count || 0) - (a.reviews_count || 0)
    if (sortBy === 'price') return (a.cost || 0) - (b.cost || 0)
    return 0
  })

  const mapStops = sortedPlaces.map((p, i) => ({
    id: p.id || `p-${i}`,
    city_name: p.name,
    country: p.address || city,
    lat: p.lat || 48.8566,
    lon: p.lng || 2.3522,
    activities: [{ category: p.category, name: p.name, cost: p.cost }],
  }))

  return (
    <div className="page discover-page">
      {/* Header */}
      <div className="discover-header-section reveal">
        <div className="discover-title-wrap">
          <h2>Discover Places</h2>
          <p className="muted">Search attractions, local dining, and top spots for your trips.</p>
        </div>

        {/* Minimal Search Bar */}
        <form onSubmit={handleCitySearch} className="discover-search-pill">
          <IconSearch size={18} className="search-icon-muted" />
          <input
            value={cityInput}
            onChange={e => setCityInput(e.target.value)}
            placeholder="Search destination city... e.g. Paris, Tokyo, Goa, Rome"
          />
          <button type="submit" className="btn small">Search</button>
        </form>
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

      {/* Filter and Sort Row */}
      <div className="discover-filter-row reveal reveal-d1">
        <div className="category-chips-row">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              type="button"
              className={`chip ${category === cat.id ? 'active' : ''}`}
              onClick={() => handleCategoryChange(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="discover-controls-right">
          <div className="sort-dropdown-wrap">
            <span className="muted" style={{ fontSize: '13px' }}>Sort:</span>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="sort-select">
              <option value="rating">Top Rated</option>
              <option value="popularity">Most Popular</option>
              <option value="price">Price: Low to High</option>
            </select>
          </div>

          <button
            type="button"
            className={`btn small ${showMap ? 'active' : 'secondary'}`}
            onClick={() => setShowMap(!showMap)}
          >
            <IconMap size={14} /> {showMap ? 'Hide Map' : 'Map View'}
          </button>
        </div>
      </div>

      {/* Map View */}
      {showMap && mapStops.length > 0 && (
        <div className="builder-map-container reveal reveal-d2" style={{ marginBottom: 32 }}>
          <TripMap stops={mapStops} height="320px" />
        </div>
      )}

      {/* Places Grid */}
      {loading ? (
        <div className="page-loading">Searching places in {city}...</div>
      ) : sortedPlaces.length === 0 ? (
        <div className="empty-state reveal">
          <div className="empty-icon-wrap">
            <IconSearch size={32} />
          </div>
          <h3>No places found in {city}</h3>
          <p className="muted">Try searching another city or selecting a different category.</p>
        </div>
      ) : (
        <div className="discover-grid">
          {sortedPlaces.map((place, i) => {
            const isSaved = savedPlaceIds.has(place.id || place.name)
            const delayClass = i < 9 ? `reveal-d${i + 1}` : 'reveal-d9'

            return (
              <div key={place.id || i} className={`discover-card reveal ${delayClass}`}>
                <div className="discover-card-img-wrap">
                  <img src={place.photo_url} alt={place.name} loading="lazy" />
                  <span className="discover-category-badge">{place.category}</span>
                  <button
                    type="button"
                    className={`discover-save-icon-btn ${isSaved ? 'saved' : ''}`}
                    title={isSaved ? 'Saved in My Places' : 'Save to My Places'}
                    onClick={() => handleToggleSave(place)}
                  >
                    <IconBookmark size={15} filled={isSaved} />
                  </button>
                </div>

                <div className="discover-card-body">
                  <div className="discover-card-top-info">
                    <div className="discover-rating-pill">
                      <IconStar size={13} filled={true} />
                      <strong>{place.rating}</strong>
                      <span className="muted">({place.reviews_count})</span>
                    </div>
                    {place.cost > 0 && (
                      <span className="discover-price-tag">₹{place.cost}</span>
                    )}
                  </div>

                  <Link
                    to={`/discover/${place.id}?city=${encodeURIComponent(place.city_name || city)}&name=${encodeURIComponent(place.name)}`}
                    className="discover-title-link"
                  >
                    <h3>{place.name}</h3>
                  </Link>

                  {place.address && (
                    <p className="discover-address-text">
                      <IconPin size={12} /> {place.address}
                    </p>
                  )}

                  <p className="discover-desc-text">{place.description}</p>

                  <div className="discover-card-actions">
                    <button
                      type="button"
                      className="btn secondary small"
                      onClick={() => openAddToTripModal(place)}
                    >
                      <IconPlus size={13} /> Add to Trip
                    </button>
                    <Link
                      to={`/discover/${place.id}?city=${encodeURIComponent(place.city_name || city)}&name=${encodeURIComponent(place.name)}`}
                      className="btn secondary small"
                    >
                      Details
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add to Trip Picker Modal */}
      {selectedPlaceForTrip && (
        <div className="modal-backdrop" onClick={() => setSelectedPlaceForTrip(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>Add to Trip</h3>
            <p className="muted" style={{ marginBottom: 20 }}>
              Add <strong>{selectedPlaceForTrip.name}</strong> to your trip itinerary.
            </p>

            {trips.length === 0 ? (
              <div>
                <p className="muted" style={{ marginBottom: 16 }}>You don't have any trips created yet.</p>
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

                <div className="form-actions" style={{ marginTop: 24 }}>
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => setSelectedPlaceForTrip(null)}
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
