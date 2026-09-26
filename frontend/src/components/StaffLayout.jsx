import { useState } from 'react'
import {
  LayoutDashboard,
  PackageCheck,
  CreditCard,
  UserRound,
  Bell,
  LogOut,
  Radio,
  Menu,
  X,
} from 'lucide-react'
import Brand from './Brand'
import NotificationPanel from './NotificationPanel'
import { useNotifications } from '../context/NotificationContext'
import { logoutFarmer } from '../api'
import UnauthorizedPage from '../pages/UnauthorizedPage'

const STAFF_NAV_ITEMS = [
  { label: 'Dashboard', path: '/staff', icon: LayoutDashboard },
  { label: 'Live Queue', path: '/staff/queue', icon: Radio },
  { label: 'Procurement', path: '/staff/procurement', icon: PackageCheck },
  { label: 'Payments', path: '/staff/payments', icon: CreditCard },
  { label: 'Profile', path: '/staff/profile', icon: UserRound },
]

export default function StaffLayout({
  activePath = '/staff',
  title = 'Staff Portal',
  children,
}) {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { unreadCount, openPanel } = useNotifications()

  const currentUser = (() => {
    try {
      const stored = localStorage.getItem('currentUser')
      return stored ? JSON.parse(stored) : null
    } catch { return null }
  })()

  if (!currentUser || currentUser?.role?.toLowerCase() !== 'staff') {
    return (
      <UnauthorizedPage
        status={currentUser ? 403 : 401}
        title={currentUser ? 'Access Restricted: Staff Required' : 'Unauthorized Access'}
        message={
          currentUser
            ? `Your current account (${currentUser.full_name || 'User'}) has the "${currentUser.role || 'farmer'}" role. Procurement Staff privileges are required to access this portal.`
            : 'You must be signed in with a procurement staff account to view the Staff Portal.'
        }
        requiredRole="Procurement Staff"
        currentUser={currentUser}
        path={window.location.pathname}
      />
    )
  }

  const staffName = currentUser?.full_name || 'Staff'
  const staffInitials = staffName
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  const staffMobile = currentUser?.mobile_number
    ? `+91 ${currentUser.mobile_number}`
    : 'Procurement Staff'

  const handleLogout = async () => {
    try {
      await logoutFarmer()
    } catch (_) {}
    finally {
      localStorage.removeItem('currentUser')
      window.location.href = '/login'
    }
  }

  return (
    <div className="admin-portal-wrapper">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="portal-mobile-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ─── Sidebar ─── */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`} aria-label="Staff Navigation">
        <div className="admin-sidebar-header">
          <Brand href="/staff" />
          <button
            type="button"
            className="portal-sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="admin-nav-list">
          {STAFF_NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive =
              activePath === item.path ||
              (item.path === '/staff' && activePath === '/staff/dashboard')

            return (
              <a
                key={item.path}
                href={item.path}
                className={`admin-nav-item ${isActive ? 'active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon size={18} className="admin-nav-icon" />
                <span className="admin-nav-label">{item.label}</span>
                {item.path === '/staff/queue' && (
                  <span className="portal-live-dot" aria-label="Live" />
                )}
              </a>
            )
          })}
        </nav>
      </aside>

      {/* ─── Main Content Area ─── */}
      <div className="admin-main-viewport">
        {/* Header */}
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <button
              type="button"
              className="portal-mobile-menu-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
            <h1 className="admin-topbar-title">{title}</h1>
          </div>

          <div className="admin-topbar-right">
            {/* Notification Bell */}
            <button
              type="button"
              className="admin-icon-btn notif-bell-btn"
              aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
              onClick={openPanel}
            >
              <Bell size={19} />
              {unreadCount > 0 && (
                <span className="portal-notification-badge" aria-hidden="true">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Staff Avatar */}
            <div className="admin-user-avatar-wrap">
              <button
                type="button"
                className="admin-avatar-pill"
                aria-label="Staff Profile Menu"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <span className="admin-avatar-circle">{staffInitials}</span>
                <span className="admin-avatar-name">{staffName}</span>
              </button>

              {showUserMenu && (
                <div className="admin-popover-dropdown user-dropdown">
                  <div className="popover-header user-header">
                    <strong>{staffName}</strong>
                    <span className="user-subtext">{staffMobile}</span>
                  </div>
                  <div className="popover-actions">
                    <a href="/staff/profile" className="popover-link-btn">
                      <UserRound size={15} />
                      <span>Profile</span>
                    </a>
                    <button type="button" onClick={handleLogout} className="popover-logout-btn">
                      <LogOut size={15} />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="admin-content-body">{children}</main>
      </div>

      {/* Notification Panel */}
      <NotificationPanel />
    </div>
  )
}
