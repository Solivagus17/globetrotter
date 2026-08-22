import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

export default function CreateTrip() {
  const [form, setForm] = useState({ name: '', start_date: '', end_date: '', description: '' })
  const [error, setError] = useState('')
  const navigate = useNavigate()

  function update(field, value) {
    setForm({ ...form, [field]: value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      const trip = await api.createTrip(form)
      navigate(`/trips/${trip.id}/builder`)
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="form-card">
      <h2>Plan a New Trip</h2>
      <form onSubmit={handleSubmit}>
        <label>Trip Name
          <input value={form.name} onChange={e => update('name', e.target.value)} required placeholder="Summer in Europe" />
        </label>
        <div className="row">
          <label>Start Date
            <input type="date" value={form.start_date} onChange={e => update('start_date', e.target.value)} required />
          </label>
          <label>End Date
            <input type="date" value={form.end_date} onChange={e => update('end_date', e.target.value)} required />
          </label>
        </div>
        <label>Description
          <textarea value={form.description} onChange={e => update('description', e.target.value)} rows={3} />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn">Save & Add Stops</button>
      </form>
    </div>
  )
}
