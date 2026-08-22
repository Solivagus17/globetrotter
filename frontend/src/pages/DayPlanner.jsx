import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'
import {
  IconCamera,
  IconBed,
  IconUtensils,
  IconPin,
  IconPlane,
  IconFileText,
  IconSearch,
  IconChevronDown,
  IconChevronUp,
  IconBookmark,
  IconTrash,
  IconStar,
  IconMap,
} from '../components/Icons'
import TripMap from '../components/TripMap'
import { getCategorizedPlaces } from '../osmService'

export default function DayPlanner() {
  const { tripId } = useParams()
  const [plannerData, setPlannerData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('itinerary')
  const [collapsedDays, setCollapsedDays] = useState(new Set())
  const [showMap, setShowMap] = useState(true)
  const [userSaves, setUserSaves] = useState([])
  const [forYouPlaces, setForYouPlaces] = useState([])
  const [editingCityForDate, setEditingCityForDate] = useState(null)
  const [cityInputVal, setCityInputVal] = useState('')
  const [dayCityMap, setDayCityMap] = useState({})
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [openDrawer, setOpenDrawer] = useState({})
  const [formInputs, setFormInputs] = useState({})
  const [daySearchQuery, setDaySearchQuery] = useState({})
  const [daySearchResults, setDaySearchResults] = useState({})
  const [isSearchingDay, setIsSearchingDay] = useState({})

  async function load() {
    try {
      const data = await api.getTripDays(tripId)
      setPlannerData(data)

      const saves = await api.listSaves()
      setUserSaves(saves || [])

      const storedCities = JSON.parse(localStorage.getItem(`trip_${tripId}_day_cities`) || '{}')
      setDayCityMap(storedCities)

      const destination = data.trip?.description || 'Paris'
      const curated = getCategorizedPlaces(destination)
      const combinedForYou = [
        ...(curated.places_to_visit || []).map(p => ({ ...p, category: 'sightseeing', city_name: destination })),
        ...(curated.food || []).map(p => ({ ...p, category: 'food', city_name: destination })),
        ...(curated.things_to_do || []).map(p => ({ ...p, category: 'adventure', city_name: destination })),
      ]
      setForYouPlaces(combinedForYou)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [tripId])

  function toggleCollapse(date) {
    setCollapsedDays(prev => {
      const next = new Set(prev)
      if (next.has(date)) next.delete(date)
      else next.add(date)
      return next
    })
  }

  function setDrawerForDay(date, type) {
    setOpenDrawer(prev => ({
      ...prev,
      [date]: prev[date] === type ? null : type,
    }))
  }

  function handleFormChange(date, field, value) {
    setFormInputs(prev => ({
      ...prev,
      [date]: {
        ...(prev[date] || {}),
        [field]: value,
      },
    }))
  }

  function handleSaveDayCity(date) {
    if (!cityInputVal.trim()) return
    const updated = { ...dayCityMap, [date]: cityInputVal.trim() }
    setDayCityMap(updated)
    localStorage.setItem(`trip_${tripId}_day_cities`, JSON.stringify(updated))
    setEditingCityForDate(null)
  }

  async function handleAddDayItem(e, date, category) {
    e.preventDefault()
    const input = formInputs[date] || {}
    if (!input.name && category !== 'photo') return

    const currentCity = dayCityMap[date] || (plannerData?.days?.find(d => d.date === date)?.city_name) || ''

    try {
      await api.addDayItem(tripId, date, {
        category,
        name: input.name || (category === 'photo' ? 'Trip Photo / Memory' : 'Scheduled Entry'),
        cost: Number(input.cost) || 0,
        notes: input.notes || '',
        photo_url: input.photo_url || '',
        location_name: input.location_name || currentCity,
      })

      setFormInputs(prev => ({ ...prev, [date]: {} }))
      setDrawerForDay(date, null)
      setSuccessMsg('Item added to schedule!')
      setTimeout(() => setSuccessMsg(''), 3000)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleAddFromSave(date, save) {
    try {
      await api.addDayItem(tripId, date, {
        category: save.category || 'place',
        name: save.name,
        cost: save.cost || 0,
        notes: save.description || save.address || '',
        photo_url: save.photo_url || '',
        location_name: save.city_name || '',
        source_save_id: save.id,
      })
      setSuccessMsg(`Added "${save.name}" to ${date}!`)
      setTimeout(() => setSuccessMsg(''), 3000)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleSearchDayPlaces(date, cityName, q) {
    setDaySearchQuery(prev => ({ ...prev, [date]: q }))
    setIsSearchingDay(prev => ({ ...prev, [date]: true }))
    const targetCity = dayCityMap[date] || cityName || 'Paris'
    try {
      const results = await api.discoverPlaces(targetCity, 'all', q)
      setDaySearchResults(prev => ({ ...prev, [date]: results || [] }))
    } catch (err) {
      console.error(err)
    } finally {
      setIsSearchingDay(prev => ({ ...prev, [date]: false }))
    }
  }

  async function handleDeleteDayItem(itemId) {
    try {
      await api.deleteDayItem(itemId)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <div className="page-loading">Loading planner...</div>
  if (!plannerData) return <div className="page-loading">Trip not found.</div>

  const trip = plannerData.trip || {}
  const days = plannerData.days || []

  // Extract map stops only when items exist
  const mapStops = []
  days.forEach((day, dIdx) => {
    const items = day.items || []
    if (items.length > 0) {
      const dayCity = dayCityMap[day.date] || day.city_name || ''
      mapStops.push({
        id: `day-${dIdx}`,
        city_name: `${day.formatted_date}${dayCity ? ': ' + dayCity : ''}`,
        country: `${items.length} ${items.length === 1 ? 'Place' : 'Places'}`,
        lat: 48.8566 + (dIdx * 0.03),
        lon: 2.3522 + (dIdx * 0.03),
        activities: items.map(item => ({ category: item.category, name: item.name, cost: item.cost })),
      })
    }
  })

  const totalCost = days.reduce((sum, d) => {
    return sum + (d.items || []).reduce((s, it) => s + (parseFloat(it.cost) || 0), 0)
  }, 0)

  return (
    <div className="page day-planner-page">
      {/* Clean Top Header */}
      <div className="planner-header-row reveal">
        <div className="planner-header-info">
          <h2>{trip.name}</h2>
          <p className="muted">
            {trip.start_date ? `${trip.start_date} → ${trip.end_date || ''} · ` : ''}
            {days.length} {days.length === 1 ? 'Day' : 'Days'} · Est. Budget: <strong>₹{Math.round(totalCost).toLocaleString('en-IN')}</strong>
          </p>
        </div>
        <div className="header-actions">
          {mapStops.length > 0 && (
            <button
              type="button"
              className={`btn small ${showMap ? 'active' : 'secondary'}`}
              onClick={() => setShowMap(!showMap)}
            >
              <IconMap size={14} /> {showMap ? 'Hide Map' : 'Show Map'}
            </button>
          )}
          <Link to={`/trips/${tripId}/view`} className="btn secondary small">Timeline View</Link>
          <Link to={`/trips/${tripId}/budget`} className="btn secondary small">Budget (₹)</Link>
          <Link to={`/trips/${tripId}/edit`} className="btn secondary small">Edit Trip</Link>
        </div>
      </div>

      {/* Map View */}
      {showMap && mapStops.length > 0 && (
        <div className="builder-map-container reveal reveal-d1" style={{ marginBottom: 28 }}>
          <TripMap stops={mapStops} height="280px" />
        </div>
      )}

      {successMsg && (
        <div className="profile-alert-success reveal">
          <span>✓ {successMsg}</span>
        </div>
      )}

      {error && (
        <div className="profile-alert-error reveal">
          <span>{error}</span>
        </div>
      )}

      {/* Clean Top Tabs */}
      <div className="planner-top-tabs reveal reveal-d1">
        <button
          type="button"
          className={`planner-tab-btn ${activeTab === 'itinerary' ? 'active' : ''}`}
          onClick={() => setActiveTab('itinerary')}
        >
          <IconMap size={15} /> Itinerary
        </button>
        <button
          type="button"
          className={`planner-tab-btn ${activeTab === 'saves' ? 'active' : ''}`}
          onClick={() => setActiveTab('saves')}
        >
          <IconBookmark size={15} /> Saves ({userSaves.length})
        </button>
        <button
          type="button"
          className={`planner-tab-btn ${activeTab === 'for_you' ? 'active' : ''}`}
          onClick={() => setActiveTab('for_you')}
        >
          <IconStar size={15} /> For You
        </button>
      </div>

      {/* TAB 1: ITINERARY */}
      {activeTab === 'itinerary' && (
        <div className="day-sections-list">
          {days.map((day, i) => {
            const isCollapsed = collapsedDays.has(day.date)
            const currentDrawer = openDrawer[day.date]
            const items = day.items || []
            const currentForm = formInputs[day.date] || {}
            const searchRes = daySearchResults[day.date] || []
            const currentCity = dayCityMap[day.date] || day.city_name || 'Set City'

            return (
              <div key={day.date} className="day-section-card reveal" style={{ animationDelay: `${0.04 * (i + 1)}s` }}>
                {/* Day Header */}
                <div className="day-header-row" onClick={() => toggleCollapse(day.date)}>
                  <div className="day-header-left">
                    <span className="day-number-badge">Day {day.day_number}</span>
                    <h3 className="day-title-text">{day.formatted_date}</h3>

                    {editingCityForDate === day.date ? (
                      <div className="day-city-edit-box" onClick={e => e.stopPropagation()}>
                        <input
                          value={cityInputVal}
                          onChange={e => setCityInputVal(e.target.value)}
                          placeholder="e.g. Paris, France"
                          autoFocus
                        />
                        <button
                          type="button"
                          className="btn small"
                          onClick={() => handleSaveDayCity(day.date)}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="link-btn"
                          onClick={() => setEditingCityForDate(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <span
                        className="day-city-link"
                        title="Click to set city for this day"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingCityForDate(day.date)
                          setCityInputVal(currentCity === 'Set City' ? '' : currentCity)
                        }}
                      >
                        <IconPin size={12} /> {currentCity}
                      </span>
                    )}
                  </div>

                  <div className="day-header-right">
                    <span className="day-items-count muted">{items.length} {items.length === 1 ? 'place' : 'places'}</span>
                    <button type="button" className="day-collapse-btn">
                      {isCollapsed ? <IconChevronDown size={18} /> : <IconChevronUp size={18} />}
                    </button>
                  </div>
                </div>

                {/* Day Content Timeline */}
                {!isCollapsed && (
                  <div className="day-timeline-body">
                    <div className="day-vertical-line"></div>

                    {items.map((item, idx) => (
                      <div key={item.id || idx} className="day-timeline-node">
                        <div className="day-node-bullet">
                          {item.category === 'food' ? <IconUtensils size={13} /> :
                           item.category === 'stay' ? <IconBed size={13} /> :
                           item.category === 'photo' ? <IconCamera size={13} /> :
                           item.category === 'flight' ? <IconPlane size={13} /> :
                           item.category === 'note' ? <IconFileText size={13} /> :
                           <IconPin size={13} />}
                        </div>

                        <div className="day-item-card">
                          <div className="day-item-header">
                            <div>
                              <span className="day-item-category-tag">{item.category}</span>
                              <h4 className="day-item-name">{item.name}</h4>
                            </div>
                            <div className="day-item-meta">
                              {item.cost > 0 && <span className="day-item-cost">₹{item.cost}</span>}
                              <button
                                type="button"
                                className="day-item-delete-btn"
                                title="Remove item"
                                onClick={() => handleDeleteDayItem(item.id)}
                              >
                                <IconTrash size={14} />
                              </button>
                            </div>
                          </div>
                          {item.notes && <p className="day-item-notes">{item.notes}</p>}
                          {item.photo_url && (
                            <div className="day-item-photo">
                              <img src={item.photo_url} alt={item.name} />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Empty Day State */}
                    {items.length === 0 && !currentDrawer && (
                      <div className="day-timeline-node">
                        <div className="day-node-bullet empty">+</div>
                        <div className="day-empty-dashed-card">
                          <p>Build your day by adding places, dining, stays, or notes.</p>
                        </div>
                      </div>
                    )}

                    {/* Quick Add Bar */}
                    <div className="quick-add-section">
                      <div className="quick-add-circle-row">
                        <button
                          type="button"
                          className={`quick-add-circle-btn ${currentDrawer === 'place' ? 'active' : ''}`}
                          title="Add Attraction / Sight"
                          onClick={() => setDrawerForDay(day.date, 'place')}
                        >
                          <IconPin size={16} />
                          <span className="circle-label">Place</span>
                        </button>
                        <button
                          type="button"
                          className={`quick-add-circle-btn ${currentDrawer === 'food' ? 'active' : ''}`}
                          title="Add Food & Drink"
                          onClick={() => setDrawerForDay(day.date, 'food')}
                        >
                          <IconUtensils size={16} />
                          <span className="circle-label">Food</span>
                        </button>
                        <button
                          type="button"
                          className={`quick-add-circle-btn ${currentDrawer === 'stay' ? 'active' : ''}`}
                          title="Add Hotel / Stay"
                          onClick={() => setDrawerForDay(day.date, 'stay')}
                        >
                          <IconBed size={16} />
                          <span className="circle-label">Stay</span>
                        </button>
                        <button
                          type="button"
                          className={`quick-add-circle-btn ${currentDrawer === 'flight' ? 'active' : ''}`}
                          title="Add Flight / Transport"
                          onClick={() => setDrawerForDay(day.date, 'flight')}
                        >
                          <IconPlane size={16} />
                          <span className="circle-label">Flight</span>
                        </button>
                        <button
                          type="button"
                          className={`quick-add-circle-btn ${currentDrawer === 'photo' ? 'active' : ''}`}
                          title="Attach Photo Memory"
                          onClick={() => setDrawerForDay(day.date, 'photo')}
                        >
                          <IconCamera size={16} />
                          <span className="circle-label">Photo</span>
                        </button>
                        <button
                          type="button"
                          className={`quick-add-circle-btn ${currentDrawer === 'note' ? 'active' : ''}`}
                          title="Add Note"
                          onClick={() => setDrawerForDay(day.date, 'note')}
                        >
                          <IconFileText size={16} />
                          <span className="circle-label">Note</span>
                        </button>
                        <button
                          type="button"
                          className={`quick-add-circle-btn ${currentDrawer === 'search' ? 'active' : ''}`}
                          title="Search Places in City"
                          onClick={() => {
                            setDrawerForDay(day.date, 'search')
                            if (searchRes.length === 0) {
                              handleSearchDayPlaces(day.date, currentCity, '')
                            }
                          }}
                        >
                          <IconSearch size={16} />
                          <span className="circle-label">Search</span>
                        </button>
                      </div>

                      {/* Inline Form Drawer */}
                      {currentDrawer && currentDrawer !== 'search' && (
                        <form
                          onSubmit={(e) => handleAddDayItem(e, day.date, currentDrawer)}
                          className="day-inline-form-drawer"
                        >
                          <div className="drawer-header">
                            <h4>Add {currentDrawer.toUpperCase()} to {day.formatted_date}</h4>
                            <button
                              type="button"
                              className="link-btn"
                              onClick={() => setDrawerForDay(day.date, null)}
                            >
                              ✕ Close
                            </button>
                          </div>

                          <div className="row">
                            <label style={{ flex: 2 }}>Name / Title
                              <input
                                placeholder={
                                  currentDrawer === 'stay' ? 'e.g. Grand Boutique Hotel' :
                                  currentDrawer === 'food' ? 'e.g. Le Jules Verne Bistro' :
                                  currentDrawer === 'flight' ? 'e.g. Flight AF 1420 to Paris' :
                                  currentDrawer === 'photo' ? 'e.g. Sunset at the Tower' :
                                  'e.g. Louvre Museum Visit'
                                }
                                value={currentForm.name || ''}
                                onChange={e => handleFormChange(day.date, 'name', e.target.value)}
                                required={currentDrawer !== 'photo'}
                              />
                            </label>

                            {currentDrawer !== 'note' && (
                              <label style={{ flex: 1 }}>Cost (₹)
                                <input
                                  type="number"
                                  placeholder="0"
                                  value={currentForm.cost || ''}
                                  onChange={e => handleFormChange(day.date, 'cost', e.target.value)}
                                />
                              </label>
                            )}
                          </div>

                          {currentDrawer === 'photo' && (
                            <label>Photo URL
                              <input
                                placeholder="https://images.unsplash.com/..."
                                value={currentForm.photo_url || ''}
                                onChange={e => handleFormChange(day.date, 'photo_url', e.target.value)}
                              />
                            </label>
                          )}

                          <label>Notes / Booking Info
                            <textarea
                              rows={2}
                              placeholder="Check-in time, reservation confirmation, address, or travel tip..."
                              value={currentForm.notes || ''}
                              onChange={e => handleFormChange(day.date, 'notes', e.target.value)}
                            />
                          </label>

                          <div className="drawer-actions">
                            <button type="submit" className="btn small">
                              + Add to Schedule
                            </button>
                            <button
                              type="button"
                              className="btn secondary small"
                              onClick={() => setDrawerForDay(day.date, null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      )}

                      {/* Inline Search Drawer */}
                      {currentDrawer === 'search' && (
                        <div className="day-inline-form-drawer">
                          <div className="drawer-header">
                            <h4>Discover & Add Places in {currentCity}</h4>
                            <button
                              type="button"
                              className="link-btn"
                              onClick={() => setDrawerForDay(day.date, null)}
                            >
                              ✕ Close
                            </button>
                          </div>

                          <div className="place-search-bar-row">
                            <input
                              className="place-search-input"
                              placeholder={`Search real spots in ${currentCity}...`}
                              value={daySearchQuery[day.date] || ''}
                              onChange={e => handleSearchDayPlaces(day.date, currentCity, e.target.value)}
                            />
                            {isSearchingDay[day.date] && <span className="search-status-text">Searching...</span>}
                          </div>

                          <div className="day-search-results-list">
                            {searchRes.slice(0, 6).map((p, idx) => (
                              <div key={idx} className="day-search-res-item">
                                <div className="res-info">
                                  <strong>{p.name}</strong>
                                  <span className="muted">{p.category} · ₹{p.cost} · {p.address}</span>
                                </div>
                                <button
                                  type="button"
                                  className="btn small"
                                  onClick={() => handleAddFromSave(day.date, p)}
                                >
                                  + Add
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* TAB 2: SAVES */}
      {activeTab === 'saves' && (
        <div className="planner-saves-tab reveal">
          <div className="row-between" style={{ marginBottom: 20 }}>
            <div>
              <h3>My Saved Places</h3>
              <p className="muted">Your saved attractions and dining spots. Schedule any item to a day.</p>
            </div>
            <Link to="/discover" className="btn secondary small">Explore Discover</Link>
          </div>

          {userSaves.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon-wrap">
                <IconBookmark size={30} />
              </div>
              <h3>No saved places yet</h3>
              <p className="muted">Browse the Discover page to save attractions, restaurants, and stays.</p>
              <Link to="/discover" className="btn">Discover Places</Link>
            </div>
          ) : (
            <div className="saves-grid">
              {userSaves.map((save) => (
                <div key={save.id} className="save-card">
                  {save.photo_url && (
                    <div className="save-card-img">
                      <img src={save.photo_url} alt={save.name} />
                      <span className="save-category-badge">{save.category}</span>
                    </div>
                  )}
                  <div className="save-card-body">
                    <h4>{save.name}</h4>
                    {save.city_name && <span className="save-city-text"><IconPin size={11} /> {save.city_name}</span>}
                    {save.cost > 0 && <span className="save-cost-text">₹{save.cost}</span>}
                    {save.description && <p className="save-desc">{save.description}</p>}

                    <div className="save-card-footer">
                      <span className="field-label" style={{ marginBottom: 0, fontSize: '11px' }}>Add to day:</span>
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddFromSave(e.target.value, save)
                            e.target.value = ''
                          }
                        }}
                        defaultValue=""
                        className="save-day-select"
                      >
                        <option value="" disabled>Select day...</option>
                        {days.map(d => (
                          <option key={d.date} value={d.date}>{d.formatted_date} ({dayCityMap[d.date] || d.city_name || 'Day'})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: FOR YOU */}
      {activeTab === 'for_you' && (
        <div className="planner-foryou-tab reveal">
          <div className="row-between" style={{ marginBottom: 20 }}>
            <div>
              <h3>Recommended Highlights</h3>
              <p className="muted">Hand-picked top attractions and dining tailored for your trip.</p>
            </div>
          </div>

          <div className="saves-grid">
            {forYouPlaces.map((place, idx) => (
              <div key={idx} className="save-card">
                <div className="save-card-body">
                  <span className="save-category-badge" style={{ marginBottom: 8 }}>{place.category}</span>
                  <h4>{place.name}</h4>
                  <span className="save-city-text"><IconPin size={11} /> {place.city_name}</span>
                  <span className="save-cost-text">₹{place.cost} · {place.duration_hours}h</span>
                  <p className="save-desc">{place.notes}</p>

                  <div className="save-card-footer">
                    <span className="field-label" style={{ marginBottom: 0, fontSize: '11px' }}>Schedule to:</span>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddFromSave(e.target.value, place)
                          e.target.value = ''
                        }
                      }}
                      defaultValue=""
                      className="save-day-select"
                    >
                      <option value="" disabled>Pick a day...</option>
                      {days.map(d => (
                        <option key={d.date} value={d.date}>{d.formatted_date}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
