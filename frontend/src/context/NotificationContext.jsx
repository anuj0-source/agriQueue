import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const NotificationContext = createContext(null)

const MAX_NOTIFICATIONS = 30
const STORAGE_KEY = 'agriqueue_notifications'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveToStorage(notifications) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, MAX_NOTIFICATIONS)))
  } catch {
    // Storage quota exceeded — ignore
  }
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState(() => loadFromStorage())
  const [panelOpen, setPanelOpen] = useState(false)

  // Persist on every change
  useEffect(() => {
    saveToStorage(notifications)
  }, [notifications])

  // Request browser notification permissions on load
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
  }, [])

  // Declare addNotification BEFORE the SW useEffect that depends on it
  const addNotification = useCallback((message, type = 'info', title = null) => {
    const notifTitle = title || defaultTitle(type)
    const n = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      message,
      title: notifTitle,
      type,
      timestamp: new Date().toISOString(),
      read: false,
    }
    setNotifications(prev => [n, ...prev].slice(0, MAX_NOTIFICATIONS))

    // Trigger OS-level browser notification if allowed
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(notifTitle, { body: message })
      } catch (err) {
        // Ignore environments where Notification constructor fails
      }
    }
  }, [])

  // Listen for push notifications forwarded by service worker.
  // Attached after addNotification is defined so the dependency array is valid.
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    const handleSwMessage = (event) => {
      if (event.data?.type === 'PUSH_NOTIFICATION_RECEIVED') {
        const { title, message, type, url } = event.data.notification || {}
        if (message) {
          addNotification(message, type || 'success', title)
        }
        // Navigate to the deep-link URL only if the tab is in the foreground
        // and we're not already on that page, to avoid jarring navigation.
        if (url && url !== '/' && document.visibilityState === 'visible') {
          if (window.location.pathname !== url) {
            window.history.pushState(null, '', url)
            window.dispatchEvent(new PopStateEvent('popstate'))
          }
        }
      }
    }

    navigator.serviceWorker.addEventListener('message', handleSwMessage)
    return () => navigator.serviceWorker.removeEventListener('message', handleSwMessage)
  }, [addNotification])

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  const markRead = useCallback((id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  const openPanel = useCallback(() => {
    setPanelOpen(true)
    // Mark all read after a small delay
    setTimeout(markAllRead, 300)
  }, [markAllRead])

  const closePanel = useCallback(() => setPanelOpen(false), [])

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      panelOpen,
      addNotification,
      markAllRead,
      markRead,
      clearAll,
      openPanel,
      closePanel,
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used inside NotificationProvider')
  return ctx
}

function defaultTitle(type) {
  switch (type) {
    case 'success': return 'Great news!'
    case 'payment': return '💰 Payment Update'
    case 'warning': return 'Heads up'
    case 'alert':   return 'Action needed'
    case 'error':   return 'Error'
    default:        return 'Update'
  }
}
