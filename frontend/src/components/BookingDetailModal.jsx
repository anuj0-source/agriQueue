import React from 'react'
import {
  X,
  Wheat,
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
} from 'lucide-react'

export default function BookingDetailModal({ isOpen, booking, onClose }) {
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

  return (
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
      >
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
                  : 'confirmed'
              }`}
            >
              {status}
            </span>
            <span className="token-wait-text">Est. wait: {estimatedWait}</span>
          </div>
        </div>

        {/* Details Grid */}
        <div className="booking-modal-details-grid">
          {/* Produce & Grade */}
          <div className="booking-detail-item">
            <div className="detail-item-icon">
              <Wheat size={18} />
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
          <button
            type="button"
            className="booking-modal-btn outline print-btn"
            onClick={handlePrint}
          >
            <Printer size={15} />
            <span>Print Slip</span>
          </button>
          <div className="footer-action-right">
            <a href="/live-queue" className="booking-modal-btn primary">
              <span>Track Live Queue</span>
              <ExternalLink size={15} />
            </a>
            <button
              type="button"
              className="booking-modal-btn ghost"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
