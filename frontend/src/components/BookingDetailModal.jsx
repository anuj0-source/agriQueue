import React, { useState, Component } from 'react'
import {
  X, Calendar, Clock, MapPin, Ticket, CheckCircle2, AlertCircle,
  ExternalLink, Printer, Scale, IndianRupee, Building2, Loader2,
} from 'lucide-react'
import CropIcon from './CropIcon'

/* ── Error boundary ─────────────────────────────────────────────────────── */
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false } }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(e, i) { console.error('BookingDetailModal:', e, i) }
  render() {
    if (this.state.hasError) return (
      <div style={{ padding: 20, background: '#fee2e2', color: '#991b1b', borderRadius: 8 }}>
        <h2>Something went wrong.</h2>
        <button onClick={this.props.onClose} style={{ marginTop: 10, padding: '8px 16px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Close</button>
      </div>
    )
    return this.props.children
  }
}

/* ── Crop photo map ─────────────────────────────────────────────────────── */
const CROP_PHOTOS = {
  rice: '/crops/rice.jpg', paddy: '/crops/rice.jpg', dhan: '/crops/rice.jpg',
  wheat: '/crops/wheat.jpg', gehu: '/crops/wheat.jpg',
  corn: '/crops/corn.jpg', maize: '/crops/corn.jpg', makka: '/crops/corn.jpg',
  cotton: '/crops/cotton.jpg', kapas: '/crops/cotton.jpg',
}
function getCropPhoto(name = '') {
  const lower = (name || '').toLowerCase()
  for (const [k, v] of Object.entries(CROP_PHOTOS)) if (lower.includes(k)) return v
  return null
}

/* ── Status config ─────────────────────────────────────────────────────── */
const STATUS_CFG = {
  confirmed: { bg: '#d97706', text: '#fff' },
  waiting:   { bg: '#d97706', text: '#fff' },
  serving:   { bg: '#2563eb', text: '#fff' },
  completed: { bg: '#16a34a', text: '#fff' },
  cancelled: { bg: '#dc2626', text: '#fff' },
}
function getStatusStyle(s = '') {
  return STATUS_CFG[(s || '').toLowerCase()] || { bg: '#64748b', text: '#fff' }
}

/* ── Info cell ─────────────────────────────────────────────────────────── */
function InfoCell({ icon, label, value, sub, accent }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: '14px 16px',
      background: '#f8fafc',
      border: '1.5px solid #e2e8f0',
      borderRadius: 14,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: 'linear-gradient(135deg,#d1fae5,#a7f3d0)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#16a34a',
      }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: accent || '#0f172a', lineHeight: 1.2 }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  )
}

/* ── Main Modal ────────────────────────────────────────────────────────── */
export default function BookingDetailModal({ isOpen, booking, onClose }) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  if (!isOpen || !booking) return null

  const tokenNumber   = booking.token || booking.formatted_token || `A-${booking.token_number || '001'}`
  const centerTitle   = booking.center || booking.center_name || 'Procurement Center'
  const centerAddr    = booking.center_address || booking.fullCenter || 'Local District Center'
  const bookingDate   = booking.date || booking.formatted_date || 'Scheduled Date'
  const bookingTime   = booking.time || booking.slot_time || '10:00 AM – 11:00 AM'
  const quantity      = booking.quantity_kg ? `${Number(booking.quantity_kg).toLocaleString()} kg` : '—'
  const produceGrade  = booking.produce_type || 'Standard Grade'
  const status        = booking.status || 'Confirmed'
  const referenceId   = booking.id ? (String(booking.id).startsWith('#') ? booking.id : `#${booking.id}`) : '#UB-001'
  const totalPrice    = booking.total_price
    ? `₹${Number(booking.total_price).toLocaleString()}`
    : booking.amount
    ? (String(booking.amount).startsWith('₹') ? booking.amount : `₹${booking.amount}`)
    : 'Est. at center'
  const estimatedWait = booking.estimated_wait_time ? `${booking.estimated_wait_time} min wait` : null

  const cropPhoto  = getCropPhoto(booking.produce)
  const statusStyle = getStatusStyle(status)
  const isFinal = status === 'Cancelled' || status === 'Completed'

  const handleCancelConfirm = async () => {
    setIsCancelling(true)
    try {
      const { cancelBooking } = await import('../api')
      await cancelBooking(booking.raw_id || String(booking.id).replace('UB-', ''))
      setShowConfirm(false)
      if (onClose) onClose(true)
    } catch (err) {
      alert(err.message || 'Failed to cancel booking')
      setShowConfirm(false)
    } finally { setIsCancelling(false) }
  }

  return (
    <ErrorBoundary onClose={onClose}>
      {/* ── Backdrop ── */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 9000,
          background: 'rgba(15,23,42,0.6)',
          backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px',
          animation: 'fadeIn 0.18s ease',
        }}
      >
        {/* ── Modal card ── */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: '#fff', borderRadius: 24,
            width: '100%', maxWidth: 480,
            maxHeight: '92vh', overflowY: 'auto',
            boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
            position: 'relative',
            animation: 'slideUp 0.22s ease',
          }}
        >
          {/* ── Cancel confirmation overlay ── */}
          {showConfirm && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 10,
              background: 'rgba(255,255,255,0.96)',
              backdropFilter: 'blur(4px)',
              borderRadius: 24,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 32, flexDirection: 'column', gap: 16, textAlign: 'center',
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <AlertCircle size={32} color="#dc2626" />
              </div>
              <div>
                <h3 style={{ margin: '0 0 8px', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>Cancel this booking?</h3>
                <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>This action cannot be undone. Your slot will be released.</p>
              </div>
              <div style={{ display: 'flex', gap: 12, width: '100%' }}>
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={isCancelling}
                  style={{
                    flex: 1, padding: '12px', borderRadius: 12, border: '1.5px solid #e2e8f0',
                    background: '#fff', color: '#374151', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                  }}
                >
                  Keep it
                </button>
                <button
                  onClick={handleCancelConfirm}
                  disabled={isCancelling}
                  style={{
                    flex: 1, padding: '12px', borderRadius: 12, border: 'none',
                    background: 'linear-gradient(135deg,#dc2626,#b91c1c)',
                    color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  {isCancelling ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Yes, Cancel'}
                </button>
              </div>
            </div>
          )}

          {/* ── Hero banner: crop photo ── */}
          <div style={{ position: 'relative', height: 185, borderRadius: '24px 24px 0 0', overflow: 'hidden', flexShrink: 0 }}>
            {/* Crop photo via global CropIcon — consistent with all other pages */}
            <CropIcon
              name={booking.produce}
              size={480}
              wrapperStyle={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%',
                borderRadius: 0, display: 'block',
              }}
            />

            {/* Dark gradient overlay */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.65) 100%)',
            }} />

            {/* Close button */}
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                position: 'absolute', top: 14, right: 14,
                width: 34, height: 34, borderRadius: '50%',
                background: 'rgba(0,0,0,0.35)', border: 'none',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', backdropFilter: 'blur(4px)',
              }}
            >
              <X size={16} />
            </button>

            {/* Reference tag (top-left) */}
            <div style={{
              position: 'absolute', top: 14, left: 14,
              background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)',
              borderRadius: 8, padding: '4px 10px',
              fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: 0.5,
            }}>
              {referenceId}
            </div>

            {/* Token number (centered bottom) */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              padding: '16px 20px 18px',
              display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.75)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 }}>
                  Digital Queue Token
                </div>
                <div style={{ fontSize: 36, fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: -1 }}>
                  {tokenNumber}
                </div>
                {estimatedWait && status !== 'Cancelled' && status !== 'Completed' && (
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 4 }}>
                    ⏱ {estimatedWait}
                  </div>
                )}
              </div>

              {/* Status pill */}
              <div style={{
                background: statusStyle.bg,
                color: statusStyle.text,
                padding: '6px 14px', borderRadius: 20,
                fontSize: 12, fontWeight: 800, letterSpacing: 0.5,
                textTransform: 'uppercase',
                boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
              }}>
                {status}
              </div>
            </div>
          </div>

          {/* ── Card body ── */}
          <div style={{ padding: '20px 20px 24px' }}>

            {/* Crop name + grade */}
            <div style={{ marginBottom: 18 }}>
              <h2 style={{ margin: '0 0 4px', fontSize: '1.5rem', fontWeight: 900, color: '#0f172a' }}>
                {booking.produce}
              </h2>
              <span style={{
                display: 'inline-block', fontSize: 12, fontWeight: 600,
                background: '#f0fdf4', color: '#16a34a',
                border: '1px solid #bbf7d0', borderRadius: 8, padding: '2px 10px',
              }}>
                {produceGrade}
              </span>
            </div>

            {/* 2×2 info grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <InfoCell
                icon={<Scale size={17} />}
                label="Quantity"
                value={quantity}
                sub="Measured on arrival"
              />
              <InfoCell
                icon={<IndianRupee size={17} />}
                label="Est. Value"
                value={totalPrice}
                sub="via DBT transfer"
                accent="#16a34a"
              />
              <InfoCell
                icon={<Calendar size={17} />}
                label="Date"
                value={bookingDate}
              />
              <InfoCell
                icon={<Clock size={17} />}
                label="Slot Time"
                value={bookingTime}
              />
            </div>

            {/* Procurement center (full-width) */}
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '14px 16px', marginBottom: 14,
              background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 14,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: 'linear-gradient(135deg,#dbeafe,#bfdbfe)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#2563eb',
              }}>
                <Building2 size={17} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 }}>Procurement Center</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{centerTitle}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MapPin size={11} style={{ color: '#16a34a', flexShrink: 0 }} />
                  {centerAddr}
                </div>
              </div>
            </div>

            {/* Notice */}
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              background: '#f0fdf4', border: '1.5px solid #bbf7d0',
              borderRadius: 12, padding: '12px 14px', marginBottom: 20,
              color: '#15803d', fontSize: 13, fontWeight: 500,
            }}>
              <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 1, color: '#16a34a' }} />
              <span>Please arrive at the center <strong>15 minutes before</strong> your time slot with your <strong>Farmer ID</strong> and vehicle registration.</span>
            </div>

            {/* Footer actions */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {/* Left actions */}
              <button
                onClick={() => window.print()}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '11px 18px', borderRadius: 12,
                  border: '1.5px solid #e2e8f0', background: '#fff',
                  color: '#374151', fontWeight: 600, fontSize: 13.5,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                <Printer size={15} /> Print Slip
              </button>

              {!isFinal && status !== 'Serving' && (
                <button
                  onClick={() => setShowConfirm(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '11px 18px', borderRadius: 12,
                    border: '1.5px solid #fecaca', background: '#fff',
                    color: '#dc2626', fontWeight: 600, fontSize: 13.5, cursor: 'pointer',
                  }}
                >
                  Cancel Booking
                </button>
              )}

              {/* Spacer */}
              <div style={{ flex: 1 }} />

              {/* Track Live Queue */}
              <a
                href={`/live-queue?center_id=${booking.procurement_center_id || ''}`}
                onClick={() => booking.procurement_center_id && localStorage.setItem('lastBookingCenterId', String(booking.procurement_center_id))}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '11px 20px', borderRadius: 12,
                  background: 'linear-gradient(135deg,#16a34a,#15803d)',
                  color: '#fff', fontWeight: 700, fontSize: 13.5,
                  textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(22,163,74,0.35)',
                  transition: 'opacity 0.2s',
                }}
              >
                Track Live Queue <ExternalLink size={14} />
              </a>

              {/* Close */}
              <button
                onClick={() => onClose()}
                style={{
                  padding: '11px 18px', borderRadius: 12,
                  border: 'none', background: 'transparent',
                  color: '#64748b', fontWeight: 600, fontSize: 13.5, cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity: 0 }           to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(24px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        @keyframes spin    { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>
    </ErrorBoundary>
  )
}
