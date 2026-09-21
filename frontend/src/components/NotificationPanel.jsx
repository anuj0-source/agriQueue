import { useEffect, useRef, useState } from 'react'
import { X, Bell, CheckCheck, Trash2, CheckCircle2, AlertTriangle, Info, Zap } from 'lucide-react'
import { useNotifications } from '../context/NotificationContext'
import { registerPushNotifications, checkNotificationStatus } from '../api'

const TYPE_CONFIG = {
  success: {
    icon: CheckCircle2,
    iconCls: 'notif-icon-success',
    pillCls: 'notif-pill-success',
    label: 'Success',
  },
  warning: {
    icon: AlertTriangle,
    iconCls: 'notif-icon-warning',
    pillCls: 'notif-pill-warning',
    label: 'Warning',
  },
  alert: {
    icon: Zap,
    iconCls: 'notif-icon-alert',
    pillCls: 'notif-pill-alert',
    label: 'Alert',
  },
  error: {
    icon: X,
    iconCls: 'notif-icon-error',
    pillCls: 'notif-pill-error',
    label: 'Error',
  },
  info: {
    icon: Info,
    iconCls: 'notif-icon-info',
    pillCls: 'notif-pill-info',
    label: 'Info',
  },
}

function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function NotificationPanel() {
  const { notifications, panelOpen, clearAll, markRead, closePanel } = useNotifications()
  const panelRef = useRef(null)
  const [pushStatus, setPushStatus] = useState(() => checkNotificationStatus())
  const [enablingPush, setEnablingPush] = useState(false)
  const [pushMessage, setPushMessage] = useState('')

  const handleEnablePush = async () => {
    setEnablingPush(true)
    setPushMessage('')
    try {
      const res = await registerPushNotifications(true)
      const current = checkNotificationStatus()
      setPushStatus(current)
      if (res?.success) {
        setPushMessage('✓ Push notifications active!')
      } else {
        setPushMessage(res?.error || 'Could not enable notifications')
      }
    } catch (e) {
      setPushMessage(e.message || 'Error enabling notifications')
    } finally {
      setEnablingPush(false)
    }
  }

  // Close on outside click
  useEffect(() => {
    if (!panelOpen) return
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        closePanel()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [panelOpen, closePanel])

  // Close on Escape key
  useEffect(() => {
    if (!panelOpen) return
    function handleKey(e) {
      if (e.key === 'Escape') closePanel()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [panelOpen, closePanel])

  if (!panelOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="notif-backdrop" onClick={closePanel} aria-hidden="true" />

      {/* Panel */}
      <aside className="notif-panel" ref={panelRef} role="dialog" aria-label="Notifications">
        {/* Header */}
        <div className="notif-panel-header">
          <div className="notif-panel-title-row">
            <Bell size={18} className="notif-panel-bell" />
            <h2 className="notif-panel-title">Notifications</h2>
            {notifications.length > 0 && (
              <span className="notif-count-badge">{notifications.length}</span>
            )}
          </div>
          <div className="notif-panel-actions">
            {notifications.length > 0 && (
              <button
                className="notif-action-btn"
                onClick={clearAll}
                title="Clear all"
              >
                <Trash2 size={14} />
                <span>Clear</span>
              </button>
            )}
            <button
              className="notif-close-btn"
              onClick={closePanel}
              aria-label="Close notifications"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Push Notification Enable Prompt when disabled */}
        {pushStatus !== 'granted' && (
          <div className="notif-push-banner">
            <div className="notif-push-info">
              <span className="notif-push-title">🔔 Instant Alerts Off</span>
              <span className="notif-push-desc">Enable alerts to get instant notifications when payment is credited.</span>
            </div>
            <button
              type="button"
              className="notif-push-btn enable"
              onClick={handleEnablePush}
              disabled={enablingPush}
            >
              {enablingPush ? 'Enabling…' : 'Enable'}
            </button>
          </div>
        )}
        {pushMessage && <div className="notif-push-feedback">{pushMessage}</div>}

        {/* Notification list */}
        <div className="notif-list">
          {notifications.length === 0 ? (
            <div className="notif-empty">
              <div className="notif-empty-icon">
                <Bell size={32} />
              </div>
              <p className="notif-empty-title">All caught up!</p>
              <p className="notif-empty-sub">No notifications yet. Queue updates and alerts will appear here.</p>
            </div>
          ) : (
            notifications.map((n) => {
              const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.info
              const Icon = cfg.icon
              return (
                <div
                  key={n.id}
                  className={`notif-item ${n.read ? 'notif-item-read' : 'notif-item-unread'}`}
                  onClick={() => markRead(n.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && markRead(n.id)}
                >
                  <div className={`notif-item-icon ${cfg.iconCls}`}>
                    <Icon size={16} />
                  </div>
                  <div className="notif-item-body">
                    <div className="notif-item-top">
                      <span className={`notif-type-pill ${cfg.pillCls}`}>{cfg.label}</span>
                      <span className="notif-time">{timeAgo(n.timestamp)}</span>
                    </div>
                    {n.title && <p className="notif-item-title">{n.title}</p>}
                    <p className="notif-item-msg">{n.message}</p>
                  </div>
                  {!n.read && <span className="notif-unread-dot" aria-label="Unread" />}
                </div>
              )
            })
          )}
        </div>
      </aside>
    </>
  )
}
