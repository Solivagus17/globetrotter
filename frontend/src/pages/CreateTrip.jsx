import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

export default function CreateTrip() {
  const [form, setForm] = useState({ name: '', start_date: '', end_date: '', description: '', travellers: 1 })
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
    <div className="page">
      <h2 className="reveal" style={{ marginBottom: 6 }}>Plan a New Trip</h2>
      <p className="muted reveal reveal-d1" style={{ marginBottom: 32 }}>Fill in the basics — you can add stops and activities next.</p>
      <form onSubmit={handleSubmit} style={{ maxWidth: 600 }}>
        <label className="reveal reveal-d2">Trip Name
          <input value={form.name} onChange={e => update('name', e.target.value)} required placeholder="Summer in Europe" />
        </label>
        <div className="row reveal reveal-d3">
          <label>Start Date
            <input type="date" value={form.start_date} onChange={e => update('start_date', e.target.value)} required />
          </label>
          <label>End Date
            <input type="date" value={form.end_date} onChange={e => update('end_date', e.target.value)} required />
          </label>
        </div>
        <label className="reveal reveal-d4">Number of Travellers
          <input type="number" min={1} value={form.travellers} onChange={e => update('travellers', parseInt(e.target.value) || 1)} required />
        </label>
        <label className="reveal reveal-d5">Description
          <textarea value={form.description} onChange={e => update('description', e.target.value)} rows={5} placeholder="A quick note about the trip — places you want to visit, things to do…" />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn reveal reveal-d6">Save & Add Stops</button>
      </form>
    </div>
  )
}
