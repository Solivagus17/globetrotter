import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { IconPin, IconCompass } from '../components/Icons'

const POPULAR_DESTINATIONS = [
  'Ahmedabad', 'Goa', 'Jaipur', 'Mumbai', 'Delhi', 'Dubai', 'Tokyo', 'Rome', 'Paris', 'Bali'
]

export default function CreateTrip() {
  const [form, setForm] = useState({
    name: '',
    destination_city: '',
    start_date: '',
    end_date: '',
    description: '',
    travellers: 1,
  })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  function update(field, value) {
    setForm(prev => {
      const next = { ...prev, [field]: value }
      if (field === 'destination_city' && value && (!prev.name || prev.name.startsWith('Trip to '))) {
        next.name = `Trip to ${value}`
      }
      return next
    })
  }

  function handleSelectQuickCity(city) {
    setForm(prev => ({
      ...prev,
      destination_city: city,
      name: prev.name && !prev.name.startsWith('Trip to ') ? prev.name : `Trip to ${city}`,
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const payload = {
        name: form.name.trim(),
        destination_city: form.destination_city.trim(),
        start_date: form.start_date,
        end_date: form.end_date,
        description: form.description.trim() || form.destination_city.trim(),
      }

      const trip = await api.createTrip(payload)

      // Store initial day city in localStorage for instant offline/local rendering
      if (form.destination_city.trim() && form.start_date) {
        try {
          const stored = {}
          stored[form.start_date] = form.destination_city.trim()
          localStorage.setItem(`trip_${trip.id}_day_cities`, JSON.stringify(stored))
        } catch (eStore) {}
      }

      navigate(`/trips/${trip.id}/builder`)
    } catch (e) {
      setError(e.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="page create-trip-page">
      <div className="reveal" style={{ maxWidth: 640 }}>
        <h2 style={{ marginBottom: 6 }}>Plan a New Trip</h2>
        <p className="muted" style={{ marginBottom: 28 }}>
          Set your destination and dates. Your day-by-day itinerary and map will be ready immediately.
        </p>

        <form onSubmit={handleSubmit} className="trip-form">
          {/* Destination / Initial Location */}
          <div className="form-group reveal reveal-d1" style={{ marginBottom: 20 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <IconPin size={15} /> Primary Destination / City
              <span style={{ color: 'var(--primary-dark)', fontSize: '12px' }}>*</span>
            </label>
            <input
              value={form.destination_city}
              onChange={e => update('destination_city', e.target.value)}
              required
              placeholder="e.g. Goa, Ahmedabad, Paris, Tokyo, Dubai..."
              style={{ fontSize: '15px', padding: '12px 14px' }}
            />

            {/* Quick city suggestions */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
              <span className="muted" style={{ fontSize: '12px', alignSelf: 'center' }}>Suggestions:</span>
              {POPULAR_DESTINATIONS.map(city => (
                <button
                  key={city}
                  type="button"
                  className={`chip ${form.destination_city.toLowerCase() === city.toLowerCase() ? 'active' : ''}`}
                  onClick={() => handleSelectQuickCity(city)}
                  style={{ fontSize: '12px', padding: '4px 10px' }}
                >
                  {city}
                </button>
              ))}
            </div>
          </div>

          {/* Trip Name */}
          <label className="reveal reveal-d2">
            Trip Name
            <input
              value={form.name}
              onChange={e => update('name', e.target.value)}
              required
              placeholder="e.g. Summer in Goa, Tokyo Holiday 2026"
            />
          </label>

          {/* Dates */}
          <div className="row reveal reveal-d3">
            <label>
              Start Date
              <input
                type="date"
                value={form.start_date}
                onChange={e => update('start_date', e.target.value)}
                required
              />
            </label>
            <label>
              End Date
              <input
                type="date"
                value={form.end_date}
                min={form.start_date || undefined}
                onChange={e => update('end_date', e.target.value)}
                required
              />
            </label>
          </div>

          {/* Notes / Description */}
          <label className="reveal reveal-d4">
            Notes / Description
            <textarea
              value={form.description}
              onChange={e => update('description', e.target.value)}
              rows={3}
              placeholder="Travel companion notes, flight details, or sights you want to explore..."
            />
          </label>

          {error && <p className="error" style={{ marginTop: 12 }}>{error}</p>}

          <div style={{ marginTop: 24 }} className="reveal reveal-d5">
            <button type="submit" className="btn" disabled={isSubmitting} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <IconCompass size={16} /> {isSubmitting ? 'Creating Trip...' : 'Create Itinerary & Start Planning'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
