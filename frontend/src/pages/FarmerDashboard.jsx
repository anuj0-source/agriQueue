import { Wheat } from 'lucide-react'
import FarmerLayout from '../components/FarmerLayout'
import {
  DASHBOARD_METRICS,
  FARMER_PROFILE,
  UPCOMING_BOOKING,
} from '../data/farmer-data'

export default function FarmerDashboard() {
  let farmerName = FARMER_PROFILE.name
  let farmerId = FARMER_PROFILE.farmerId

  try {
    const stored = localStorage.getItem('currentUser')
    if (stored) {
      const parsed = JSON.parse(stored)
      if (parsed.full_name) farmerName = parsed.full_name
      if (parsed.farmer_id) farmerId = parsed.farmer_id
    }
  } catch (err) {
    // Ignore JSON parse errors
  }

  return (
    <FarmerLayout activePath="/dashboard">
      <div className="dashboard-container">
        {/* Welcome Header */}
        <div className="dashboard-welcome-row">
          <div>
            <h1 className="dashboard-title">Welcome, {farmerName}</h1>
            <p className="dashboard-sub">Farmer ID: {farmerId}</p>
          </div>
        </div>

        {/* Top 3 Summary Metrics */}
        <div className="dashboard-metrics-grid">
          <div className="metric-card">
            <span className="metric-value">{DASHBOARD_METRICS.upcomingBookings}</span>
            <span className="metric-label">Upcoming Bookings</span>
          </div>

          <div className="metric-card">
            <span className="metric-value">{DASHBOARD_METRICS.totalProcurements}</span>
            <span className="metric-label">Total Procurements</span>
          </div>

          <div className="metric-card">
            <span className="metric-value">{DASHBOARD_METRICS.totalEarnings}</span>
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
            <h2 className="card-section-title">Upcoming Booking</h2>
            <a href="/my-bookings" className="card-link-muted">
              View All
            </a>
          </div>

          <div className="upcoming-booking-item">
            <div className="upcoming-item-left">
              <div className="crop-icon-badge">
                <Wheat size={22} />
              </div>
              <div className="upcoming-details">
                <span className="upcoming-crop-name">{UPCOMING_BOOKING.produce}</span>
                <span className="upcoming-center-name">{UPCOMING_BOOKING.center}</span>
              </div>
            </div>

            <div className="upcoming-timing">
              <span className="upcoming-date">{UPCOMING_BOOKING.date}</span>
              <span className="upcoming-time">{UPCOMING_BOOKING.time}</span>
            </div>

            <div className="upcoming-token-badge">
              <span className="token-code">{UPCOMING_BOOKING.token}</span>
              <span className="token-status-pill">{UPCOMING_BOOKING.status}</span>
            </div>
          </div>
        </div>
      </div>
    </FarmerLayout>
  )
}
