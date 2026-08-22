import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { api } from '../api'

export default function EditTrip() {
  const { tripId } = useParams()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [form, setForm] = useState(null)
  const [coverUrl, setCoverUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    api.getTrip(tripId)
      .then(trip => {
        if (cancelled) return
        setForm({
          name: trip.name || '',
          start_date: trip.start_date || '',
          end_date: trip.end_date || '',
          description: trip.description || '',
        })
        setCoverUrl(trip.cover_photo_url || '')
      })
      .catch(e => setError(e.message))
    return () => { cancelled = true }
  }, [tripId])

  if (error && !form) {
    return (
      <div className="page">
        <p className="error">{error}</p>
        <Link to="/" className="btn secondary">Back to My Trips</Link>
      </div>
    )
  }
  if (!form) return <div className="page-loading">Loading trip...</div>

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await api.updateTrip(tripId, form)
      navigate('/')
    } catch (e2) {
      setError(e2.message)
      setSaving(false)
    }
  }

  async function handleFileSelected(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    setUploading(true)
    try {
      const res = await api.uploadCover(tripId, file)
      setCoverUrl(res.cover_photo_url)
    } catch (e2) {
      setError(e2.message)
    } finally {
      setUploading(false)
    }
  }

  async function removeCover() {
    setError('')
    try {
      await api.updateTrip(tripId, { cover_photo_url: null })
      setCoverUrl('')
    } catch (e2) {
      setError(e2.message)
    }
  }

  return (
    <div className="page">
      <div className="form-card wide">
        <h2>Edit Trip</h2>

        <span className="field-label">Cover photo</span>
        <div className="cover-picker">
          <button
            type="button"
            className="cover-preview"
            title="Choose an image"
            onClick={() => fileInputRef.current?.click()}
          >
            {coverUrl
              ? <img src={coverUrl} alt="Cover preview" />
              : '🖼️'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            style={{ display: 'none' }}
            onChange={handleFileSelected}
          />
          <div className="cover-actions">
            <button
              type="button"
              className="btn secondary small"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : coverUrl ? 'Change photo' : 'Add cover photo'}
            </button>
            <span className="muted">JPG, PNG, WebP or GIF · max 5 MB</span>
            {coverUrl && (
              <button type="button" className="link-btn danger" onClick={removeCover}>
                Remove photo
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleSave}>
          <label>Trip Name
            <input value={form.name} onChange={e => update('name', e.target.value)} required placeholder="Summer in Europe" />
          </label>
          <div className="row">
            <label>Start Date
              <input type="date" value={form.start_date} onChange={e => update('start_date', e.target.value)} required />
            </label>
            <label>End Date
              <input type="date" value={form.end_date} min={form.start_date} onChange={e => update('end_date', e.target.value)} required />
            </label>
          </div>
          <label>Description
            <textarea value={form.description} onChange={e => update('description', e.target.value)} rows={3} placeholder="Two weeks island-hopping..." />
          </label>
          {error && <p className="error">{error}</p>}
          <div className="form-actions">
            <Link to="/" className="btn secondary">Cancel</Link>
            <button type="submit" className="btn" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
