import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '../api'
import { IconCompass, IconPin, IconStar, IconPlane } from './Icons'

export default function AIChatDrawer() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '👋 Hi! I am **GlobeTrotter AI**, your luxury travel concierge and itinerary architect.\n\nAsk me anything: recommend local dining, optimize your trip schedule, find hidden gems, or budget flights & stays in ₹.',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const location = useLocation()

  // Extract tripId if currently inside a trip page
  const tripMatch = location.pathname.match(/\/trips\/([a-zA-Z0-9_-]+)/)
  const currentTripId = tripMatch ? tripMatch[1] : null

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

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
        currentTripId
      )

      if (res && res.reply) {
        setMessages([...newMessages, { role: 'assistant', content: res.reply }])
      } else {
        setMessages([
          ...newMessages,
          { role: 'assistant', content: 'Sorry, I could not process that. Please try asking again!' },
        ])
      }
    } catch (err) {
      setMessages([
        ...newMessages,
        { role: 'assistant', content: `⚠️ ${err.message || 'Error communicating with travel AI.'}` },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleQuickPrompt(promptText) {
    handleSend(promptText)
  }

  // Format assistant messages cleanly with bold text, bullets, and line breaks
  function renderFormattedMessage(text) {
    const lines = text.split('\n')
    return (
      <div className="chat-msg-formatted">
        {lines.map((line, idx) => {
          if (!line.trim()) return <div key={idx} style={{ height: '6px' }} />
          
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
              <div key={idx} className="chat-numbered-row">
                <span>{renderInlineStyles(line)}</span>
              </div>
            )
          }

          return <p key={idx} style={{ margin: '3px 0' }}>{renderInlineStyles(line)}</p>
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
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          type="button"
          className="ai-chat-floating-btn"
          onClick={() => setIsOpen(true)}
          title="Open Voyage AI Assistant"
        >
          <span className="ai-chat-sparkle">✨</span>
          <span className="ai-chat-btn-label">Voyage AI</span>
          {currentTripId && <span className="ai-chat-live-pulse" />}
        </button>
      )}

      {/* Floating Chat Window */}
      {isOpen && (
        <div className="ai-chat-drawer-container reveal">
          {/* Header */}
          <div className="ai-chat-header">
            <div className="ai-chat-header-left">
              <div className="ai-avatar-badge">✨</div>
              <div>
                <div className="ai-header-title">Voyage AI</div>
                <div className="ai-header-sub">
                  <span className="ai-status-dot" />
                  {currentTripId ? 'Trip Context Active' : 'Global Travel Concierge'}
                </div>
              </div>
            </div>
            <div className="ai-chat-header-actions">
              <button
                type="button"
                className="ai-chat-tool-btn"
                title="Clear chat"
                onClick={() =>
                  setMessages([
                    {
                      role: 'assistant',
                      content: 'Chat refreshed! How can I assist with your travels today?',
                    },
                  ])
                }
              >
                ↺
              </button>
              <button
                type="button"
                className="ai-chat-tool-btn"
                title="Close"
                onClick={() => setIsOpen(false)}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Quick Prompt Suggestions */}
          <div className="ai-quick-prompts-bar">
            <button
              type="button"
              className="ai-quick-chip"
              onClick={() => handleQuickPrompt('Recommend the top 3 must-visit cultural places with costs in ₹')}
            >
              🏛️ Top Attractions
            </button>
            <button
              type="button"
              className="ai-quick-chip"
              onClick={() => handleQuickPrompt('Suggest iconic local food & evening dining spots')}
            >
              🍽️ Local Food
            </button>
            <button
              type="button"
              className="ai-quick-chip"
              onClick={() => handleQuickPrompt('How can I optimize my day schedule and transit?')}
            >
              ⏱️ Optimize Day
            </button>
            <button
              type="button"
              className="ai-quick-chip"
              onClick={() => handleQuickPrompt('Suggest a smart 3-day itinerary with budget in ₹')}
            >
              📅 3-Day Plan
            </button>
          </div>

          {/* Messages Body */}
          <div className="ai-chat-messages-body">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`ai-message-row ${m.role === 'user' ? 'user-row' : 'assistant-row'}`}
              >
                {m.role === 'assistant' && (
                  <div className="ai-msg-avatar">✨</div>
                )}
                <div className={`ai-message-bubble ${m.role}`}>
                  {m.role === 'assistant' ? renderFormattedMessage(m.content) : m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="ai-message-row assistant-row">
                <div className="ai-msg-avatar">✨</div>
                <div className="ai-message-bubble assistant ai-typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <form
            className="ai-chat-input-row"
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
          >
            <input
              type="text"
              className="ai-chat-input"
              placeholder="Ask about places, food, flights, or itineraries..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="ai-chat-send-btn"
              disabled={loading || !input.trim()}
              title="Send message"
            >
              ➤
            </button>
          </form>
        </div>
      )}
    </>
  )
}
