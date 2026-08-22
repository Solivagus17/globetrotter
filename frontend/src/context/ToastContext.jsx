import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'info', duration = 2800) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6)
    setToasts(prev => [...prev, { id, message, type }])

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, duration)
    }
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const success = useCallback((msg, duration) => addToast(msg, 'success', duration), [addToast])
  const error = useCallback((msg, duration) => addToast(msg, 'error', duration), [addToast])
  const info = useCallback((msg, duration) => addToast(msg, 'info', duration), [addToast])

  return (
    <ToastContext.Provider value={{ showToast: addToast, success, error, info, removeToast }}>
      {children}
      <div className="toast-portal-container" aria-live="polite">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`toast-notification toast-${t.type} reveal`}
            onClick={() => removeToast(t.id)}
          >
            <span className="toast-icon">
              {t.type === 'success' && '✓'}
              {t.type === 'error' && '⚠️'}
              {t.type === 'info' && '✨'}
            </span>
            <span className="toast-message">{t.message}</span>
            <button
              type="button"
              className="toast-close-btn"
              onClick={(e) => {
                e.stopPropagation()
                removeToast(t.id)
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    return {
      showToast: () => {},
      success: (msg) => console.log('Toast:', msg),
      error: (msg) => console.error('Toast Error:', msg),
      info: (msg) => console.log('Toast Info:', msg),
      removeToast: () => {},
    }
  }
  return ctx
}
