import { useState } from 'react'
import {
  Building2,
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Search,
  Sprout,
} from 'lucide-react'
import FarmerLayout from '../components/FarmerLayout'
import Brand from '../components/Brand'
import { PROCUREMENT_CENTERS, TIME_SLOTS } from '../data/farmer-data'

export default function BookSlotPage() {
  const [step, setStep] = useState(1) // 1: Select Center, 2: Date & Time, 3: Confirm, 4: Success
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCenter, setSelectedCenter] = useState(PROCUREMENT_CENTERS[0])
  const [selectedDate, setSelectedDate] = useState(10) // 10 Sep 2025
  const [selectedSlot, setSelectedSlot] = useState(TIME_SLOTS[1]) // 10:00 - 11:00 AM
  const [selectedProduce, setSelectedProduce] = useState('Wheat')

  const filteredCenters = PROCUREMENT_CENTERS.filter((center) =>
    center.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    center.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    center.crops.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Calendar dates representation for Sep 2025
  // Sep 1, 2025 is Monday
  const calendarDays = [
    { day: null }, // Su
    { day: 1 },
    { day: 2 },
    { day: 3 },
    { day: 4 },
    { day: 5 },
    { day: 6 },
    { day: 7 },
    { day: 8 },
    { day: 9 },
    { day: 10, hasSlots: true, slotsCount: 10 },
    { day: 11, hasSlots: true, slotsCount: 10 },
    { day: 12, hasSlots: true, slotsCount: 10 },
    { day: 13 },
    { day: 14 },
    { day: 15 },
    { day: 16 },
    { day: 17, hasSlots: true, slotsCount: 20 },
    { day: 18, hasSlots: true, slotsCount: 10 },
    { day: 19, hasSlots: true, slotsCount: 20 },
    { day: 20 },
    { day: 21 },
    { day: 22 },
    { day: 23 },
    { day: 24 },
    { day: 25 },
    { day: 26 },
    { day: 27 },
    { day: 28 },
    { day: 29 },
    { day: 30 },
  ]

  return (
    <FarmerLayout activePath="/book-slot">
      <div className="book-slot-container">
        {step < 4 && (
          <>
            <h1 className="page-main-heading">
              {step === 3 ? 'Confirm Your Booking' : 'Book a Slot'}
            </h1>

            {/* Stepper Header */}
            <div className="stepper-bar" role="progressbar" aria-label="Booking steps">
              <div className={`step-item ${step >= 1 ? 'active' : ''} ${step > 1 ? 'done' : ''}`}>
                <span className="step-circle">{step > 1 ? <Check size={14} /> : '1'}</span>
                <span className="step-label">Select Center</span>
              </div>
              <div className={`step-connector ${step > 1 ? 'done' : ''}`} />

              <div className={`step-item ${step >= 2 ? 'active' : ''} ${step > 2 ? 'done' : ''}`}>
                <span className="step-circle">{step > 2 ? <Check size={14} /> : '2'}</span>
                <span className="step-label">Choose Date &amp; Time</span>
              </div>
              <div className={`step-connector ${step > 2 ? 'done' : ''}`} />

              <div className={`step-item ${step >= 3 ? 'active' : ''}`}>
                <span className="step-circle">3</span>
                <span className="step-label">Confirm</span>
              </div>
            </div>
          </>
        )}

        {/* ─── STEP 1: Select Center ─── */}
        {step === 1 && (
          <div className="step-content step-1-select-center">
            {/* Search Bar */}
            <div className="center-search-bar">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Search by district, city or center name"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Centers List */}
            <div className="centers-list">
              {filteredCenters.map((center) => (
                <div key={center.id} className="center-card">
                  <img
                    src={center.image}
                    alt={center.name}
                    className="center-thumbnail"
                  />
                  <div className="center-info">
                    <h3 className="center-name">{center.name}</h3>
                    <p className="center-location">{center.location}</p>
                    <p className="center-crops">{center.crops}</p>
                  </div>
                  <div className="center-action-col">
                    <span className="slots-badge">{center.availableSlots} slots available</span>
                    <button
                      type="button"
                      className="select-center-btn"
                      onClick={() => {
                        setSelectedCenter(center)
                        setStep(2)
                      }}
                    >
                      Select
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── STEP 2: Choose Date & Time ─── */}
        {step === 2 && (
          <div className="step-content step-2-datetime">
            {/* Selected Center Summary Pill */}
            <div className="selected-center-summary">
              <img
                src={selectedCenter.image}
                alt=""
                className="selected-center-thumb"
              />
              <div className="selected-center-text">
                <span className="selected-center-label">Selected Center</span>
                <strong className="selected-center-title">{selectedCenter.name}</strong>
                <span className="selected-center-sub">{selectedCenter.address}</span>
              </div>
            </div>

            {/* Dual Column: Calendar & Slots */}
            <div className="datetime-dual-grid">
              {/* Left: Month Calendar */}
              <div className="portal-card calendar-card">
                <div className="calendar-month-header">
                  <button type="button" className="cal-nav-btn" aria-label="Previous month">
                    <ChevronLeft size={18} />
                  </button>
                  <span className="cal-month-title">September 2025</span>
                  <button type="button" className="cal-nav-btn" aria-label="Next month">
                    <ChevronRight size={18} />
                  </button>
                </div>

                <div className="calendar-weekdays">
                  <span>Su</span>
                  <span>Mo</span>
                  <span>Tu</span>
                  <span>We</span>
                  <span>Th</span>
                  <span>Fr</span>
                  <span>Sa</span>
                </div>

                <div className="calendar-days-grid">
                  {calendarDays.map((item, idx) => {
                    if (!item.day) {
                      return <div key={`empty-${idx}`} className="cal-day empty" />
                    }
                    const isSelected = selectedDate === item.day
                    return (
                      <button
                        key={item.day}
                        type="button"
                        className={`cal-day ${isSelected ? 'selected' : ''} ${item.hasSlots ? 'has-slots' : ''}`}
                        onClick={() => setSelectedDate(item.day)}
                      >
                        <span className="day-number">{item.day}</span>
                        {item.hasSlots && !isSelected && (
                          <span className="day-slots-hint">{item.slotsCount}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Right: Available Slots */}
              <div className="portal-card slots-card">
                <div className="slots-header">
                  <h3 className="slots-title">Available Slots</h3>
                  <span className="slots-selected-date">Wednesday, {selectedDate} Sep 2025</span>
                </div>

                <div className="slots-list">
                  {TIME_SLOTS.map((slot) => {
                    const isSelected = selectedSlot.id === slot.id
                    const isFull = slot.status === 'full'

                    return (
                      <div
                        key={slot.id}
                        className={`slot-item ${isSelected ? 'selected' : ''} ${isFull ? 'full' : ''}`}
                        onClick={() => {
                          if (!isFull) setSelectedSlot(slot)
                        }}
                      >
                        <div className="slot-radio-wrap">
                          <span className={`slot-radio ${isSelected ? 'checked' : ''}`} />
                          <span className="slot-time-text">{slot.time}</span>
                        </div>
                        <span className={`slot-availability-pill ${isFull ? 'pill-full' : 'pill-available'}`}>
                          {isFull ? 'Full' : `${slot.available} slots`}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="step-actions-footer">
              <button
                type="button"
                className="step-btn outline"
                onClick={() => setStep(1)}
              >
                Back
              </button>
              <button
                type="button"
                className="step-btn primary"
                onClick={() => setStep(3)}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 3: Confirm Booking ─── */}
        {step === 3 && (
          <div className="step-content step-3-confirm">
            <div className="portal-card confirmation-details-card">
              <div className="confirm-row">
                <div className="confirm-icon-wrap">
                  <Building2 size={20} />
                </div>
                <div className="confirm-row-body">
                  <span className="confirm-label">Center</span>
                  <strong className="confirm-val-main">{selectedCenter.name}</strong>
                  <span className="confirm-val-sub">{selectedCenter.address}</span>
                </div>
              </div>

              <div className="confirm-row">
                <div className="confirm-icon-wrap">
                  <CalendarIcon size={20} />
                </div>
                <div className="confirm-row-body">
                  <span className="confirm-label">Date</span>
                  <strong className="confirm-val-main">{selectedDate} September 2025</strong>
                </div>
              </div>

              <div className="confirm-row">
                <div className="confirm-icon-wrap">
                  <Clock size={20} />
                </div>
                <div className="confirm-row-body">
                  <span className="confirm-label">Time</span>
                  <strong className="confirm-val-main">{selectedSlot.time}</strong>
                </div>
              </div>

              <div className="confirm-row">
                <div className="confirm-icon-wrap">
                  <Sprout size={20} />
                </div>
                <div className="confirm-row-body">
                  <span className="confirm-label">Produce</span>
                  <select
                    className="produce-select"
                    value={selectedProduce}
                    onChange={(e) => setSelectedProduce(e.target.value)}
                  >
                    <option value="Wheat">Wheat</option>
                    <option value="Rice">Rice</option>
                    <option value="Maize">Maize</option>
                  </select>
                </div>
              </div>

              {/* Note Banner */}
              <div className="confirm-info-banner">
                <CheckCircle2 size={18} className="info-icon" />
                <span>Token will be generated after confirmation.</span>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="step-actions-footer">
              <button
                type="button"
                className="step-btn outline"
                onClick={() => setStep(2)}
              >
                Back
              </button>
              <button
                type="button"
                className="step-btn primary"
                onClick={() => setStep(4)}
              >
                Confirm Booking
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 4 (Screen 8): Booking Success ─── */}
        {step === 4 && (
          <div className="step-content step-4-success">
            <div className="portal-card success-card">
              <div className="success-brand-row">
                <Brand />
              </div>

              {/* Celebration check icon */}
              <div className="success-check-badge">
                <CheckCircle2 size={48} />
              </div>

              <h2 className="success-title">Booking Confirmed!</h2>
              <p className="success-sub">Your token number is</p>

              {/* Token Display Pill */}
              <div className="success-token-box">
                <span className="success-token-code">A-042</span>
              </div>

              {/* Specs Summary List */}
              <div className="success-specs-list">
                <div className="spec-item">
                  <Building2 size={16} className="spec-icon" />
                  <span className="spec-text">{selectedCenter.name}</span>
                </div>
                <div className="spec-item">
                  <CalendarIcon size={16} className="spec-icon" />
                  <span className="spec-text">{selectedDate} September 2025</span>
                </div>
                <div className="spec-item">
                  <Clock size={16} className="spec-icon" />
                  <span className="spec-text">{selectedSlot.time}</span>
                </div>
                <div className="spec-item">
                  <Sprout size={16} className="spec-icon" />
                  <span className="spec-text">{selectedProduce}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="success-actions-row">
                <a href="/dashboard" className="success-btn primary">
                  Go to Dashboard
                </a>
                <a href="/live-queue" className="success-btn outline">
                  View Live Queue
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </FarmerLayout>
  )
}
