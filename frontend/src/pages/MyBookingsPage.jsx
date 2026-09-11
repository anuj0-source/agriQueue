import { useState, useEffect } from 'react'
import { Wheat, Calendar, Clock, MapPin } from 'lucide-react'
import FarmerLayout from '../components/FarmerLayout'
import BookingDetailModal from '../components/BookingDetailModal'
import { BookingsListSkeleton } from '../components/Skeletons'
import { ALL_BOOKINGS } from '../data/farmer-data'
import { getMyBookings } from '../api'

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedBooking, setSelectedBooking] = useState(null)

  useEffect(() => {
    async function loadBookings() {
      try {
        const data = await getMyBookings()
        if (data && data.length > 0) {
          const mapped = data.map((b) => ({
            ...b,
            id: `UB-${b.id}`,
            produce: b.produce,
            quantity_kg: b.quantity_kg,
            total_price: b.total_price,
            produce_type: b.produce_type,
            center_name: b.center_name,
            center_address: b.center_address,
            fullCenter: `${b.center_name || 'Center'}, ${b.center_address || ''}`,
            date: b.formatted_date || new Date(b.booked_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            time: b.slot_time || '10:00 - 11:00 AM',
            token: b.formatted_token || `A-${b.token_number}`,
            status: b.status,
            estimated_wait_time: b.estimated_wait_time,
          }))
          setBookings(mapped)
        }
      } catch (err) {
        // Fallback to sample bookings
      } finally {
        setLoading(false)
      }
    }
    loadBookings()
  }, [])

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

        {loading ? (
          <BookingsListSkeleton count={3} />
        ) : bookings.length === 0 ? (
          <div className="portal-card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
            <p style={{ marginBottom: '16px', fontSize: '1rem' }}>No active bookings found.</p>
            <a href="/book-slot" className="quick-btn primary">
              + Book a Slot Now
            </a>
          </div>
        ) : (
          <div className="bookings-list" style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
            {bookings.map((booking) => (
              <div
                key={booking.id}
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
                <div className="booking-card-main">
                  <div className="crop-icon-badge">
                    <Wheat size={24} strokeWidth={2.2} />
                  </div>
                  <div className="booking-crop-info">
                    <div className="booking-crop-top">
                      <span className="booking-crop-name">{booking.produce}</span>
                      <span className="booking-id-tag">#{booking.id}</span>
                    </div>
                    <div className="booking-center-info">
                      <MapPin size={14} className="booking-meta-icon" />
                      <span>{booking.fullCenter}</span>
                    </div>
                  </div>
                </div>

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

                <div className="booking-token-ticket">
                  <span className="token-ticket-label">Queue Token</span>
                  <span className="token-ticket-number">{booking.token}</span>
                  <div className="token-ticket-status">
                    <span className="token-status-dot" />
                    <span>{booking.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Booking Details Modal */}
      <BookingDetailModal
        isOpen={!!selectedBooking}
        booking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
      />
    </FarmerLayout>
  )
}
