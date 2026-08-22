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
  IconPlus,
  IconDownload,
  IconCalendar,
} from '../components/Icons'
import TripMap from '../components/TripMap'
import { getCategorizedPlaces, geocodeCity } from '../osmService'
import { generateItineraryPDF } from '../pdfService'

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

  // Inline Quick Add & Edit states
  const [openDrawer, setOpenDrawer] = useState({})
  const [formInputs, setFormInputs] = useState({})
  const [daySearchQuery, setDaySearchQuery] = useState({})
  const [daySearchResults, setDaySearchResults] = useState({})
  const [isSearchingDay, setIsSearchingDay] = useState({})
  const [editingItem, setEditingItem] = useState(null)

  // Real-time resolved map waypoints
  const [resolvedMapStops, setResolvedMapStops] = useState([])

  async function load() {
    try {
      const data = await api.getTripDays(tripId)
      setPlannerData(data)

      const saves = await api.listSaves()
      setUserSaves(saves || [])

      const storedCities = JSON.parse(localStorage.getItem(`trip_${tripId}_day_cities`) || '{}')
      setDayCityMap(storedCities)

      const destination = data.trip?.description || data.trip?.name?.replace(/^(trip to|vacation in|tour of|visit|exploring|holiday in)\s+/i, '').trim() || data.stops?.[0]?.city_name || ''
      try {
        const livePlaces = await api.discoverPlaces(destination || 'Ahmedabad', 'all')
        if (livePlaces && livePlaces.length > 0) {
          setForYouPlaces(livePlaces)
        } else {
          const curated = getCategorizedPlaces(destination)
          const combinedForYou = [
            ...(curated.places_to_visit || []).map(p => ({ ...p, category: 'sightseeing', city_name: destination })),
            ...(curated.food || []).map(p => ({ ...p, category: 'food', city_name: destination })),
            ...(curated.things_to_do || []).map(p => ({ ...p, category: 'adventure', city_name: destination })),
          ]
          setForYouPlaces(combinedForYou)
        }
      } catch (errDis) {
        const curated = getCategorizedPlaces(destination)
        const combinedForYou = [
          ...(curated.places_to_visit || []).map(p => ({ ...p, category: 'sightseeing', city_name: destination })),
          ...(curated.food || []).map(p => ({ ...p, category: 'food', city_name: destination })),
          ...(curated.things_to_do || []).map(p => ({ ...p, category: 'adventure', city_name: destination })),
        ]
        setForYouPlaces(combinedForYou)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [tripId])

  // Re-calculate real-time map waypoints whenever days or city locations change
  useEffect(() => {
    if (!plannerData || !plannerData.days) return

    let isMounted = true
    async function computeRealtimeStops() {
      const days = plannerData.days || []
      const defaultDest = plannerData.trip?.description || plannerData.trip?.name?.replace(/^(trip to|vacation in|tour of|visit|exploring|holiday in)\s+/i, '').trim() || ''
      const stops = []

      for (let dIdx = 0; dIdx < days.length; dIdx++) {
        const day = days[dIdx]
        const items = day.items || []
        if (items.length > 0) {
          const dayCity = dayCityMap[day.date] || day.city_name || defaultDest
          const geo = dayCity ? await geocodeCity(dayCity) : null
          const lat = geo ? geo.lat : (20.5937 + (dIdx * 0.02))
          const lon = geo ? geo.lon : (78.9629 + (dIdx * 0.02))

          stops.push({
            id: `day-${dIdx}`,
            city_name: `${day.formatted_date}${dayCity ? ': ' + dayCity : ''}`,
            country: `${items.length} ${items.length === 1 ? 'Place' : 'Places'} Planned`,
            lat,
            lon,
            activities: items.map(item => ({ category: item.category, name: item.name, cost: item.cost })),
          })
        }
      }

      if (isMounted) {
        setResolvedMapStops(stops)
      }
    }

    computeRealtimeStops()
    return () => { isMounted = false }
  }, [plannerData, dayCityMap])

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

  async function handleSaveDayCity(date) {
    if (!cityInputVal.trim()) return
    const updated = { ...dayCityMap, [date]: cityInputVal.trim() }
    setDayCityMap(updated)
    localStorage.setItem(`trip_${tripId}_day_cities`, JSON.stringify(updated))
    setEditingCityForDate(null)

    // Trigger immediate map re-center
    const geo = await geocodeCity(cityInputVal.trim())
    if (geo) {
      setResolvedMapStops(prev => prev.map(s => s.id.includes(date) ? { ...s, lat: geo.lat, lon: geo.lon } : s))
    }
  }

function parseFlightInfo(item) {
  if (item.category !== 'flight') return null
  try {
    const data = JSON.parse(item.notes)
    if (data && typeof data === 'object' && (data.flight_no || data.dep_city || data.status)) {
      return data
    }
  } catch (e) {}

  const notes = item.notes || ''
  const isBooked = notes.toLowerCase().includes('status: booked') || notes.toLowerCase().includes('confirmed') || notes.toLowerCase().includes('status: confirmed')
  const pnrMatch = notes.match(/pnr:\s*([A-Z0-9]+)/i)
  const depMatch = notes.match(/dep:\s*([0-9:]+\s*(?:am|pm)?)/i)
  const arrMatch = notes.match(/arr:\s*([0-9:]+\s*(?:am|pm)?)/i)

  return {
    flight_no: item.name.split(':')[0] || item.name,
    dep_city: '',
    arr_city: '',
    dep_time: depMatch ? depMatch[1] : '',
    arr_time: arrMatch ? arrMatch[1] : '',
    status: isBooked ? 'Booked' : 'Not Booked',
    pnr: pnrMatch ? pnrMatch[1] : '',
    extra_notes: notes,
  }
}

  async function handleAddDayItem(e, date, category) {
    e.preventDefault()
    const input = formInputs[date] || {}
    if (!input.name && !input.flight_no && category !== 'photo') return

    const currentCity = dayCityMap[date] || (plannerData?.days?.find(d => d.date === date)?.city_name) || ''

    let finalName = input.name || ''
    let finalNotes = input.notes || ''

    if (category === 'flight') {
      const flightNo = (input.flight_no || input.name || 'Flight').trim()
      const depCity = (input.dep_city || 'Origin').trim()
      const arrCity = (input.arr_city || currentCity || 'Destination').trim()
      finalName = `${flightNo}: ${depCity} → ${arrCity}`

      finalNotes = JSON.stringify({
        flight_no: flightNo,
        dep_city: depCity,
        arr_city: arrCity,
        dep_time: input.dep_time || '',
        arr_time: input.arr_time || '',
        status: input.booking_status || 'Booked',
        pnr: input.pnr || '',
        extra_notes: input.notes || '',
      })
    }

    try {
      const newItem = await api.addDayItem(tripId, date, {
        category,
        name: finalName || (category === 'photo' ? 'Trip Photo / Memory' : 'Scheduled Entry'),
        cost: Number(input.cost) || 0,
        notes: finalNotes,
        photo_url: input.photo_url || '',
        location_name: input.location_name || currentCity,
      })

      // Optimistic UI update in state
      setPlannerData(prev => {
        if (!prev) return prev
        const nextDays = (prev.days || []).map(d => {
          if (d.date === date) {
            return { ...d, items: [...(d.items || []), newItem] }
          }
          return d
        })
        return { ...prev, days: nextDays }
      })

      setFormInputs(prev => ({ ...prev, [date]: {} }))
      setDrawerForDay(date, null)
      setSuccessMsg('Place added to schedule!')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleAddFromSave(date, save) {
    try {
      const newItem = await api.addDayItem(tripId, date, {
        category: save.category || 'place',
        name: save.name,
        cost: save.cost || 0,
        notes: save.description || save.address || '',
        photo_url: save.photo_url || '',
        location_name: save.city_name || '',
        source_save_id: save.id,
      })

      // Optimistic UI update in state
      setPlannerData(prev => {
        if (!prev) return prev
        const nextDays = (prev.days || []).map(d => {
          if (d.date === date) {
            return { ...d, items: [...(d.items || []), newItem] }
          }
          return d
        })
        return { ...prev, days: nextDays }
      })

      setSuccessMsg(`Added "${save.name}" to ${date}!`)
      setTimeout(() => setSuccessMsg(''), 3000)
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

  async function handleDeleteDayItem(itemId, date) {
    // Instant optimistic removal from UI
    setPlannerData(prev => {
      if (!prev) return prev
      const nextDays = (prev.days || []).map(d => ({
        ...d,
        items: (d.items || []).filter(it => it.id !== itemId),
      }))
      return { ...prev, days: nextDays }
    })

    try {
      await api.deleteDayItem(itemId)
      setSuccessMsg('Item removed from itinerary.')
      setTimeout(() => setSuccessMsg(''), 2500)
    } catch (err) {
      console.warn('Backend delete error, reloading:', err)
      load()
    }
  }

  async function handleRemoveDay(dateToRemove) {
    if (!window.confirm(`Remove this day (${dateToRemove}) from the itinerary?`)) {
      return
    }

    const days = plannerData.days || []
    if (days.length <= 1) {
      setError('An itinerary must have at least 1 day.')
      setTimeout(() => setError(''), 3000)
      return
    }

    // Clean up items for that day in parallel
    const targetDay = days.find(d => d.date === dateToRemove)
    if (targetDay && targetDay.items) {
      for (const it of targetDay.items) {
        api.deleteDayItem(it.id).catch(() => {})
      }
    }

    const remainingDays = days.filter(d => d.date !== dateToRemove)
    const newStartDate = remainingDays[0]?.date || trip.start_date
    const newEndDate = remainingDays[remainingDays.length - 1]?.date || trip.end_date

    try {
      await api.updateTrip(tripId, { start_date: newStartDate, end_date: newEndDate })
      const reindexed = remainingDays.map((d, idx) => ({ ...d, day_number: idx + 1 }))
      setPlannerData(prev => ({
        ...prev,
        trip: { ...prev.trip, start_date: newStartDate, end_date: newEndDate },
        days: reindexed,
      }))
      setSuccessMsg('Day removed from itinerary.')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleAddDay() {
    const days = plannerData.days || []
    let nextDateStr = ''
    if (days.length > 0) {
      const lastDate = new Date(days[days.length - 1].date)
      lastDate.setDate(lastDate.getDate() + 1)
      nextDateStr = lastDate.toISOString().split('T')[0]
    } else {
      nextDateStr = new Date().toISOString().split('T')[0]
    }

    const newStartDate = trip.start_date || days[0]?.date || nextDateStr
    try {
      await api.updateTrip(tripId, { start_date: newStartDate, end_date: nextDateStr })
      await load()
      setSuccessMsg('Added next day to itinerary!')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      setError(err.message)
    }
  }

  function handleExportPDF() {
    if (!plannerData || !plannerData.days) return
    try {
      generateItineraryPDF(plannerData.trip || {}, plannerData.days || [], dayCityMap)
      setSuccessMsg('Itinerary PDF generated and downloaded!')
      setTimeout(() => setSuccessMsg(''), 3500)
    } catch (err) {
      console.error('PDF export error:', err)
      setError('Failed to generate PDF. Falling back to print.')
      window.print()
    }
  }

  async function handleUpdateDayItemSubmit(e) {
    e.preventDefault()
    if (!editingItem) return

    try {
      await api.updateDayItem(editingItem.id, {
        name: editingItem.name,
        cost: Number(editingItem.cost) || 0,
        notes: editingItem.notes || '',
        category: editingItem.category,
      })

      // Update in state
      setPlannerData(prev => {
        if (!prev) return prev
        const nextDays = (prev.days || []).map(d => ({
          ...d,
          items: (d.items || []).map(it => it.id === editingItem.id ? { ...it, ...editingItem } : it),
        }))
        return { ...prev, days: nextDays }
      })

      setEditingItem(null)
      setSuccessMsg('Updated item details!')
      setTimeout(() => setSuccessMsg(''), 2500)
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <div className="page-loading">Loading planner...</div>
  if (!plannerData) {
    return (
      <div className="page" style={{ padding: '40px 20px', textAlign: 'center' }}>
        <h3>Trip Not Found</h3>
        <p className="muted" style={{ margin: '12px 0 24px' }}>{error || 'Unable to load the requested trip itinerary.'}</p>
        <Link to="/" className="btn">Return to Dashboard</Link>
      </div>
    )
  }

  const trip = plannerData.trip || {}
  const days = plannerData.days || []

  const totalCost = days.reduce((sum, d) => {
    return sum + (d.items || []).reduce((s, it) => s + (parseFloat(it.cost) || 0), 0)
  }, 0)

  // Calendar State & Month navigation
  const [calendarDate, setCalendarDate] = useState(() => {
    if (days[0]?.date) return new Date(days[0].date)
    return new Date()
  })

  function handlePrevMonth() {
    setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  function handleNextMonth() {
    setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  function renderCalendarCells() {
    const year = calendarDate.getFullYear()
    const month = calendarDate.getMonth()

    const firstDayIndex = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const daysMapByDate = {}
    ;(days || []).forEach(d => {
      daysMapByDate[d.date] = d
    })

    const cells = []

    // Padding for days before start of month
    for (let p = 0; p < firstDayIndex; p++) {
      cells.push(<div key={`pad-${p}`} className="calendar-day-cell other-month"></div>)
    }

    // Days in current month
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
      const matchedTripDay = daysMapByDate[dateStr]
      const items = matchedTripDay?.items || []
      const city = matchedTripDay ? (dayCityMap[dateStr] || matchedTripDay.city_name || 'Day') : ''

      cells.push(
        <div
          key={dateStr}
          className={`calendar-day-cell ${matchedTripDay ? 'trip-day' : ''}`}
          onClick={() => {
            if (matchedTripDay) {
              setActiveTab('itinerary')
              setCollapsedDays(prev => {
                const next = new Set(prev)
                next.delete(dateStr)
                return next
              })
            }
          }}
          title={matchedTripDay ? `Click to open Day ${matchedTripDay.day_number} in Itinerary` : ''}
        >
          <div className="calendar-cell-top">
            <span className="calendar-date-number">{dayNum}</span>
            {matchedTripDay && (
              <span className="calendar-day-badge">Day {matchedTripDay.day_number}</span>
            )}
          </div>

          {matchedTripDay && (
            <>
              {city && (
                <span className="calendar-city-tag">
                  <IconPin size={10} /> {city}
                </span>
              )}

              <div className="calendar-items-list">
                {items.map((it, itIdx) => (
                  <div key={it.id || itIdx} className={`calendar-mini-pill ${it.category || 'place'}`} title={`${it.name} (₹${it.cost || 0})`}>
                    <span>{it.name}</span>
                  </div>
                ))}
                {items.length === 0 && (
                  <span className="muted" style={{ fontSize: '10px', fontStyle: 'italic' }}>No activities</span>
                )}
              </div>
            </>
          )}
        </div>
      )
    }

    return cells
  }

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
          <button
            type="button"
            className="btn secondary small"
            onClick={handleExportPDF}
            title="Export full itinerary to clean printable PDF"
          >
            <IconDownload size={14} /> Export PDF
          </button>
          {resolvedMapStops.length > 0 && (
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

      {/* Real-Time Interactive Map View */}
      {showMap && resolvedMapStops.length > 0 && (
        <div className="builder-map-container reveal reveal-d1" style={{ marginBottom: 28 }}>
          <TripMap stops={resolvedMapStops} height="280px" />
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
          className={`planner-tab-btn ${activeTab === 'calendar' ? 'active' : ''}`}
          onClick={() => setActiveTab('calendar')}
        >
          <IconCalendar size={15} /> Calendar View
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
                        title="Click to set city for this day and update map in real-time"
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
                    {days.length > 1 && (
                      <button
                        type="button"
                        className="day-remove-btn"
                        title={`Remove Day ${day.day_number} (${day.formatted_date})`}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveDay(day.date)
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--muted)',
                          fontSize: '12px',
                          cursor: 'pointer',
                          padding: '4px 8px',
                          borderRadius: '6px',
                        }}
                      >
                        Remove Day
                      </button>
                    )}
                    <button type="button" className="day-collapse-btn">
                      {isCollapsed ? <IconChevronDown size={18} /> : <IconChevronUp size={18} />}
                    </button>
                  </div>
                </div>

                {/* Day Content Timeline */}
                {!isCollapsed && (
                  <div className="day-timeline-body">
                    <div className="day-vertical-line"></div>

                    {items.map((item, idx) => {
                      const flight = parseFlightInfo(item)
                      const isFlight = item.category === 'flight'

                      return (
                        <div key={item.id || idx} className="day-timeline-node">
                          <div className="day-node-bullet">
                            {item.category === 'food' ? <IconUtensils size={13} /> :
                             item.category === 'stay' ? <IconBed size={13} /> :
                             item.category === 'photo' ? <IconCamera size={13} /> :
                             item.category === 'flight' ? <IconPlane size={13} /> :
                             item.category === 'note' ? <IconFileText size={13} /> :
                             <IconPin size={13} />}
                          </div>

                          {isFlight ? (
                            <div className="day-item-card flight-ticket-card">
                              <div className="day-item-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <span className="day-item-category-tag" style={{ background: '#2563eb', color: '#fff' }}>FLIGHT</span>
                                  <h4 className="day-item-name" style={{ margin: 0 }}>{flight.flight_no || item.name}</h4>
                                  <span className={`flight-status-badge ${flight.status === 'Booked' ? 'booked' : 'unbooked'}`}>
                                    {flight.status === 'Booked' ? '✓ Booked / Confirmed' : 'Planning / Not Booked'}
                                  </span>
                                </div>
                                <div className="day-item-meta">
                                  {item.cost > 0 && <span className="day-item-cost">₹{item.cost}</span>}
                                  <button
                                    type="button"
                                    className="day-item-delete-btn"
                                    title="Edit flight"
                                    onClick={() => setEditingItem({ ...item, dayDate: day.date })}
                                    style={{ color: 'var(--muted)', fontSize: '13px' }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    className="day-item-delete-btn"
                                    title="Remove flight"
                                    onClick={() => handleDeleteDayItem(item.id, day.date)}
                                  >
                                    <IconTrash size={14} />
                                  </button>
                                </div>
                              </div>

                              {/* Flight Route Details */}
                              <div className="flight-route-row">
                                <div className="flight-point">
                                  <span className="time">{flight.dep_time || 'Dep Time'}</span>
                                  <span className="city">{flight.dep_city || 'Origin'}</span>
                                </div>
                                <div className="flight-arrow-sep">
                                  <span className="flight-arrow-line"></span>
                                  <IconPlane size={14} />
                                  <span className="flight-arrow-line"></span>
                                </div>
                                <div className="flight-point" style={{ textAlign: 'right' }}>
                                  <span className="time">{flight.arr_time || 'Arr Time'}</span>
                                  <span className="city">{flight.arr_city || 'Destination'}</span>
                                </div>
                              </div>

                              {/* Flight PNR & Extra Notes */}
                              <div className="flight-meta-row">
                                {flight.pnr && (
                                  <span>PNR: <strong className="flight-pnr-pill">{flight.pnr}</strong></span>
                                )}
                                {flight.extra_notes && (
                                  <span>· {flight.extra_notes}</span>
                                )}
                              </div>
                            </div>
                          ) : (
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
                                    title="Edit item"
                                    onClick={() => setEditingItem({ ...item, dayDate: day.date })}
                                    style={{ color: 'var(--muted)', fontSize: '13px' }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    className="day-item-delete-btn"
                                    title="Remove item"
                                    onClick={() => handleDeleteDayItem(item.id, day.date)}
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
                          )}
                        </div>
                      )
                    })}

                    {/* Empty Day State */}
                    {items.length === 0 && !currentDrawer && (
                      <div className="day-timeline-node">
                        <div className="day-node-bullet empty">+</div>
                        <div className="day-empty-dashed-card">
                          <p>Build your day by adding places, dining, stays, flights, or notes.</p>
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

                          {currentDrawer === 'flight' ? (
                            <>
                              <div className="row">
                                <label style={{ flex: 2 }}>Airline & Flight No.
                                  <input
                                    placeholder="e.g. Air India AI-102 or IndiGo 6E-205"
                                    value={currentForm.flight_no || ''}
                                    onChange={e => handleFormChange(day.date, 'flight_no', e.target.value)}
                                    required
                                  />
                                </label>
                                <label style={{ flex: 1 }}>Booking Status
                                  <select
                                    value={currentForm.booking_status || 'Booked'}
                                    onChange={e => handleFormChange(day.date, 'booking_status', e.target.value)}
                                  >
                                    <option value="Booked">Booked (Confirmed)</option>
                                    <option value="Not Booked">Planning (Not Booked)</option>
                                  </select>
                                </label>
                              </div>

                              <div className="row">
                                <label style={{ flex: 1 }}>Departure Airport / City
                                  <input
                                    placeholder="e.g. BOM (Mumbai)"
                                    value={currentForm.dep_city || ''}
                                    onChange={e => handleFormChange(day.date, 'dep_city', e.target.value)}
                                  />
                                </label>
                                <label style={{ flex: 1 }}>Departure Time
                                  <input
                                    placeholder="e.g. 10:30 AM"
                                    value={currentForm.dep_time || ''}
                                    onChange={e => handleFormChange(day.date, 'dep_time', e.target.value)}
                                  />
                                </label>
                              </div>

                              <div className="row">
                                <label style={{ flex: 1 }}>Arrival Airport / City
                                  <input
                                    placeholder={`e.g. ${currentCity || 'DEL (Delhi)'}`}
                                    value={currentForm.arr_city || ''}
                                    onChange={e => handleFormChange(day.date, 'arr_city', e.target.value)}
                                  />
                                </label>
                                <label style={{ flex: 1 }}>Arrival Time
                                  <input
                                    placeholder="e.g. 01:45 PM"
                                    value={currentForm.arr_time || ''}
                                    onChange={e => handleFormChange(day.date, 'arr_time', e.target.value)}
                                  />
                                </label>
                              </div>

                              <div className="row">
                                <label style={{ flex: 1 }}>PNR / Confirmation Code
                                  <input
                                    placeholder="e.g. W89XYZ"
                                    value={currentForm.pnr || ''}
                                    onChange={e => handleFormChange(day.date, 'pnr', e.target.value)}
                                  />
                                </label>
                                <label style={{ flex: 1 }}>Total Ticket Price (₹)
                                  <input
                                    type="number"
                                    placeholder="0"
                                    value={currentForm.cost || ''}
                                    onChange={e => handleFormChange(day.date, 'cost', e.target.value)}
                                  />
                                </label>
                              </div>

                              <label>Seat, Terminal & Extra Notes
                                <textarea
                                  rows={2}
                                  placeholder="Terminal 2, Seat 14A, 15kg baggage included..."
                                  value={currentForm.notes || ''}
                                  onChange={e => handleFormChange(day.date, 'notes', e.target.value)}
                                />
                              </label>
                            </>
                          ) : (
                            <>
                              <div className="row">
                                <label style={{ flex: 2 }}>Name / Title
                                  <input
                                    placeholder={
                                      currentDrawer === 'stay' ? 'e.g. Grand Boutique Hotel' :
                                      currentDrawer === 'food' ? 'e.g. Le Jules Verne Bistro' :
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
                            </>
                          )}

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

          {/* Add Day Button */}
          <div className="add-day-btn-row" style={{ display: 'flex', justifyContent: 'center', marginTop: '24px', marginBottom: '24px' }}>
            <button
              type="button"
              className="btn secondary"
              onClick={handleAddDay}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <IconPlus size={16} /> Add Next Day (Day {days.length + 1})
            </button>
          </div>
        </div>
      )}

      {/* TAB: CALENDAR VIEW */}
      {activeTab === 'calendar' && (
        <div className="planner-calendar-tab reveal">
          <div className="calendar-view-header">
            <div>
              <h3 className="calendar-month-title">
                {calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h3>
              <p className="muted" style={{ margin: '4px 0 0', fontSize: '13px' }}>
                {trip.name} · {days.length} Days Planned ({trip.start_date || 'Flexible'} → {trip.end_date || ''})
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                className="btn secondary small"
                onClick={handlePrevMonth}
                title="Previous Month"
              >
                ‹ Prev Month
              </button>
              <button
                type="button"
                className="btn secondary small"
                onClick={handleNextMonth}
                title="Next Month"
              >
                Next Month ›
              </button>
              <button
                type="button"
                className="btn small"
                onClick={() => setActiveTab('itinerary')}
              >
                Timeline View
              </button>
            </div>
          </div>

          <div className="calendar-grid">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="calendar-weekday-header">{d}</div>
            ))}

            {renderCalendarCells()}
          </div>
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
              <div key={place.id || idx} className="save-card">
                {place.photo_url && (
                  <div className="save-card-img">
                    <img src={place.photo_url} alt={place.name} />
                    <span className="save-category-badge">{place.category}</span>
                  </div>
                )}
                <div className="save-card-body">
                  {!place.photo_url && (
                    <span className="save-category-badge" style={{ position: 'static', alignSelf: 'flex-start' }}>
                      {place.category}
                    </span>
                  )}
                  <h4>{place.name}</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {place.city_name && <span className="save-city-text"><IconPin size={11} /> {place.city_name}</span>}
                    {place.cost > 0 && <span className="save-cost-text">₹{place.cost}</span>}
                  </div>
                  <p className="save-desc">{place.description || place.notes}</p>

                  <div className="save-card-footer">
                    <span className="field-label" style={{ marginBottom: 0, fontSize: '11px', whiteSpace: 'nowrap' }}>Schedule:</span>
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

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="modal-backdrop" onClick={() => setEditingItem(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>Edit Scheduled Item</h3>
            <p className="muted" style={{ marginBottom: 18 }}>Update details for {editingItem.name}.</p>

            <form onSubmit={handleUpdateDayItemSubmit}>
              <label>Name / Title
                <input
                  value={editingItem.name || ''}
                  onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                  required
                />
              </label>

              <div className="row">
                <label style={{ flex: 1 }}>Category
                  <select
                    value={editingItem.category || 'place'}
                    onChange={e => setEditingItem({ ...editingItem, category: e.target.value })}
                  >
                    <option value="place">Place / Attraction</option>
                    <option value="food">Food & Dining</option>
                    <option value="stay">Hotel / Stay</option>
                    <option value="flight">Flight / Transport</option>
                    <option value="photo">Photo Memory</option>
                    <option value="note">Note</option>
                  </select>
                </label>

                <label style={{ flex: 1 }}>Cost (₹)
                  <input
                    type="number"
                    value={editingItem.cost || ''}
                    onChange={e => setEditingItem({ ...editingItem, cost: e.target.value })}
                  />
                </label>
              </div>

              <label>Notes / Booking Details
                <textarea
                  rows={2}
                  value={editingItem.notes || ''}
                  onChange={e => setEditingItem({ ...editingItem, notes: e.target.value })}
                />
              </label>

              <div className="form-actions" style={{ marginTop: 20 }}>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setEditingItem(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
