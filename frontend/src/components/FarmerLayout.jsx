import { useState } from 'react'
import {
  Bell,
  BookmarkPlus,
  CalendarDays,
  CreditCard,
  History,
  LayoutDashboard,
  Menu,
  Radio,
  UserRound,
  X,
} from 'lucide-react'
import Brand from './Brand'
import { FARMER_PROFILE } from '../data/farmer-data'

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Book Slot', path: '/book-slot', icon: BookmarkPlus },
  { label: 'My Bookings', path: '/my-bookings', icon: CalendarDays },
  { label: 'Live Queue', path: '/live-queue', icon: Radio },
  { label: 'Procurement History', path: '/procurement-history', icon: History },
  { label: 'Payment Status', path: '/payments', icon: CreditCard },
  { label: 'Profile', path: '/profile', icon: UserRound },
]

export default function FarmerLayout({ activePath, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  let initials = FARMER_PROFILE.initials
  try {
    const stored = localStorage.getItem('currentUser')
    if (stored) {
      const u = JSON.parse(stored)
      if (u.full_name) {
        initials = u.full_name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .slice(0, 2)
          .toUpperCase()
      }
    }
  } catch (err) {
    // Ignore error
  }

  return (
    <div className="farmer-portal-layout">
      {/* ── Mobile Sidebar Overlay ── */}
      {sidebarOpen && (
        <div
          className="portal-mobile-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Left Sidebar ── */}
      <aside className={`portal-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="portal-sidebar-header">
          <Brand href="/dashboard" />
          <button
            type="button"
            className="portal-sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="portal-nav" aria-label="Farmer dashboard navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = activePath === item.path
            return (
              <a
                key={item.path}
                href={item.path}
                className={`portal-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon size={18} className="portal-nav-icon" />
                <span className="portal-nav-label">{item.label}</span>
                {item.path === '/live-queue' && (
                  <span className="portal-live-dot" aria-label="Live indicator" />
                )}
              </a>
            )
          })}
        </nav>
      </aside>

      {/* ── Main Workspace ── */}
      <div className="portal-main-area">
        {/* Top Header Bar */}
        <header className="portal-top-bar">
          <button
            type="button"
            className="portal-mobile-toggle"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>

          <div className="portal-top-right">
            <button type="button" className="portal-icon-button" aria-label="Notifications">
              <Bell size={19} />
              <span className="portal-notification-dot" />
            </button>

            <a href="/profile" className="portal-avatar-pill" aria-label="View profile">
              <span className="portal-avatar-circle">{initials}</span>
            </a>

          </div>
        </header>

        {/* Page View Content */}
        <main className="portal-content-body">{children}</main>
      </div>
    </div>
  )
}
