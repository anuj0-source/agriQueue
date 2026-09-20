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
      Notification.requestPermission()
    }
  }, [])

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
    case 'warning': return 'Heads up'
    case 'alert':   return 'Action needed'
    case 'error':   return 'Error'
    default:        return 'Update'
  }
}
