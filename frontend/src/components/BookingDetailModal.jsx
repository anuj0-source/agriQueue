import React, { useState, Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("BookingDetailModal Crash:", error, errorInfo);
    this.setState({ errorInfo });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', background: '#fee2e2', color: '#991b1b', border: '2px solid #ef4444', borderRadius: '8px', zIndex: 99999, position: 'fixed', top: '10%', left: '10%', width: '80%', maxHeight: '80vh', overflow: 'auto' }}>
          <h2>Something went wrong in BookingDetailModal.</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            <summary>Click for error details</summary>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
          <button onClick={this.props.onClose} style={{ marginTop: '10px', padding: '8px 16px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Close</button>
        </div>
      );
    }
    return this.props.children;
  }
}

import {
  X,
  Calendar,
  Clock,
  MapPin,
  Ticket,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Printer,
  Scale,
  IndianRupee,
  Building2,
  Loader2,
} from 'lucide-react'
import CropIcon from './CropIcon'

export default function BookingDetailModal({ isOpen, booking, onClose }) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  if (!isOpen || !booking) return null

  const tokenNumber = booking.token || booking.formatted_token || `A-${booking.token_number || '001'}`
  const centerTitle = booking.center || booking.center_name || 'Procurement Center'
  const centerLocation = booking.center_address || booking.fullCenter || 'Local District Center'
  const bookingDate = booking.date || booking.formatted_date || 'Scheduled Date'
  const bookingTime = booking.time || booking.slot_time || '10:00 AM - 11:00 AM'
  const quantity = booking.quantity_kg ? `${booking.quantity_kg.toLocaleString()} kg` : booking.quantity || '1,000 kg'
  const produceGrade = booking.produce_type || 'Standard Grade'
  const status = booking.status || 'Confirmed'
  const referenceId = booking.id ? (String(booking.id).startsWith('#') ? booking.id : `#${booking.id}`) : '#UB-001'

  const totalPriceDisplay = booking.total_price
    ? `₹${booking.total_price.toLocaleString()}`
    : booking.amount
    ? (String(booking.amount).startsWith('₹') ? booking.amount : `₹${booking.amount}`)
    : 'Estimated at Center'

  const estimatedWait = booking.estimated_wait_time ? `${booking.estimated_wait_time} mins` : booking.estimatedWait || '15 mins'

  const handlePrint = () => {
    window.print()
  }

  const handleCancelConfirm = async () => {
    setIsCancelling(true)
    try {
      const { cancelBooking } = await import('../api')
      const rawId = booking.raw_id || String(booking.id).replace('UB-', '')
      await cancelBooking(rawId)
      // Close confirm and modal with refresh=true
      setShowConfirm(false)
      if (onClose) onClose(true)
    } catch (err) {
      alert(err.message || 'Failed to cancel booking')
      setShowConfirm(false)
    } finally {
      setIsCancelling(false)
    }
  }

  return (
    <ErrorBoundary onClose={onClose}>
    <div
      className="booking-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-modal-title"
      onClick={onClose}
    >
      <div
        className="booking-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ position: 'relative' }}
      >
        {/* Custom Confirmation Overlay */}
        {showConfirm && (
          <div className="custom-confirm-overlay">
            <div className="custom-confirm-box">
              <div className="custom-confirm-icon-wrap">
                <AlertCircle size={32} />
              </div>
              <h3>Cancel this booking?</h3>
              <p>This action cannot be undone. Are you sure you want to cancel your slot?</p>
              <div className="custom-confirm-actions">
                <button
                  className="booking-modal-btn outline"
                  onClick={() => setShowConfirm(false)}
                  disabled={isCancelling}
                >
                  No, Keep it
                </button>
                <button
                  className="booking-modal-btn primary"
                  style={{ background: '#dc2626', boxShadow: '0 4px 14px rgba(220, 38, 38, 0.28)' }}
                  onClick={handleCancelConfirm}
                  disabled={isCancelling}
                >
                  {isCancelling ? <Loader2 size={16} className="spin-icon" /> : 'Yes, Cancel Booking'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Header */}
        <div className="booking-modal-header">
          <div className="booking-modal-header-left">
            <span className="booking-modal-tag">{referenceId}</span>
            <h2 id="booking-modal-title" className="booking-modal-title">
              Booking Details
            </h2>
          </div>
          <button
            type="button"
            className="booking-modal-close-btn"
            onClick={onClose}
            aria-label="Close details"
          >
            <X size={18} />
          </button>
        </div>

        {/* Digital Queue Token Hero Strip */}
        <div className="booking-modal-token-banner">
          <div className="token-banner-left">
            <div className="token-banner-icon">
              <Ticket size={24} />
            </div>
            <div>
              <span className="token-banner-label">Digital Queue Token</span>
              <div className="token-banner-code">{tokenNumber}</div>
            </div>
          </div>
          <div className="token-banner-right">
            <span
              className={`status-pill ${
                status === 'Completed'
                  ? 'completed'
                  : status === 'Waiting'
                  ? 'waiting'
                  : status === 'Cancelled'
                  ? 'cancelled'
                  : 'confirmed'
              }`}
            >
              {status}
            </span>
            {status !== 'Cancelled' && status !== 'Completed' && (
              <span className="token-wait-text">Est. wait: {estimatedWait}</span>
            )}
          </div>
        </div>

        {/* Details Grid */}
        <div className="booking-modal-details-grid">
          {/* Produce & Grade */}
          <div className="booking-detail-item">
            <div className="detail-item-icon">
              <CropIcon name={booking.produce} size={18} />
            </div>
            <div className="detail-item-info">
              <span className="detail-item-label">Produce & Grade</span>
              <strong className="detail-item-value">{booking.produce}</strong>
              <span className="detail-item-sub">{produceGrade}</span>
            </div>
          </div>

          {/* Quantity */}
          <div className="booking-detail-item">
            <div className="detail-item-icon">
              <Scale size={18} />
            </div>
            <div className="detail-item-info">
              <span className="detail-item-label">Estimated Quantity</span>
              <strong className="detail-item-value">{quantity}</strong>
              <span className="detail-item-sub">Measured on arrival</span>
            </div>
          </div>

          {/* Estimated Earnings */}
          <div className="booking-detail-item">
            <div className="detail-item-icon">
              <IndianRupee size={18} />
            </div>
            <div className="detail-item-info">
              <span className="detail-item-label">Total Estimated Value</span>
              <strong className="detail-item-value detail-value-highlight">
                {totalPriceDisplay}
              </strong>
              <span className="detail-item-sub">Direct bank transfer via DBT</span>
            </div>
          </div>

          {/* Date & Time */}
          <div className="booking-detail-item">
            <div className="detail-item-icon">
              <Calendar size={18} />
            </div>
            <div className="detail-item-info">
              <span className="detail-item-label">Scheduled Date & Time</span>
              <strong className="detail-item-value">{bookingDate}</strong>
              <span className="detail-item-sub">{bookingTime}</span>
            </div>
          </div>

          {/* Center Name & Location (Full Width) */}
          <div className="booking-detail-item full-width">
            <div className="detail-item-icon">
              <Building2 size={18} />
            </div>
            <div className="detail-item-info">
              <span className="detail-item-label">Procurement Center</span>
              <strong className="detail-item-value">{centerTitle}</strong>
              <span className="detail-item-sub">{centerLocation}</span>
            </div>
          </div>
        </div>

        {/* Important Guidelines notice */}
        <div className="booking-modal-notice">
          <CheckCircle2 size={16} className="notice-icon" />
          <span>
            Please arrive at the center 15 minutes before your time slot with your Farmer ID and vehicle registration.
          </span>
        </div>

        {/* Modal Actions Footer */}
        <div className="booking-modal-footer">
          <div className="footer-action-left">
            <button
              type="button"
              className="booking-modal-btn outline print-btn"
              onClick={handlePrint}
            >
              <Printer size={15} />
              <span>Print Slip</span>
            </button>
            {status !== 'Completed' && status !== 'Cancelled' && status !== 'Serving' && (
              <button
                type="button"
                className="booking-modal-btn outline cancel-btn"
                style={{ borderColor: '#fecaca', color: '#dc2626', marginLeft: '8px' }}
                onClick={() => setShowConfirm(true)}
              >
                <span>Cancel Booking</span>
              </button>
            )}
          </div>
          <div className="footer-action-right">
            <a
              href={`/live-queue?center_id=${booking.procurement_center_id || ''}`}
              onClick={() => {
                if (booking.procurement_center_id) {
                  localStorage.setItem('lastBookingCenterId', String(booking.procurement_center_id))
                }
              }}
              className="booking-modal-btn primary"
            >
              <span>Track Live Queue</span>
              <ExternalLink size={15} />
            </a>
            <button
              type="button"
              className="booking-modal-btn ghost"
              onClick={() => onClose()}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
    </ErrorBoundary>
  )
}
