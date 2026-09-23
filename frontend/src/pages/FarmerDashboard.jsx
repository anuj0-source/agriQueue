import { useState, useEffect } from 'react'
import { Loader2, Calendar, Clock, MapPin, ArrowRight } from 'lucide-react'
import CropIcon from '../components/CropIcon'
import FarmerLayout from '../components/FarmerLayout'
import CommandBar from '../components/CommandBar'
import AuthModal from '../components/AuthModal'
import BookingDetailModal from '../components/BookingDetailModal'
import { DashboardSkeleton } from '../components/Skeletons'
import { getFarmerDashboard, registerPushNotifications } from '../api'
import {
  DASHBOARD_METRICS,
  FARMER_PROFILE,
  UPCOMING_BOOKING,
} from '../data/farmer-data'

export default function FarmerDashboard() {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('currentUser')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [authModalMessage, setAuthModalMessage] = useState('')

  useEffect(() => {
    let isMounted = true
    async function fetchDashboard() {
      try {
        const data = await getFarmerDashboard()
        if (isMounted && data.user) {
          setUser(data.user)
          setDashboardData(data)
          localStorage.setItem('currentUser', JSON.stringify(data.user))
        }
      } catch (err) {
        if (err.status === 401 || err.status === 403) {
          localStorage.removeItem('currentUser')
          if (isMounted) {
            setAuthModalMessage(
              err.message === 'Unauthorized'
                ? 'Your session has expired or you are not logged in. Please sign in to access your farmer dashboard.'
                : err.message || 'Please log in to continue.'
            )
            setShowAuthModal(true)
          }
          return
        }
        if (isMounted) {
          setError(err.message || 'Failed to load dashboard data')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchDashboard()

    return () => {
      isMounted = false
    }
  }, [])

  // Push notification setup
  useEffect(() => {
    if (user && (user.role === 'farmer' || !user.role)) {
      const timer = setTimeout(() => {
        registerPushNotifications()
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [user])

  const farmerName = user?.full_name || FARMER_PROFILE.name
  const farmerId = user?.farmer_id || 'N/A'
  const locationInfo = [user?.village, user?.district, user?.state].filter(Boolean).join(', ')

  return (
    <FarmerLayout activePath="/dashboard" user={user}>
      {/* Auth Required Popup Modal */}
      <AuthModal
        isOpen={showAuthModal}
        title="Authentication Required"
        message={authModalMessage}
        redirectDelay={3}
        onLogin={() => {
          window.location.href = '/login'
        }}
      />
      {loading && !dashboardData ? (
        <DashboardSkeleton />
      ) : (
        <div className="dashboard-container">
          {/* Welcome Header */}
          <div className="dashboard-welcome-row">
          <div>
            <h1 className="dashboard-title">Welcome, {farmerName}</h1>
            <p className="dashboard-sub">
              Farmer ID: {farmerId}
              {locationInfo && <span> &bull; {locationInfo}</span>}
            </p>
          </div>
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <Loader2 size={16} className="animate-spin" />
              <span>Updating data...</span>
            </div>
          )}
        </div>

        {/* AI Multilingual Voice & Text Command Bar */}
        <CommandBar role="farmer" />

        {/* Top 3 Summary Metrics */}
        <div className="dashboard-metrics-grid">
          <div className="metric-card">
            <span className="metric-value">
              {dashboardData?.metrics?.upcomingBookings ?? DASHBOARD_METRICS.upcomingBookings}
            </span>
            <span className="metric-label">Upcoming Bookings</span>
          </div>

          <div className="metric-card">
            <span className="metric-value">
              {dashboardData?.metrics?.totalProcurements ?? DASHBOARD_METRICS.totalProcurements}
            </span>
            <span className="metric-label">Total Procurements</span>
          </div>

          <div className="metric-card">
            <span className="metric-value">
              {dashboardData?.metrics?.totalEarnings ?? DASHBOARD_METRICS.totalEarnings}
            </span>
            <span className="metric-label">Total Earnings</span>
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="portal-card quick-actions-card">
          <h2 className="card-section-title">Quick Actions</h2>
          <div className="quick-actions-row">
            <a href="/book-slot" className="quick-btn primary">
              Book a Slot
            </a>
            <a href="/live-queue" className="quick-btn outline">
              View Live Queue
            </a>
            <a href="/payments" className="quick-btn outline">
              Check Payment
            </a>
          </div>
        </div>

        {/* Upcoming Booking Section */}
        <div className="portal-card upcoming-booking-section">
          <div className="upcoming-header-row">
            <div className="upcoming-header-title-group">
              <h2 className="card-section-title">Upcoming Booking</h2>
              <span className="upcoming-active-pill">
                {(dashboardData?.metrics?.upcomingBookings ?? 1) > 0
                  ? `${dashboardData?.metrics?.upcomingBookings ?? 1} Active Slot`
                  : 'No Active Slots'}
              </span>
            </div>
            <a href="/my-bookings" className="card-link-muted">
              <span>View All</span>
              <ArrowRight size={14} />
            </a>
          </div>

          {(dashboardData ? dashboardData.upcoming_booking : UPCOMING_BOOKING) ? (
            (() => {
              const booking = dashboardData ? dashboardData.upcoming_booking : UPCOMING_BOOKING
              return (
                <div
                  className="upcoming-booking-card"
                  onClick={() => setSelectedBooking(booking)}
                  title="Click to view booking details"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setSelectedBooking(booking)
                    }
                  }}
                >
                  {/* Left: Produce & Center */}
                  <div className="booking-card-main">
                    <div className="crop-icon-badge">
                      <CropIcon name={booking.produce} size={32} />
                    </div>
                    <div className="booking-crop-info">
                      <div className="booking-crop-top">
                        <span className="booking-crop-name">{booking.produce}</span>
                        <span className="booking-id-tag">#{booking.id}</span>
                      </div>
                      <div className="booking-center-info">
                        <MapPin size={14} className="booking-meta-icon" />
                        <span>{booking.center}</span>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Schedule Chips */}
                  <div className="booking-schedule-strip">
                    <div className="schedule-meta-chip">
                      <Calendar size={15} className="schedule-meta-icon" />
                      <span>{booking.date}</span>
                    </div>
                    <div className="schedule-meta-chip">
                      <Clock size={15} className="schedule-meta-icon" />
                      <span>{booking.time}</span>
                    </div>
                  </div>

                  {/* Right: Digital Queue Token Ticket */}
                  <div className="booking-token-ticket">
                    <span className="token-ticket-label">Queue Token</span>
                    <span className="token-ticket-number">{booking.token}</span>
                    <div className="token-ticket-status">
                      <span className="token-status-dot" />
                      <span>{booking.status}</span>
                    </div>
                  </div>
                </div>
              )
            })()
          ) : (
            <div style={{ textAlign: 'center', padding: '28px 16px', color: 'var(--muted)' }}>
              <p style={{ marginBottom: '14px', fontSize: '0.95rem' }}>You have no upcoming slot bookings.</p>
              <a href="/book-slot" className="quick-btn primary">
                + Book a Slot
              </a>
            </div>
          )}
        </div>
      </div>
    )}

    {/* Booking Details Modal */}
    <BookingDetailModal
      isOpen={!!selectedBooking}
      booking={selectedBooking}
      onClose={() => setSelectedBooking(null)}
    />
    </FarmerLayout>
  )
}
