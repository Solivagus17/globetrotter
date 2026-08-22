import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import {
  IconSparkles,
  IconCompass,
  IconMap,
  IconPin,
  IconWallet,
  IconPlus,
} from '../components/Icons'

export default function VoyageAI() {
  const [searchParams] = useSearchParams()
  const initialTripId = searchParams.get('tripId') || ''

  const [trips, setTrips] = useState([])
  const [selectedTripId, setSelectedTripId] = useState(initialTripId)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        '✨ Welcome to **Voyage AI**, your luxury travel architect and concierge.\n\nI have real-time access to global destinations, verified attractions, local dining, flight transit guides, and budget optimization in Indian Rupees (₹).\n\nSelect a trip context above or ask me anything to get started!',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    api.listTrips()
      .then(data => {
        setTrips(data || [])
        if (!selectedTripId && data && data.length > 0) {
          // If query param didn't specify, default to first trip or global
          // setSelectedTripId(data[0].id)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, loading])

  const activeTrip = trips.find(t => t.id === selectedTripId)

  async function handleSend(customText = null) {
    const textToSend = typeof customText === 'string' ? customText : input
    if (!textToSend.trim() || loading) return

    const newMessages = [...messages, { role: 'user', content: textToSend.trim() }]
    setMessages(newMessages)
    if (typeof customText !== 'string') setInput('')
    setLoading(true)

    try {
      const res = await api.chat(
        newMessages.map(m => ({ role: m.role, content: m.content })),
        selectedTripId || null
      )

      if (res && res.reply) {
        setMessages([...newMessages, { role: 'assistant', content: res.reply }])
      } else {
        setMessages([
          ...newMessages,
          { role: 'assistant', content: 'I encountered an issue processing your request. Please try asking again!' },
        ])
      }
    } catch (err) {
      setMessages([
        ...newMessages,
        { role: 'assistant', content: `⚠️ ${err.message || 'Error communicating with Voyage AI.'}` },
      ])
    } finally {
      setLoading(false)
    }
  }

  function renderFormattedMessage(text) {
    const lines = text.split('\n')
    return (
      <div className="chat-msg-formatted">
        {lines.map((line, idx) => {
          if (!line.trim()) return <div key={idx} style={{ height: '8px' }} />

          // Bullet point
          if (line.trim().startsWith('- ') || line.trim().startsWith('• ') || line.trim().startsWith('* ')) {
            const content = line.trim().replace(/^[-•*]\s+/, '')
            return (
              <div key={idx} className="chat-bullet-row">
                <span className="chat-bullet-dot">•</span>
                <span>{renderInlineStyles(content)}</span>
              </div>
            )
          }

          // Numbered list
          if (/^\d+\.\s+/.test(line.trim())) {
            return (
              <div key={idx} className="chat-numbered-row" style={{ marginLeft: 4, marginTop: 4 }}>
                <span>{renderInlineStyles(line)}</span>
              </div>
            )
          }

          return <p key={idx} style={{ margin: '4px 0' }}>{renderInlineStyles(line)}</p>
        })}
      </div>
    )
  }

  function renderInlineStyles(str) {
    const parts = str.split(/(\*\*.*?\*\*)/g)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} style={{ color: 'var(--text)', fontWeight: 700 }}>{part.slice(2, -2)}</strong>
      }
      return part
    })
  }

  return (
    <div className="page voyage-ai-page">
      {/* Top Header & Context Switcher */}
      <div className="voyage-header-card reveal">
        <div className="voyage-header-main">
          <div className="voyage-avatar-badge">
            <IconSparkles size={24} />
          </div>
          <div>
            <div className="row-center" style={{ gap: 8 }}>
              <h2>Voyage AI</h2>
              <span className="voyage-model-pill">Powered by Groq LLM</span>
            </div>
            <p className="muted" style={{ fontSize: '13px', margin: '4px 0 0' }}>
              Your hyper-intelligent luxury travel planner, route optimizer, and local concierge.
            </p>
          </div>
        </div>

        {/* Trip Context Selector */}
        <div className="voyage-context-picker">
          <span className="voyage-context-label">Active Trip Context:</span>
          <select
            value={selectedTripId}
            onChange={(e) => setSelectedTripId(e.target.value)}
            className="voyage-trip-select"
          >
            <option value="">🌍 Global Travel Concierge (No Trip)</option>
            {trips.map(t => (
              <option key={t.id} value={t.id}>
                ✈️ {t.name} ({t.destination_city || t.description || 'Custom'})
              </option>
            ))}
          </select>
          {activeTrip && (
            <Link to={`/trips/${activeTrip.id}/builder`} className="btn secondary small" style={{ fontSize: '12px', padding: '5px 10px' }}>
              Open Planner ›
            </Link>
          )}
        </div>
      </div>

      {/* Suggested Quick Prompts Grid */}
      <div className="voyage-prompts-grid reveal reveal-d1">
        <button
          type="button"
          className="voyage-prompt-card"
          onClick={() =>
            handleSend(
              activeTrip
                ? `Suggest the top 3 must-visit cultural sights and hidden gems for ${activeTrip.destination_city || activeTrip.name} with estimated costs in ₹`
                : 'Suggest the top 3 must-visit cultural sights and hidden gems with estimated costs in ₹'
            )
          }
        >
          <div className="prompt-card-icon">🏛️</div>
          <div className="prompt-card-text">
            <strong>Top Attractions & Gems</strong>
            <span>Curated places with pricing & timings</span>
          </div>
        </button>

        <button
          type="button"
          className="voyage-prompt-card"
          onClick={() =>
            handleSend(
              activeTrip
                ? `What are the best local food spots, authentic dishes, and evening dining in ${activeTrip.destination_city || activeTrip.name}?`
                : 'What are the best local food spots, authentic dishes, and evening dining recommendations?'
            )
          }
        >
          <div className="prompt-card-icon">🍽️</div>
          <div className="prompt-card-text">
            <strong>Food & Local Dining</strong>
            <span>Street food, cafes & fine restaurants</span>
          </div>
        </button>

        <button
          type="button"
          className="voyage-prompt-card"
          onClick={() =>
            handleSend(
              activeTrip
                ? `Design a structured 3-day itinerary for ${activeTrip.destination_city || activeTrip.name} with morning, afternoon, and evening activities in ₹.`
                : 'Design a structured 3-day travel itinerary with morning, afternoon, and evening schedules with costs in ₹.'
            )
          }
        >
          <div className="prompt-card-icon">📅</div>
          <div className="prompt-card-text">
            <strong>3-Day Itinerary Plan</strong>
            <span>Step-by-step day schedule with costs</span>
          </div>
        </button>

        <button
          type="button"
          className="voyage-prompt-card"
          onClick={() =>
            handleSend('How can I optimize my travel budget and cut down on stay and transit costs without sacrificing quality?')
          }
        >
          <div className="prompt-card-icon">💰</div>
          <div className="prompt-card-text">
            <strong>Budget Optimization</strong>
            <span>Smart tips to save on stays & flights in ₹</span>
          </div>
        </button>
      </div>

      {/* Main Conversation Window */}
      <div className="voyage-chat-container reveal reveal-d2">
        {/* Messages Stream */}
        <div className="voyage-messages-stream">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`voyage-message-row ${m.role === 'user' ? 'user-row' : 'assistant-row'}`}
            >
              {m.role === 'assistant' && (
                <div className="voyage-msg-avatar">
                  <IconSparkles size={14} />
                </div>
              )}
              <div className={`voyage-message-bubble ${m.role}`}>
                {m.role === 'assistant' ? renderFormattedMessage(m.content) : m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="voyage-message-row assistant-row">
              <div className="voyage-msg-avatar">
                <IconSparkles size={14} />
              </div>
              <div className="voyage-message-bubble assistant ai-typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="voyage-input-bar">
          <form
            className="voyage-input-form"
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
          >
            <input
              type="text"
              className="voyage-input-field"
              placeholder={
                activeTrip
                  ? `Ask Voyage AI about ${activeTrip.destination_city || activeTrip.name}, dining, timing, or budgeting...`
                  : 'Ask Voyage AI anything about worldwide destinations, itineraries, or food...'
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="voyage-send-btn"
              disabled={loading || !input.trim()}
              title="Send message to Voyage AI"
            >
              Send ➤
            </button>
          </form>

          <div className="voyage-input-footer">
            <span className="muted" style={{ fontSize: '11.5px' }}>
              💡 Tip: Voyage AI provides tailored recommendations in Indian Rupees (₹) with real-time geographic context.
            </span>
            <button
              type="button"
              className="voyage-clear-btn"
              onClick={() =>
                setMessages([
                  {
                    role: 'assistant',
                    content: '✨ Chat refreshed! What trip or destination would you like to explore?',
                  },
                ])
              }
            >
              Clear Conversation
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
