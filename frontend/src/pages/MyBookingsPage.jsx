import { Wheat } from 'lucide-react'
import FarmerLayout from '../components/FarmerLayout'
import { ALL_BOOKINGS } from '../data/farmer-data'

export default function MyBookingsPage() {
  return (
    <FarmerLayout activePath="/my-bookings">
      <div className="my-bookings-container">
        <div className="bookings-header-row">
          <div>
            <h1 className="page-main-heading">My Bookings</h1>
            <p className="page-sub-heading" style={{ margin: '4px 0 0' }}>
              Track and manage your upcoming procurement appointments
            </p>
          </div>
          <a href="/book-slot" className="quick-btn primary">
            + Book New Slot
          </a>
        </div>

        <div className="bookings-list">
          {ALL_BOOKINGS.map((booking) => (
            <div key={booking.id} className="portal-card bookings-card">
              <div className="upcoming-booking-item">
                <div className="upcoming-item-left">
                  <div className="crop-icon-badge">
                    <Wheat size={22} />
                  </div>
                  <div className="upcoming-details">
                    <span className="upcoming-crop-name">{booking.produce}</span>
                    <span className="upcoming-center-name">{booking.fullCenter}</span>
                  </div>
                </div>

                <div className="upcoming-timing">
                  <span className="upcoming-date">{booking.date}</span>
                  <span className="upcoming-time">{booking.time}</span>
                </div>

                <div className="upcoming-token-badge">
                  <span className="token-code">{booking.token}</span>
                  <span className="token-status-pill">{booking.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </FarmerLayout>
  )
}
