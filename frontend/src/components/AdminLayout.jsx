import { useState } from 'react'
import {
  LayoutDashboard,
  Building2,
  Users,
  Clock,
  PackageCheck,
  CreditCard,
  BarChart3,
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  X
} from 'lucide-react'
import Brand from './Brand'
import { logoutFarmer } from '../api'

const ADMIN_NAV_ITEMS = [
  { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
  { label: 'Centers', path: '/admin/centers', icon: Building2 },
  { label: 'Users', path: '/admin/users', icon: Users },
  { label: 'Slots', path: '/admin/slots', icon: Clock },
  { label: 'Procurements', path: '/admin/procurements', icon: PackageCheck },
  { label: 'Payments', path: '/admin/payments', icon: CreditCard },
]

export default function AdminLayout({
  activePath = '/admin',
  title = 'Admin Dashboard',
  timeframe = 'Last 30 Days',
  onTimeframeChange,
  showTimeframe = true,
  children,
}) {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Read real admin data from session
  const currentUser = (() => {
    try {
      const stored = localStorage.getItem('currentUser')
      return stored ? JSON.parse(stored) : null
    } catch { return null }
  })()

  const adminName = currentUser?.full_name || 'Admin'
  const adminInitials = adminName
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  const adminMobile = currentUser?.mobile_number
    ? `+91 ${currentUser.mobile_number}`
    : 'Administrator'

  const handleLogout = async () => {
    try {
      await logoutFarmer()
    } catch (_) {
      // proceed even if API fails
    } finally {
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
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`} aria-label="Admin Navigation">
        <div className="admin-sidebar-header">
          <Brand />
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
          {ADMIN_NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive =
              activePath === item.path ||
              (item.path === '/admin' && activePath === '/admin/dashboard')

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
              <Menu size={20} />
            </button>
            <h1 className="admin-topbar-title">{title}</h1>
          </div>

          <div className="admin-topbar-right">
            {/* Timeframe selector */}
            {showTimeframe && (
              <div className="admin-timeframe-dropdown-wrap">
                <select
                  className="admin-timeframe-select"
                  value={timeframe}
                  onChange={(e) => onTimeframeChange && onTimeframeChange(e.target.value)}
                  aria-label="Select Date Range"
                >
                  <option value="Today">Today</option>
                  <option value="Last 7 Days">Last 7 Days</option>
                  <option value="Last 30 Days">Last 30 Days</option>
                  <option value="This Year">This Year</option>
                </select>
                <ChevronDown size={14} className="admin-select-chevron" />
              </div>
            )}

            {/* Notification Bell */}
            <div className="admin-bell-wrap">
              <button
                type="button"
                className="admin-icon-btn"
                aria-label="View Notifications"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell size={19} />
                <span className="admin-notif-dot" />
              </button>

              {showNotifications && (
                <div className="admin-popover-dropdown notif-dropdown">
                  <div className="popover-header">
                    <strong>Admin Alerts</strong>
                    <span className="badge-chip">3 New</span>
                  </div>
                  <ul className="popover-list">
                    <li>
                      <strong>Center A Reached 90% Capacity</strong>
                      <span>10 minutes ago</span>
                    </li>
                    <li>
                      <strong>₹14.2 Lakh DBT Batch Disbursed</strong>
                      <span>1 hour ago</span>
                    </li>
                    <li>
                      <strong>15 New Farmers Registered</strong>
                      <span>Today, 09:30 AM</span>
                    </li>
                  </ul>
                </div>
              )}
            </div>

            {/* Admin Avatar */}
            <div className="admin-user-avatar-wrap">
              <button
                type="button"
                className="admin-avatar-pill"
                aria-label="Admin Profile Menu"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <span className="admin-avatar-circle">{adminInitials}</span>
                <span className="admin-avatar-name">{adminName}</span>
              </button>

              {showUserMenu && (
                <div className="admin-popover-dropdown user-dropdown">
                  <div className="popover-header user-header">
                    <strong>{adminName}</strong>
                    <span className="user-subtext">{adminMobile}</span>
                  </div>
                  <div className="popover-actions">
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
    </div>
  )
}
