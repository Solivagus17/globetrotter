import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'
import TripMap from '../components/TripMap'
import { searchDestinationsOSM, getCategorizedPlaces, searchPlacesInCity, normalizeCategory } from '../osmService'
import { IconMap, IconPin, IconUtensils, IconActivity, IconLandmark, IconSearch, IconGlobe } from '../components/Icons'

export default function ItineraryBuilder() {
  const { tripId } = useParams()
  const [trip, setTrip] = useState(null)
  const [cityQuery, setCityQuery] = useState('')
  const [destResults, setDestResults] = useState([])
  const [searchingDest, setSearchingDest] = useState(false)
  const [selectedStopId, setSelectedStopId] = useState(null)
  const [showMap, setShowMap] = useState(true)
  const [error, setError] = useState('')
  const searchTimeoutRef = useRef(null)

  async function load() {
    try {
      const data = await api.getTrip(tripId)
      setTrip(data)
      if (data.stops && data.stops.length > 0 && !selectedStopId) {
        setSelectedStopId(data.stops[0].id)
      }
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => {
    load()
  }, [tripId])

  function handleSearchInput(q) {
    setCityQuery(q)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)

    if (q.trim().length === 0) {
      setDestResults([])
      setSearchingDest(false)
      return
    }

    setSearchingDest(true)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchDestinationsOSM(q)
        setDestResults(results)
      } catch (err) {
        console.error('Destination search error:', err)
      } finally {
        setSearchingDest(false)
      }
    }, 280)
  }

  async function addStop(dest) {
    try {
      setError('')
      await api.addStop(tripId, {
        city_name: dest.city_name,
        country: dest.country,
        order_index: trip.stops?.length || 0,
      })
      setCityQuery('')
      setDestResults([])
      await load()
    } catch (e) {
      setError(e.message)
    }
  }

  async function removeStop(stopId) {
    if (!confirm('Remove this stop and all its planned places?')) return
    await api.deleteStop(stopId)
    if (selectedStopId === stopId) setSelectedStopId(null)
    load()
  }

  if (!trip) return <div className="page-loading">Loading your itinerary...</div>

  const stops = trip.stops || []

  return (
    <div className="page itinerary-builder-page">
      {/* Top Header */}
      <div className="row-between reveal">
        <div>
          <h2>{trip.name}</h2>
          <p className="muted">
            {trip.start_date ? `${trip.start_date} → ${trip.end_date || ''} · ` : ''}
            {stops.length} {stops.length === 1 ? 'Stop' : 'Stops'} Planned
          </p>
        </div>
        <div className="header-actions">
          <Link to={`/trips/${tripId}/planner`} className="btn small">Day Planner</Link>
          <button
            type="button"
            className={`btn small ${showMap ? 'active' : 'secondary'}`}
            onClick={() => setShowMap(!showMap)}
          >
            <IconMap size={14} /> {showMap ? 'Hide Map' : 'Show Map'}
          </button>
          <Link to={`/trips/${tripId}/view`} className="btn secondary small">Timeline View</Link>
          <Link to={`/trips/${tripId}/budget`} className="btn secondary small">Budget (₹)</Link>
          <Link to={`/trips/${tripId}/edit`} className="btn secondary small">Edit Trip</Link>
        </div>
      </div>

      {/* Interactive OpenStreetMap Section */}
      {showMap && (
        <div className="builder-map-container reveal reveal-d1">
          <TripMap
            stops={stops}
            selectedStopId={selectedStopId}
            onSelectStop={(s) => setSelectedStopId(s.id)}
            height="320px"
          />
        </div>
      )}

      {/* Destination & City Search from OpenStreetMap */}
      <div className="add-stop-box reveal reveal-d2">
        <label>
          <span className="label-with-icon"><IconPin size={14} /> Add Stop from OpenStreetMap & Worldwide Destinations</span>
          <div className="search-input-wrapper">
            <input
              value={cityQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              onFocus={() => {
                if (cityQuery.length === 0 && destResults.length === 0) {
                  searchDestinationsOSM('').then(setDestResults)
                }
              }}
              placeholder="Search city, town, island, or destination... e.g. Paris, Tokyo, Goa, Jaipur"
            />
            {searchingDest && <span className="search-spinner-icon">...</span>}
          </div>
        </label>

        {/* Rich Destination Dropdown */}
        {destResults.length > 0 && (
          <ul className="dropdown osm-dest-dropdown">
            <li className="dropdown-header">
              <span className="dropdown-header-title"><IconGlobe size={14} /> OpenStreetMap & Top Global Destinations</span>
              <button
                type="button"
                className="dropdown-close-btn"
                onClick={() => setDestResults([])}
              >
                ✕
              </button>
            </li>
            {destResults.map((dest, idx) => (
              <li
                key={`${dest.city_name}-${dest.country}-${idx}`}
                className="osm-dest-item"
                onClick={() => addStop(dest)}
              >
                <div className="dest-main-info">
                  <span className="dest-city">{dest.city_name}</span>
                  <span className="dest-country">{dest.country}</span>
                </div>
                <div className="dest-meta">
                  {dest.type && <span className="dest-badge">{dest.type}</span>}
                  {dest.lat && dest.lon && (
                    <span className="dest-coords">
                      {dest.lat.toFixed(2)}°, {dest.lon.toFixed(2)}°
                    </span>
                  )}
                  <span className="dest-add-btn">+ Add</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="error" style={{ marginBottom: 16 }}>{error}</p>}

      {/* Stops & Categorized Activities */}
      <div className="stops-list">
        {stops.map((stop, i) => (
          <div key={stop.id} className="reveal" style={{ animationDelay: `${0.08 * (i + 1)}s` }}>
            <StopCard
              stop={stop}
              stopIndex={i + 1}
              isSelected={selectedStopId === stop.id}
              onFocusMap={() => setSelectedStopId(stop.id)}
              onRemove={() => removeStop(stop.id)}
              onChange={load}
            />
          </div>
        ))}

        {stops.length === 0 && (
          <div className="empty-state reveal">
            <div className="empty-icon-wrap">
              <IconPin size={36} />
            </div>
            <h3>No stops added yet</h3>
            <p className="muted">Search a city above to place your first waypoint on OpenStreetMap and explore places to visit!</p>
          </div>
        )}
      </div>
    </div>
  )
}

function StopCard({ stop, stopIndex, isSelected, onFocusMap, onRemove, onChange }) {
  const [activeTab, setActiveTab] = useState('all')
  const [openSection, setOpenSection] = useState(null)
  
  const [searchQueries, setSearchQueries] = useState({ food: '', things_to_do: '', places_to_visit: '' })
  const [searchResults, setSearchResults] = useState({ food: [], things_to_do: [], places_to_visit: [] })
  const [isSearching, setIsSearching] = useState({ food: false, things_to_do: false, places_to_visit: false })

  const [customForms, setCustomForms] = useState({
    food: { name: '', cost: '', duration: 1.5, notes: '' },
    things_to_do: { name: '', cost: '', duration: 2, notes: '' },
    places_to_visit: { name: '', cost: '', duration: 2, notes: '' },
  })

  const suggestions = getCategorizedPlaces(stop.city_name)
  const activities = stop.activities || []

  const foodActivities = activities.filter(a => normalizeCategory(a.category) === 'food')
  const todoActivities = activities.filter(a => normalizeCategory(a.category) === 'things_to_do')
  const visitActivities = activities.filter(a => normalizeCategory(a.category) === 'places_to_visit')

  const stopTotalCost = activities.reduce((sum, a) => sum + (parseFloat(a.cost) || 0), 0)

  async function handleLiveSearchPlaces(categoryKey, query) {
    setSearchQueries(prev => ({ ...prev, [categoryKey]: query }))
    setIsSearching(prev => ({ ...prev, [categoryKey]: true }))
    try {
      const results = await searchPlacesInCity(stop.city_name, categoryKey, query)
      setSearchResults(prev => ({ ...prev, [categoryKey]: results }))
    } catch (err) {
      console.error('Error fetching places:', err)
    } finally {
      setIsSearching(prev => ({ ...prev, [categoryKey]: false }))
    }
  }

  function toggleSection(categoryKey) {
    if (openSection === categoryKey) {
      setOpenSection(null)
    } else {
      setOpenSection(categoryKey)
      if (searchResults[categoryKey].length === 0) {
        handleLiveSearchPlaces(categoryKey, searchQueries[categoryKey])
      }
    }
  }

  async function addSuggestedPlace(place, categoryKey) {
    await api.addActivity(stop.id, {
      name: place.name,
      category: categoryKey,
      cost: place.cost || 0,
      duration_hours: place.duration_hours || 1.5,
      notes: place.notes || '',
    })
    onChange()
  }

  async function handleAddCustom(e, categoryKey) {
    e.preventDefault()
    const form = customForms[categoryKey]
    if (!form.name.trim()) return

    await api.addActivity(stop.id, {
      name: form.name.trim(),
      category: categoryKey,
      cost: Number(form.cost) || 0,
      duration_hours: Number(form.duration) || 1,
      notes: form.notes || '',
    })

    setCustomForms(prev => ({
      ...prev,
      [categoryKey]: { name: '', cost: '', duration: 1.5, notes: '' },
    }))
    onChange()
  }

  async function removeActivity(id) {
    await api.deleteActivity(id)
    onChange()
  }

  return (
    <div className={`stop-card ${isSelected ? 'stop-card-selected' : ''}`}>
      {/* Stop Card Header */}
      <div className="stop-card-header">
        <div className="stop-card-title-row">
          <div className="stop-badge-number">{stopIndex}</div>
          <div>
            <h3>{stop.city_name}</h3>
            <span className="stop-country-text">{stop.country || ''}</span>
          </div>
        </div>

        <div className="stop-header-actions">
          <Link
            to={`/discover?city=${encodeURIComponent(stop.city_name)}`}
            className="btn secondary small"
            title={`Discover attractions, dining and places in ${stop.city_name}`}
          >
            <IconSearch size={12} /> Discover {stop.city_name}
          </Link>
          <button
            type="button"
            className="btn secondary small stop-focus-btn"
            onClick={onFocusMap}
            title="Locate on OpenStreetMap"
          >
            <IconPin size={12} /> Map
          </button>
          <button
            type="button"
            className="link-btn danger"
            onClick={onRemove}
            title="Delete this stop"
          >
            Remove Stop
          </button>
        </div>
      </div>

      {/* Stop summary badges */}
      <div className="stop-summary-bar">
        <div className="stop-stats-pills">
          <button
            type="button"
            className={`stop-tab-pill ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All ({activities.length})
          </button>
          <button
            type="button"
            className={`stop-tab-pill food ${activeTab === 'food' ? 'active' : ''}`}
            onClick={() => setActiveTab(activeTab === 'food' ? 'all' : 'food')}
          >
            <IconUtensils size={13} /> Food & Drink ({foodActivities.length})
          </button>
          <button
            type="button"
            className={`stop-tab-pill todo ${activeTab === 'things_to_do' ? 'active' : ''}`}
            onClick={() => setActiveTab(activeTab === 'things_to_do' ? 'all' : 'things_to_do')}
          >
            <IconActivity size={13} /> Things to Do ({todoActivities.length})
          </button>
          <button
            type="button"
            className={`stop-tab-pill visit ${activeTab === 'places_to_visit' ? 'active' : ''}`}
            onClick={() => setActiveTab(activeTab === 'places_to_visit' ? 'all' : 'places_to_visit')}
          >
            <IconLandmark size={13} /> Places to Visit ({visitActivities.length})
          </button>
        </div>
        <div className="stop-total-cost">
          <span className="muted">Est. Total:</span>
          <strong>₹{Math.round(stopTotalCost).toLocaleString('en-IN')}</strong>
        </div>
      </div>

      {/* SECTION 1: FOOD & DRINK */}
      {(activeTab === 'all' || activeTab === 'food') && (
        <div className="activity-section food-section">
          <div className="activity-section-header">
            <div className="section-title">
              <span className="section-icon"><IconUtensils size={16} /></span>
              <h4>Food & Drink</h4>
              <span className="section-count-badge">{foodActivities.length}</span>
            </div>
            <button
              type="button"
              className="btn secondary small section-explore-btn"
              onClick={() => toggleSection('food')}
            >
              <IconSearch size={12} /> {openSection === 'food' ? 'Close' : 'Search & Add Food'}
            </button>
          </div>

          {/* Added Food Activities List */}
          {foodActivities.length > 0 ? (
            <ul className="categorized-activity-list">
              {foodActivities.map(a => (
                <li key={a.id} className="categorized-activity-item food-item">
                  <div className="activity-info">
                    <span className="activity-name">{a.name}</span>
                    <div className="activity-subtext">
                      <span className="activity-meta-tag">₹{a.cost}</span>
                      {a.duration_hours > 0 && <span>· {a.duration_hours}h</span>}
                      {a.notes && <span className="activity-notes-text">· {a.notes}</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="activity-delete-btn"
                    title="Remove item"
                    onClick={() => removeActivity(a.id)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="section-empty-hint">No food or dining spots added yet.</p>
          )}

          {/* Expandable Food Live Search & Suggestions */}
          {openSection === 'food' && (
            <div className="section-explore-drawer">
              {/* Search Bar for Food & Drink */}
              <div className="place-search-bar-row">
                <input
                  className="place-search-input"
                  placeholder={`Search restaurants, cafes, bakeries in ${stop.city_name}...`}
                  value={searchQueries.food}
                  onChange={(e) => handleLiveSearchPlaces('food', e.target.value)}
                />
                {isSearching.food && <span className="search-status-text">Searching OpenStreetMap...</span>}
              </div>

              {/* Live Fetched Results */}
              {searchResults.food.length > 0 && (
                <div className="fetched-places-block">
                  <span className="suggestions-title">Discovered Places in {stop.city_name}:</span>
                  <div className="fetched-places-list">
                    {searchResults.food.map((p, idx) => (
                      <div key={idx} className="fetched-place-row">
                        <div className="fetched-place-info">
                          <span className="fetched-place-name">{p.name}</span>
                          <span className="fetched-place-sub">₹{p.cost} · {p.notes || 'Food & Dining'}</span>
                        </div>
                        <button
                          type="button"
                          className="btn small food-add-btn"
                          onClick={() => addSuggestedPlace(p, 'food')}
                        >
                          + Add
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Curated Top Chips */}
              <div className="suggestions-block" style={{ marginTop: 12 }}>
                <span className="suggestions-title">Popular Recommendations:</span>
                <div className="suggestion-chips-grid">
                  {suggestions.food.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="suggestion-chip food-chip"
                      onClick={() => addSuggestedPlace(p, 'food')}
                      title={p.notes}
                    >
                      <span className="chip-name">{p.name}</span>
                      <span className="chip-price">₹{p.cost}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Food Form */}
              <form
                onSubmit={(e) => handleAddCustom(e, 'food')}
                className="section-custom-form"
              >
                <input
                  placeholder="Or enter custom restaurant name..."
                  value={customForms.food.name}
                  onChange={(e) =>
                    setCustomForms(prev => ({
                      ...prev,
                      food: { ...prev.food, name: e.target.value },
                    }))
                  }
                  required
                />
                <input
                  type="number"
                  placeholder="Cost (₹)"
                  style={{ width: '105px' }}
                  value={customForms.food.cost}
                  onChange={(e) =>
                    setCustomForms(prev => ({
                      ...prev,
                      food: { ...prev.food, cost: e.target.value },
                    }))
                  }
                />
                <button type="submit" className="btn small">
                  + Add Food
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: THINGS TO DO */}
      {(activeTab === 'all' || activeTab === 'things_to_do') && (
        <div className="activity-section todo-section">
          <div className="activity-section-header">
            <div className="section-title">
              <span className="section-icon"><IconActivity size={16} /></span>
              <h4>Things to Do</h4>
              <span className="section-count-badge">{todoActivities.length}</span>
            </div>
            <button
              type="button"
              className="btn secondary small section-explore-btn"
              onClick={() => toggleSection('things_to_do')}
            >
              <IconSearch size={12} /> {openSection === 'things_to_do' ? 'Close' : 'Search & Add Activities'}
            </button>
          </div>

          {/* Added Todo Activities List */}
          {todoActivities.length > 0 ? (
            <ul className="categorized-activity-list">
              {todoActivities.map(a => (
                <li key={a.id} className="categorized-activity-item todo-item">
                  <div className="activity-info">
                    <span className="activity-name">{a.name}</span>
                    <div className="activity-subtext">
                      <span className="activity-meta-tag">₹{a.cost}</span>
                      {a.duration_hours > 0 && <span>· {a.duration_hours}h</span>}
                      {a.notes && <span className="activity-notes-text">· {a.notes}</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="activity-delete-btn"
                    title="Remove item"
                    onClick={() => removeActivity(a.id)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="section-empty-hint">No tours or experiences added yet.</p>
          )}

          {/* Expandable Todo Search & Suggestions */}
          {openSection === 'things_to_do' && (
            <div className="section-explore-drawer">
              {/* Search Bar for Things to Do */}
              <div className="place-search-bar-row">
                <input
                  className="place-search-input"
                  placeholder={`Search activities, tours, adventures in ${stop.city_name}...`}
                  value={searchQueries.things_to_do}
                  onChange={(e) => handleLiveSearchPlaces('things_to_do', e.target.value)}
                />
                {isSearching.things_to_do && <span className="search-status-text">Searching OpenStreetMap...</span>}
              </div>

              {/* Live Fetched Results */}
              {searchResults.things_to_do.length > 0 && (
                <div className="fetched-places-block">
                  <span className="suggestions-title">Discovered Activities in {stop.city_name}:</span>
                  <div className="fetched-places-list">
                    {searchResults.things_to_do.map((p, idx) => (
                      <div key={idx} className="fetched-place-row">
                        <div className="fetched-place-info">
                          <span className="fetched-place-name">{p.name}</span>
                          <span className="fetched-place-sub">₹{p.cost} · {p.notes || 'Activity & Experience'}</span>
                        </div>
                        <button
                          type="button"
                          className="btn small todo-add-btn"
                          onClick={() => addSuggestedPlace(p, 'things_to_do')}
                        >
                          + Add
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Curated Top Chips */}
              <div className="suggestions-block" style={{ marginTop: 12 }}>
                <span className="suggestions-title">Popular Recommendations:</span>
                <div className="suggestion-chips-grid">
                  {suggestions.things_to_do.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="suggestion-chip todo-chip"
                      onClick={() => addSuggestedPlace(p, 'things_to_do')}
                      title={p.notes}
                    >
                      <span className="chip-name">{p.name}</span>
                      <span className="chip-price">₹{p.cost}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Todo Form */}
              <form
                onSubmit={(e) => handleAddCustom(e, 'things_to_do')}
                className="section-custom-form"
              >
                <input
                  placeholder="Or enter custom activity / tour name..."
                  value={customForms.things_to_do.name}
                  onChange={(e) =>
                    setCustomForms(prev => ({
                      ...prev,
                      things_to_do: { ...prev.things_to_do, name: e.target.value },
                    }))
                  }
                  required
                />
                <input
                  type="number"
                  placeholder="Cost (₹)"
                  style={{ width: '105px' }}
                  value={customForms.things_to_do.cost}
                  onChange={(e) =>
                    setCustomForms(prev => ({
                      ...prev,
                      things_to_do: { ...prev.things_to_do, cost: e.target.value },
                    }))
                  }
                />
                <button type="submit" className="btn small">
                  + Add Activity
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: PLACES TO VISIT */}
      {(activeTab === 'all' || activeTab === 'places_to_visit') && (
        <div className="activity-section visit-section">
          <div className="activity-section-header">
            <div className="section-title">
              <span className="section-icon"><IconLandmark size={16} /></span>
              <h4>Places to Visit</h4>
              <span className="section-count-badge">{visitActivities.length}</span>
            </div>
            <button
              type="button"
              className="btn secondary small section-explore-btn"
              onClick={() => toggleSection('places_to_visit')}
            >
              <IconSearch size={12} /> {openSection === 'places_to_visit' ? 'Close' : 'Search & Add Places'}
            </button>
          </div>

          {/* Added Places to Visit List */}
          {visitActivities.length > 0 ? (
            <ul className="categorized-activity-list">
              {visitActivities.map(a => (
                <li key={a.id} className="categorized-activity-item visit-item">
                  <div className="activity-info">
                    <span className="activity-name">{a.name}</span>
                    <div className="activity-subtext">
                      <span className="activity-meta-tag">₹{a.cost}</span>
                      {a.duration_hours > 0 && <span>· {a.duration_hours}h</span>}
                      {a.notes && <span className="activity-notes-text">· {a.notes}</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="activity-delete-btn"
                    title="Remove item"
                    onClick={() => removeActivity(a.id)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="section-empty-hint">No landmarks or sights added yet.</p>
          )}

          {/* Expandable Visit Search & Suggestions */}
          {openSection === 'places_to_visit' && (
            <div className="section-explore-drawer">
              {/* Search Bar for Places to Visit */}
              <div className="place-search-bar-row">
                <input
                  className="place-search-input"
                  placeholder={`Search museums, monuments, palaces, viewpoints in ${stop.city_name}...`}
                  value={searchQueries.places_to_visit}
                  onChange={(e) => handleLiveSearchPlaces('places_to_visit', e.target.value)}
                />
                {isSearching.places_to_visit && <span className="search-status-text">Searching OpenStreetMap...</span>}
              </div>

              {/* Live Fetched Results */}
              {searchResults.places_to_visit.length > 0 && (
                <div className="fetched-places-block">
                  <span className="suggestions-title">Discovered Places in {stop.city_name}:</span>
                  <div className="fetched-places-list">
                    {searchResults.places_to_visit.map((p, idx) => (
                      <div key={idx} className="fetched-place-row">
                        <div className="fetched-place-info">
                          <span className="fetched-place-name">{p.name}</span>
                          <span className="fetched-place-sub">₹{p.cost} · {p.notes || 'Landmark & Sight'}</span>
                        </div>
                        <button
                          type="button"
                          className="btn small visit-add-btn"
                          onClick={() => addSuggestedPlace(p, 'places_to_visit')}
                        >
                          + Add
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Curated Top Chips */}
              <div className="suggestions-block" style={{ marginTop: 12 }}>
                <span className="suggestions-title">Popular Recommendations:</span>
                <div className="suggestion-chips-grid">
                  {suggestions.places_to_visit.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="suggestion-chip visit-chip"
                      onClick={() => addSuggestedPlace(p, 'places_to_visit')}
                      title={p.notes}
                    >
                      <span className="chip-name">{p.name}</span>
                      <span className="chip-price">₹{p.cost}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Visit Form */}
              <form
                onSubmit={(e) => handleAddCustom(e, 'places_to_visit')}
                className="section-custom-form"
              >
                <input
                  placeholder="Or enter custom monument / viewpoint..."
                  value={customForms.places_to_visit.name}
                  onChange={(e) =>
                    setCustomForms(prev => ({
                      ...prev,
                      places_to_visit: { ...prev.places_to_visit, name: e.target.value },
                    }))
                  }
                  required
                />
                <input
                  type="number"
                  placeholder="Cost (₹)"
                  style={{ width: '105px' }}
                  value={customForms.places_to_visit.cost}
                  onChange={(e) =>
                    setCustomForms(prev => ({
                      ...prev,
                      places_to_visit: { ...prev.places_to_visit, cost: e.target.value },
                    }))
                  }
                />
                <button type="submit" className="btn small">
                  + Add Place
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
