import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'

export default function Budget() {
  const { tripId } = useParams()
  const [budget, setBudget] = useState(null)

  useEffect(() => { api.budget(tripId).then(setBudget) }, [tripId])

  if (!budget) return <p>Loading budget...</p>

  const entries = Object.entries(budget.by_city)
  const max = Math.max(1, ...entries.map(([, v]) => v))

  return (
    <div className="page">
      <div className="row-between">
        <h2>Budget Breakdown</h2>
        <Link to={`/trips/${tripId}/builder`} className="btn secondary">Edit Trip</Link>
      </div>

      <div className="budget-total">
        <span className="muted">Estimated Total</span>
        <h1>${budget.total.toFixed(2)}</h1>
      </div>

      <div className="budget-bars">
        {entries.map(([city, cost]) => (
          <div key={city} className="budget-row">
            <span className="budget-label">{city}</span>
            <div className="budget-bar-track">
              <div className="budget-bar-fill" style={{ width: `${(cost / max) * 100}%` }} />
            </div>
            <span className="budget-value">${cost.toFixed(2)}</span>
          </div>
        ))}
        {entries.length === 0 && <p className="muted">Add stops and activities to see your budget.</p>}
      </div>
    </div>
  )
}
