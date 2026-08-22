import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { api } from '../api'
import { IconImage, IconTrash } from '../components/Icons'

export default function EditTrip() {
  const { tripId } = useParams()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [form, setForm] = useState(null)
  const [coverUrl, setCoverUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
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
          budget_target: trip.budget_target || '',
        })
        setCoverUrl(trip.cover_photo_url || '')
      })
      .catch(e => setError(e.message))
    return () => { cancelled = true }
  }, [tripId])

  if (error && !form) {
    return (
      <div className="page">
        <p className="error" style={{ marginBottom: 16 }}>{error}</p>
        <Link to="/" className="btn secondary">Back to My Trips</Link>
      </div>
    )
  }
  if (!form) return <div className="page-loading">Loading trip details...</div>

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

  async function handleDeleteTrip() {
    if (!window.confirm(`Are you sure you want to delete "${form.name}"? This action cannot be undone.`)) {
      return
    }
    setDeleting(true)
    setError('')
    try {
      await api.deleteTrip(tripId)
      navigate('/')
    } catch (err) {
      setError(err.message)
      setDeleting(false)
    }
  }

  return (
    <div className="page edit-trip-page">
      {/* Header */}
      <div className="row-between reveal">
        <div>
          <h2>Edit Trip Details</h2>
          <p className="muted">Update name, travel dates, cover photo, and notes.</p>
        </div>
        <div className="header-actions">
          <Link to={`/trips/${tripId}/builder`} className="btn small">Day Planner</Link>
          <Link to={`/trips/${tripId}/view`} className="btn secondary small">View Itinerary</Link>
        </div>
      </div>

      <div className="edit-trip-content reveal reveal-d1" style={{ maxWidth: 680 }}>
        {/* Cover Photo Banner Section */}
        <div className="edit-cover-section">
          <label>Cover Photo</label>
          <div className="edit-cover-banner">
            {coverUrl ? (
              <div className="cover-banner-preview">
                <img src={coverUrl} alt="Trip cover" />
                <div className="cover-banner-overlay">
                  <button
                    type="button"
                    className="btn secondary small"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <IconImage size={14} /> {uploading ? 'Uploading...' : 'Change Cover'}
                  </button>
                  <button
                    type="button"
                    className="btn secondary small danger-btn"
                    onClick={removeCover}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="cover-banner-empty"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="cover-empty-icon">
                  <IconImage size={32} />
                </div>
                <span className="cover-empty-text">
                  {uploading ? 'Uploading photo...' : 'Click to add a cover photo'}
                </span>
                <span className="cover-empty-subtext">JPG, PNG, WebP or GIF · max 5 MB</span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              style={{ display: 'none' }}
              onChange={handleFileSelected}
            />
          </div>
        </div>

        {/* Main Trip Form */}
        <form onSubmit={handleSave} className="edit-trip-form">
          <label>Trip Name
            <input
              value={form.name}
              onChange={e => update('name', e.target.value)}
              required
              placeholder="e.g. Summer in Europe"
            />
          </label>

          <div className="row">
            <label>Start Date
              <input
                type="date"
                value={form.start_date}
                onChange={e => update('start_date', e.target.value)}
                required
              />
            </label>
            <label>End Date
              <input
                type="date"
                value={form.end_date}
                min={form.start_date}
                onChange={e => update('end_date', e.target.value)}
                required
              />
            </label>
          </div>

          <label>Target Budget (₹)
            <input
              type="number"
              min="0"
              step="500"
              value={form.budget_target || ''}
              onChange={e => update('budget_target', e.target.value)}
              placeholder="e.g. 35000"
            />
          </label>

          <label>Description & Notes
            <textarea
              value={form.description}
              onChange={e => update('description', e.target.value)}
              rows={3}
              placeholder="Itinerary summary, transport links, or group notes..."
            />
          </label>

          {error && <p className="error" style={{ marginBottom: 16 }}>{error}</p>}

          <div className="edit-form-actions">
            <button
              type="submit"
              className="btn"
              disabled={saving}
            >
              {saving ? 'Saving Changes...' : 'Save Changes'}
            </button>
            <Link to="/" className="btn secondary">Cancel</Link>
          </div>
        </form>

        {/* Danger Zone: Delete Trip */}
        <div className="danger-zone-section reveal reveal-d2">
          <div className="danger-zone-header">
            <div>
              <h4>Delete This Trip</h4>
              <p className="muted">Permanently delete this trip and all its stops, activities, and budget items.</p>
            </div>
            <button
              type="button"
              className="btn secondary small danger-btn"
              onClick={handleDeleteTrip}
              disabled={deleting}
            >
              <IconTrash size={14} /> {deleting ? 'Deleting...' : 'Delete Trip'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
