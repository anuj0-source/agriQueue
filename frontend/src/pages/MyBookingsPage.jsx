import { useState, useEffect } from 'react'
import { Calendar, Clock, MapPin } from 'lucide-react'
import CropIcon from '../components/CropIcon'
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
            raw_id: b.id,
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
  const [filter, setFilter] = useState('All')

  const filteredBookings = bookings.filter((b) => {
    if (filter === 'All') return true
    if (filter === 'Confirmed') return b.status === 'Confirmed' || b.status === 'Waiting' || b.status === 'Serving'
    return b.status === filter
  })

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

        {/* Status Filters */}
        <div style={{ display: 'flex', gap: '8px', margin: '20px 0 16px', overflowX: 'auto', paddingBottom: '4px' }}>
          {['All', 'Confirmed', 'Completed', 'Cancelled'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: 'none',
                background: filter === tab ? 'var(--primary-light)' : '#f1f5f9',
                color: filter === tab ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: filter === tab ? '600' : '500',
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {loading ? (
          <BookingsListSkeleton count={3} />
        ) : filteredBookings.length === 0 ? (
          <div className="portal-card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
            <p style={{ marginBottom: '16px', fontSize: '1rem' }}>No {filter !== 'All' ? filter.toLowerCase() : ''} bookings found.</p>
            <a href="/book-slot" className="quick-btn primary">
              + Book a Slot Now
            </a>
          </div>
        ) : (
          <div className="bookings-list" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {filteredBookings.map((booking) => {
              // Determine dynamic status dot color
              let dotColor = '#94a3b8'; // Default grey
              const statLower = booking.status?.toLowerCase() || '';
              if (statLower === 'confirmed' || statLower === 'waiting') dotColor = '#eab308'; // Yellow
              else if (statLower === 'completed') dotColor = '#22c55e'; // Green
              else if (statLower === 'cancelled') dotColor = '#ef4444'; // Red
              else if (statLower === 'serving') dotColor = '#3b82f6'; // Blue

              return (
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
                    <CropIcon name={booking.produce} size={32} />
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
                  <div className="token-ticket-status" style={{ color: dotColor }}>
                    <span className="token-status-dot" style={{ backgroundColor: dotColor }} />
                    <span style={{ fontWeight: 600 }}>{booking.status}</span>
                  </div>
                </div>
              </div>
            )})}
          </div>
        )}
      </div>

      {/* Booking Details Modal */}
      <BookingDetailModal
        isOpen={!!selectedBooking}
        booking={selectedBooking}
        onClose={(refresh) => {
          setSelectedBooking(null)
          if (refresh === true) {
            setLoading(true)
            getMyBookings()
              .then(data => {
                if (data && data.length > 0) {
                  const mapped = data.map((b) => ({
                    ...b,
                    id: `UB-${b.id}`,
                    raw_id: b.id,
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
              })
              .catch(err => console.error(err))
              .finally(() => setLoading(false))
          }
        }}
      />
    </FarmerLayout>
  )
}
