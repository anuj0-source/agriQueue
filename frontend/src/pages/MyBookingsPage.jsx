import { useState, useEffect, useCallback } from 'react'
import { Calendar, Clock, MapPin, Search, Plus } from 'lucide-react'
import CropIcon from '../components/CropIcon'
import FarmerLayout from '../components/FarmerLayout'
import BookingDetailModal from '../components/BookingDetailModal'
import { BookingsListSkeleton } from '../components/Skeletons'
import { getMyBookings } from '../api'




const STATUS_CFG = {
  confirmed: { label: 'Confirmed', color: '#d97706', bg: '#fef3c7', dot: '#d97706' },
  waiting:   { label: 'Waiting',   color: '#d97706', bg: '#fef3c7', dot: '#d97706' },
  serving:   { label: 'Serving',   color: '#2563eb', bg: '#dbeafe', dot: '#2563eb' },
  completed: { label: 'Completed', color: '#16a34a', bg: '#dcfce7', dot: '#16a34a' },
  cancelled: { label: 'Cancelled', color: '#dc2626', bg: '#fee2e2', dot: '#dc2626' },
}

function getStatusCfg(status = '') {
  return STATUS_CFG[status.toLowerCase()] || { label: status, color: '#64748b', bg: '#f1f5f9', dot: '#94a3b8' }
}

/* ── Crop thumbnail ──────────────────────────────────────────────────────── */
function CropThumb({ name, size = 88 }) {
  const photo = getCropPhoto(name)
  const initial = (name || '?')[0].toUpperCase()

  if (photo) {
    return (
      <div style={{
        width: size, height: size, borderRadius: 14, overflow: 'hidden',
        flexShrink: 0, boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
      }}>
        <img
          src={photo}
          alt={name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
        />
        <div style={{
          display: 'none', width: '100%', height: '100%',
          background: 'linear-gradient(135deg,#d1fae5,#a7f3d0)',
          alignItems: 'center', justifyContent: 'center',
          fontSize: size * 0.4, fontWeight: 700, color: '#065f46',
        }}>{initial}</div>
      </div>
    )
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: 14, flexShrink: 0,
      background: 'linear-gradient(135deg,#d1fae5,#a7f3d0)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 700, color: '#065f46',
      boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
    }}>{initial}</div>
  )
}

/* ── Token ticket ────────────────────────────────────────────────────────── */
function TokenTicket({ token, status }) {
  const cfg = getStatusCfg(status)
  const statLower = (status || '').toLowerCase()
  const ticketBg =
    statLower === 'completed' ? 'linear-gradient(145deg,#166534,#16a34a)' :
    statLower === 'cancelled' ? 'linear-gradient(145deg,#7f1d1d,#dc2626)' :
    statLower === 'serving'   ? 'linear-gradient(145deg,#1e3a8a,#2563eb)' :
    'linear-gradient(145deg,#1c1c2e,#2d2d44)'

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minWidth: 90, padding: '10px 14px',
      background: ticketBg, borderRadius: 14, color: '#fff',
      position: 'relative', overflow: 'hidden', flexShrink: 0,
      boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
    }}>
      {/* Perforated left edge dots */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 6,
        display: 'flex', flexDirection: 'column', justifyContent: 'space-around',
        alignItems: 'center', padding: '6px 0',
      }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{
            width: 5, height: 5, borderRadius: '50%',
            background: 'rgba(255,255,255,0.25)',
          }} />
        ))}
      </div>
      <span style={{ fontSize: 8, fontWeight: 600, letterSpacing: 2, opacity: 0.7, textTransform: 'uppercase' }}>
        Queue Token
      </span>
      <span style={{ fontSize: 26, fontWeight: 900, letterSpacing: -0.5, lineHeight: 1.1, marginTop: 2 }}>
        {token}
      </span>
      {/* Dashed separator */}
      <div style={{
        width: '80%', borderTop: '1px dashed rgba(255,255,255,0.3)', margin: '6px 0 4px',
      }} />
      <span style={{
        fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase',
        background: `rgba(255,255,255,0.15)`, borderRadius: 20, padding: '2px 7px',
        color: '#fff',
      }}>
        {cfg.label}
      </span>
    </div>
  )
}

/* ── Booking Card ────────────────────────────────────────────────────────── */
function BookingCard({ booking, onClick }) {
  const cfg = getStatusCfg(booking.status)
  const [hovered, setHovered] = useState(false)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onClick()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'stretch', gap: 14,
        background: '#fff', borderRadius: 18,
        border: `1.5px solid ${hovered ? '#86efac' : '#e2e8f0'}`,
        padding: '14px 16px', cursor: 'pointer',
        boxShadow: hovered
          ? '0 8px 30px rgba(22,163,74,0.12)'
          : '0 2px 12px rgba(0,0,0,0.05)',
        transition: 'all 0.22s ease',
        transform: hovered ? 'translateY(-2px)' : 'none',
      }}
    >
      {/* Crop Photo — uses global CropIcon which serves real photos */}
      <div style={{
        width: 82, height: 82, borderRadius: 14, overflow: 'hidden',
        flexShrink: 0, boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
      }}>
        <CropIcon name={booking.produce} size={82} />
      </div>


      {/* Main info */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
        {/* Row 1: Name + Status badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a', lineHeight: 1.2 }}>
            {booking.produce}
          </span>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20,
            background: cfg.bg, color: cfg.color, letterSpacing: 0.5,
          }}>
            {cfg.label.toUpperCase()}
          </span>
        </div>

        {/* Row 2: Booking ID */}
        <span style={{
          fontSize: 12, fontWeight: 600, color: '#64748b',
          background: '#f1f5f9', borderRadius: 6, padding: '1px 7px',
          display: 'inline-block', width: 'fit-content',
        }}>
          #{booking.id}
        </span>

        {/* Row 3: Center */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4, color: '#475569' }}>
          <MapPin size={13} style={{ flexShrink: 0, marginTop: 2, color: '#16a34a' }} />
          <span style={{ fontSize: 12.5, lineHeight: 1.4 }}>{booking.fullCenter}</span>
        </div>

        {/* Row 4: Date + Time chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: '#f8fafc', border: '1px solid #e2e8f0',
            borderRadius: 8, padding: '3px 9px',
          }}>
            <Calendar size={12} style={{ color: '#16a34a' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{booking.date}</span>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: '#f8fafc', border: '1px solid #e2e8f0',
            borderRadius: 8, padding: '3px 9px',
          }}>
            <Clock size={12} style={{ color: '#16a34a' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{booking.time}</span>
          </div>
        </div>
      </div>

      {/* Token ticket */}
      <TokenTicket token={booking.token} status={booking.status} />
    </div>
  )
}

/* ── Filter Tab ──────────────────────────────────────────────────────────── */
function FilterTab({ label, active, count, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 18px', borderRadius: 24, border: 'none', cursor: 'pointer',
        background: active ? '#16a34a' : '#f1f5f9',
        color: active ? '#fff' : '#475569',
        fontWeight: active ? 700 : 500, fontSize: 13.5,
        transition: 'all 0.2s', whiteSpace: 'nowrap',
        boxShadow: active ? '0 4px 14px rgba(22,163,74,0.3)' : 'none',
        display: 'flex', alignItems: 'center', gap: 6,
      }}
    >
      {label}
      {count !== undefined && (
        <span style={{
          background: active ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
          color: active ? '#fff' : '#64748b',
          borderRadius: 12, padding: '0 6px', fontSize: 11, fontWeight: 700,
          minWidth: 20, textAlign: 'center',
        }}>{count}</span>
      )}
    </button>
  )
}

/* ── Map bookings from API ───────────────────────────────────────────────── */
function mapBooking(b) {
  return {
    ...b,
    id: `UB-${b.id}`,
    raw_id: b.id,
    fullCenter: `${b.center_name || 'Center'}, ${b.center_address || ''}`,
    date: b.formatted_date || new Date(b.booked_at).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    }),
    time: b.slot_time || 'Time not available',
    token: b.formatted_token || `A-${b.token_number}`,
  }
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [selectedBooking, setSelectedBooking] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getMyBookings()
      if (data?.length > 0) setBookings(data.map(mapBooking))
    } catch { /* silently fall through */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  /* counts per filter */
  const counts = {
    All: bookings.length,
    Confirmed: bookings.filter(b => ['confirmed','waiting','serving'].includes(b.status?.toLowerCase())).length,
    Completed: bookings.filter(b => b.status?.toLowerCase() === 'completed').length,
    Cancelled:  bookings.filter(b => b.status?.toLowerCase() === 'cancelled').length,
  }

  const filtered = bookings.filter(b => {
    const statLower = b.status?.toLowerCase() || ''
    const matchFilter =
      filter === 'All' ? true :
      filter === 'Confirmed' ? ['confirmed','waiting','serving'].includes(statLower) :
      statLower === filter.toLowerCase()
    const matchSearch = !search || b.produce?.toLowerCase().includes(search.toLowerCase()) ||
      b.fullCenter?.toLowerCase().includes(search.toLowerCase()) || b.id?.includes(search)
    return matchFilter && matchSearch
  })

  return (
    <FarmerLayout activePath="/my-bookings">
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '0 4px 40px' }}>

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          gap: 12, marginBottom: 20, flexWrap: 'wrap',
        }}>
          <div>
            <h1 style={{ fontSize: '1.7rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
              My Bookings
            </h1>
            <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>
              Track and manage your procurement appointments
            </p>
          </div>
          <a
            href="/book-slot"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'linear-gradient(135deg,#16a34a,#15803d)',
              color: '#fff', borderRadius: 12, padding: '10px 18px',
              fontWeight: 700, fontSize: 14, textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(22,163,74,0.35)',
              transition: 'opacity 0.2s',
            }}
          >
            <Plus size={16} /> Book New Slot
          </a>
        </div>

        {/* ── Search bar ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#fff', border: '1.5px solid #e2e8f0',
          borderRadius: 14, padding: '10px 14px', marginBottom: 14,
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}>
          <Search size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search by crop, center, or booking ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              border: 'none', outline: 'none', flex: 1, fontSize: 14,
              color: '#0f172a', background: 'transparent',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 18, lineHeight: 1, padding: 0 }}
            >×</button>
          )}
        </div>

        {/* ── Filter tabs ── */}
        <div style={{
          display: 'flex', gap: 8, marginBottom: 20,
          overflowX: 'auto', paddingBottom: 4,
        }}>
          {['All', 'Confirmed', 'Completed', 'Cancelled'].map(tab => (
            <FilterTab
              key={tab}
              label={tab}
              active={filter === tab}
              count={counts[tab]}
              onClick={() => setFilter(tab)}
            />
          ))}
        </div>

        {/* ── Content ── */}
        {loading ? (
          <BookingsListSkeleton count={3} />
        ) : filtered.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '56px 24px',
            background: '#fff', borderRadius: 20,
            border: '1.5px dashed #d1fae5',
            boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
          }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>🌾</div>
            <h2 style={{ fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
              No {filter !== 'All' ? filter.toLowerCase() + ' ' : ''}bookings found
            </h2>
            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 22 }}>
              {search ? 'Try a different search term.' : 'Book a slot at your nearest procurement center.'}
            </p>
            <a
              href="/book-slot"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'linear-gradient(135deg,#16a34a,#15803d)',
                color: '#fff', borderRadius: 12, padding: '11px 22px',
                fontWeight: 700, fontSize: 14, textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(22,163,74,0.35)',
              }}
            >
              <Plus size={16} /> Book a Slot Now
            </a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* results count */}
            <div style={{ fontSize: 12.5, color: '#94a3b8', fontWeight: 500, paddingLeft: 2 }}>
              Showing {filtered.length} of {bookings.length} bookings
            </div>

            {filtered.map(booking => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onClick={() => setSelectedBooking(booking)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Detail Modal ── */}
      <BookingDetailModal
        isOpen={!!selectedBooking}
        booking={selectedBooking}
        onClose={refresh => {
          setSelectedBooking(null)
          if (refresh === true) load()
        }}
      />
    </FarmerLayout>
  )
}
