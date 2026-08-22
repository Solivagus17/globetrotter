import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'

export default function Budget() {
  const { tripId } = useParams()
  const [budget, setBudget] = useState(null)

  useEffect(() => { api.budget(tripId).then(setBudget) }, [tripId])

  if (!budget) return <div className="page-loading">Loading budget...</div>

  const entries = Object.entries(budget.by_city)
  const max = Math.max(1, ...entries.map(([, v]) => v))

  return (
    <div className="page">
      <div className="row-between reveal">
        <h2>Budget Breakdown</h2>
        <Link to={`/trips/${tripId}/builder`} className="btn secondary">Day Planner</Link>
      </div>

      <div className="budget-total reveal reveal-d1">
        <span className="muted">Estimated Total</span>
        <h1>₹{Math.round(budget.total).toLocaleString('en-IN')}</h1>
      </div>

      <div className="budget-bars">
        {entries.map(([city, cost], i) => {
          const delayClass = i < 10 ? `reveal-d${i + 2}` : 'reveal-d10'
          return (
            <div key={city} className={`budget-row reveal ${delayClass}`}>
              <span className="budget-label">{city}</span>
              <div className="budget-bar-track">
                <div className="budget-bar-fill" style={{ width: `${(cost / max) * 100}%` }} />
              </div>
              <span className="budget-value">₹{Math.round(cost).toLocaleString('en-IN')}</span>
            </div>
          )
        })}
        {entries.length === 0 && <p className="muted reveal reveal-d2">Add scheduled items with costs in your Day Planner to see your budget breakdown.</p>}
      </div>
    </div>
  )
}
