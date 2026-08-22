import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { IconBookmark, IconPin, IconTrash, IconPlus, IconSearch } from '../components/Icons'

export default function SavedPlaces() {
  const [saves, setSaves] = useState([])
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedSaveForTrip, setSelectedSaveForTrip] = useState(null)
  const [selectedTripId, setSelectedTripId] = useState('')
  const [tripDays, setTripDays] = useState([])
  const [selectedDayDate, setSelectedDayDate] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')
  const [error, setError] = useState('')

  async function load() {
    try {
      const [savesData, tripsData] = await Promise.all([
        api.listSaves(),
        api.listTrips(),
      ])
      setSaves(savesData || [])
      setTrips(tripsData || [])
      if (tripsData && tripsData.length > 0) {
        setSelectedTripId(tripsData[0].id)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleDeleteSave(saveId) {
    try {
      await api.deleteSave(saveId)
      setSaves(prev => prev.filter(s => s.id !== saveId))
      setActionSuccess('Removed from saved places.')
      setTimeout(() => setActionSuccess(''), 3000)
    } catch (err) {
      setError(err.message)
    }
  }

  async function openAddToTripModal(save) {
    setSelectedSaveForTrip(save)
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
    if (!selectedTripId) return

    try {
      const targetDate = selectedDayDate || (tripDays.length > 0 ? tripDays[0].date : new Date().toISOString().slice(0, 10))
      await api.addDayItem(selectedTripId, targetDate, {
        name: selectedSaveForTrip.name,
        category: selectedSaveForTrip.category || 'place',
        cost: selectedSaveForTrip.cost || 0,
        notes: selectedSaveForTrip.description || selectedSaveForTrip.address || '',
        photo_url: selectedSaveForTrip.photo_url || '',
        location_name: selectedSaveForTrip.city_name || '',
        source_save_id: selectedSaveForTrip.id,
      })

      setActionSuccess(`Added "${selectedSaveForTrip.name}" to trip schedule!`)
      setSelectedSaveForTrip(null)
      setTimeout(() => setActionSuccess(''), 3500)
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <div className="page-loading">Loading your saved places...</div>

  return (
    <div className="page saved-places-page">
      {/* Header */}
      <div className="row-between reveal">
        <div>
          <h2>My Saved Places</h2>
          <p className="muted">Your curated pool of attractions, restaurants, and stays. Add any place to your itineraries.</p>
        </div>
        <Link to="/discover" className="btn small">
          <IconSearch size={14} /> Discover More
        </Link>
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

      {saves.length === 0 ? (
        <div className="empty-state reveal reveal-d1">
          <div className="empty-icon-wrap">
            <IconBookmark size={32} />
          </div>
          <h3>No saved places yet</h3>
          <p className="muted">Search and bookmark top spots in the Discover section to save them here.</p>
          <Link to="/discover" className="btn">Explore Discover</Link>
        </div>
      ) : (
        <div className="saves-grid reveal reveal-d1">
          {saves.map(save => (
            <div key={save.id} className="save-card">
              {save.photo_url && (
                <div className="save-card-img">
                  <img src={save.photo_url} alt={save.name} />
                  <span className="save-category-badge">{save.category}</span>
                </div>
              )}
              <div className="save-card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h4>{save.name}</h4>
                  <button
                    type="button"
                    className="day-item-delete-btn"
                    title="Remove from saves"
                    onClick={() => handleDeleteSave(save.id)}
                  >
                    <IconTrash size={14} />
                  </button>
                </div>

                {save.city_name && (
                  <span className="save-city-text"><IconPin size={11} /> {save.city_name}</span>
                )}
                {save.cost > 0 && (
                  <span className="save-cost-text">₹{save.cost}</span>
                )}
                {save.description && (
                  <p className="save-desc">{save.description}</p>
                )}

                <div className="save-card-footer" style={{ marginTop: 'auto', paddingTop: 12 }}>
                  <button
                    type="button"
                    className="btn secondary small"
                    style={{ width: '100%' }}
                    onClick={() => openAddToTripModal(save)}
                  >
                    <IconPlus size={13} /> Add to Trip
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add to Trip Picker Modal */}
      {selectedSaveForTrip && (
        <div className="modal-backdrop" onClick={() => setSelectedSaveForTrip(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>Schedule to Trip</h3>
            <p className="muted" style={{ marginBottom: 20 }}>
              Add <strong>{selectedSaveForTrip.name}</strong> to your itinerary.
            </p>

            {trips.length === 0 ? (
              <div>
                <p className="muted" style={{ marginBottom: 16 }}>No trips created yet.</p>
                <Link to="/trips/new" className="btn">Create a Trip</Link>
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
                    onClick={() => setSelectedSaveForTrip(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={handleConfirmAddToTrip}
                  >
                    Schedule Place
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
