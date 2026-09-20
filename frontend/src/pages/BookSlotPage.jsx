import { useState, useEffect } from 'react'
import {
  Building2,
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Scale,
  Search,
  Sprout,
} from 'lucide-react'
import FarmerLayout from '../components/FarmerLayout'
import Brand from '../components/Brand'
import AuthModal from '../components/AuthModal'
import { CenterCardsSkeleton } from '../components/Skeletons'
import { getProcurementCenters, getCenterSlots, createBooking } from '../api'
import { PROCUREMENT_CENTERS, TIME_SLOTS } from '../data/farmer-data'

export default function BookSlotPage() {
  const [step, setStep] = useState(1) // 1: Select Center, 2: Date & Time, 3: Confirm, 4: Success
  const [searchTerm, setSearchTerm] = useState('')
  const [centers, setCenters] = useState([])
  const [loadingCenters, setLoadingCenters] = useState(true)
  const [selectedCenter, setSelectedCenter] = useState(null)
  const [selectedDate, setSelectedDate] = useState(new Date().getDate())
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [slotsList, setSlotsList] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedProduce, setSelectedProduce] = useState('Wheat')
  const [quantityKg, setQuantityKg] = useState('1000')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmedBooking, setConfirmedBooking] = useState(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [bookingError, setBookingError] = useState('')

  useEffect(() => {
    async function loadCenters() {
      try {
        const data = await getProcurementCenters()
        if (data && data.length > 0) {
          // Merge with mock images for visuals
          const enriched = data.map((c, idx) => ({
            ...c,
            image: c.image || PROCUREMENT_CENTERS[idx % PROCUREMENT_CENTERS.length]?.image,
            location: `${c.village}, ${c.district} • ${c.state}`,
            crops: c.crops && c.crops.length > 0 ? c.crops.map(crop => crop.name).join(', ') : 'No produces listed',
            cropsList: c.crops || [],
            availableSlots: Math.max(0, (c.available_slots || c.daily_capacity || 0) / 100),
          }))
          setCenters(enriched)
          setSelectedCenter(enriched[0])
        }
      } catch (err) {
        console.warn('Using fallback centers:', err)
      } finally {
        setLoadingCenters(false)
      }
    }
    loadCenters()
  }, [])

  useEffect(() => {
    async function loadSlots() {
      if (!selectedCenter) return
      setLoadingSlots(true)
      try {
        const dateStr = new Date(currentYear, currentMonth, selectedDate, 12, 0, 0).toISOString()
        const slots = await getCenterSlots(selectedCenter.id, dateStr)
        setSlotsList(slots)
        if (slots.length > 0) {
          const firstAvailable = slots.find(s => s.status !== 'full')
          setSelectedSlot(firstAvailable || slots[0])
        } else {
          setSelectedSlot(null)
        }
      } catch (err) {
        console.error('Failed to load slots:', err)
        setSlotsList([])
        setSelectedSlot(null)
      } finally {
        setLoadingSlots(false)
      }
    }
    loadSlots()
  }, [selectedCenter, selectedDate])

  const filteredCenters = centers.filter((center) =>
    center.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (center.location && center.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (center.crops && center.crops.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // Dynamic Calendar for Current Month
  const today = new Date()
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()
  const todayDate = today.getDate()
  
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay()
  
  const calendarDays = []
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push({ day: null })
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({ day: i, hasSlots: true, slotsCount: 10 })
  }
  
  const monthName = today.toLocaleString('default', { month: 'long' })
  const monthTitle = `${monthName} ${currentYear}`

  return (
    <FarmerLayout activePath="/book-slot">
      <div className="book-slot-container">
        <AuthModal
          isOpen={showAuthModal}
          title="Authentication Required"
          message="Please log in to confirm your booking and generate your digital queue token."
          redirectDelay={3}
          onLogin={() => {
            window.location.href = '/login'
          }}
        />
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
            {loadingCenters ? (
              <CenterCardsSkeleton count={3} />
            ) : filteredCenters.length === 0 ? (
              <div className="portal-card" style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--muted)' }}>
                <p>No procurement centers found matching "{searchTerm}".</p>
              </div>
            ) : (
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
                      <span className="slots-badge">{center.availableSlots} quintals available today</span>
                      <button
                        type="button"
                        className="select-center-btn"
                        onClick={() => {
                          setSelectedCenter(center)
                          if (center.cropsList && center.cropsList.length > 0) {
                            setSelectedProduce(center.cropsList[0].name)
                          }
                          setStep(2)
                        }}
                      >
                        Select
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                  <span className="cal-month-title">{monthTitle}</span>
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
                    const isPastDate = item.day < todayDate
                    
                    return (
                      <button
                        key={item.day}
                        type="button"
                        className={`cal-day ${isSelected ? 'selected' : ''} ${item.hasSlots && !isPastDate ? 'has-slots' : ''} ${isPastDate ? 'disabled' : ''}`}
                        onClick={() => {
                          if (!isPastDate) setSelectedDate(item.day)
                        }}
                        disabled={isPastDate}
                        style={isPastDate ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                      >
                        <span className="day-number">{item.day}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Right: Available Slots */}
              <div className="portal-card slots-card">
                <div className="slots-header">
                  <h3 className="slots-title">Available Slots</h3>
                  <span className="slots-selected-date">{monthName} {selectedDate}, {currentYear}</span>
                </div>

                <div className="slots-list">
                  {loadingSlots ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Loading slots...</div>
                  ) : slotsList.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>No time slots configured.</div>
                  ) : (
                    slotsList.map((slot) => {
                      const isSelected = selectedSlot?.id === slot.id
                      let isFull = slot.status === 'full'
                      
                      let isPastSlot = false
                      if (selectedDate === todayDate) {
                        const timeParts = slot.time.split('-')[1].trim().match(/(\d+):(\d+)\s*(AM|PM)?/i)
                        if (timeParts) {
                          let hours = parseInt(timeParts[1], 10)
                          const isPM = timeParts[3] && timeParts[3].toUpperCase() === 'PM'
                          if (isPM && hours !== 12) hours += 12
                          if (!isPM && hours === 12) hours = 0
                          const slotTimeObj = new Date(currentYear, currentMonth, selectedDate, hours, parseInt(timeParts[2], 10))
                          if (slotTimeObj.getTime() < today.getTime()) {
                            isPastSlot = true
                            isFull = true // Treat past slots as full/disabled
                          }
                        }
                      }

                      return (
                        <div
                          key={slot.id}
                          className={`slot-item ${isSelected ? 'selected' : ''} ${isFull ? 'full' : ''}`}
                          onClick={() => {
                            if (!isFull) setSelectedSlot(slot)
                          }}
                          style={isPastSlot ? { opacity: 0.6 } : {}}
                        >
                          <div className="slot-radio-wrap">
                            <span className={`slot-radio ${isSelected ? 'checked' : ''}`} />
                            <span className="slot-time-text">{slot.time}</span>
                          </div>
                          <span className={`slot-availability-pill ${isFull ? 'pill-full' : 'pill-available'}`}>
                            {isPastSlot ? 'Expired' : (isFull ? 'Full' : `${slot.available} quintals`)}
                          </span>
                        </div>
                      )
                    })
                  )}
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
                disabled={!selectedSlot}
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
                  <strong className="confirm-val-main">{selectedDate} {monthName} {currentYear}</strong>
                </div>
              </div>

              <div className="confirm-row">
                <div className="confirm-icon-wrap">
                  <Clock size={20} />
                </div>
                <div className="confirm-row-body">
                  <span className="confirm-label">Time</span>
                  <strong className="confirm-val-main">{selectedSlot?.time}</strong>
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
                    {selectedCenter?.cropsList?.length > 0 ? (
                      selectedCenter.cropsList.map((crop) => (
                        <option key={crop.id} value={crop.name}>{crop.name}</option>
                      ))
                    ) : (
                      <option value="Wheat">Wheat</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="confirm-row">
                <div className="confirm-icon-wrap">
                  <Scale size={20} />
                </div>
                <div className="confirm-row-body" style={{ flex: 1 }}>
                  <span className="confirm-label">Quantity (kg)</span>
                  <div className="quantity-input-wrap">
                    <input
                      type="number"
                      min="1"
                      max="50000"
                      step="10"
                      className="quantity-number-input"
                      placeholder="e.g. 1000"
                      value={quantityKg}
                      onChange={(e) => setQuantityKg(e.target.value)}
                      required
                    />
                    <span className="quantity-unit-tag">kg</span>
                  </div>
                  <span className="confirm-val-sub" style={{ marginTop: '4px' }}>
                    {(() => {
                      const selectedCropObj = selectedCenter?.cropsList?.find(c => c.name === selectedProduce) || { price_per_kg: 20 }
                      const price = selectedCropObj.price_per_kg
                      const total = (Number(quantityKg) || 0) * price
                      return `Est. value: ₹${total.toLocaleString()} (at ₹${price}/kg MSP)`
                    })()}
                  </span>
                </div>
              </div>

              {/* Note Banner */}
              <div className="confirm-info-banner">
                <CheckCircle2 size={18} className="info-icon" />
                <span>Token will be generated automatically after confirmation.</span>
              </div>

              {bookingError && (
                <div className="auth-error-banner" style={{ margin: '14px 0 0' }}>
                  <span>{bookingError}</span>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="step-actions-footer">
              <button
                type="button"
                className="step-btn outline"
                onClick={() => setStep(2)}
                disabled={isSubmitting}
              >
                Back
              </button>
              <button
                type="button"
                className="step-btn primary"
                onClick={async () => {
                  const parsedQty = Math.max(1, parseInt(quantityKg, 10) || 1000)
                  setIsSubmitting(true)
                  setBookingError('')
                  try {
                    const payload = {
                      procurement_center_id: selectedCenter.id,
                      produce: selectedProduce,
                      quantity_kg: parsedQty,
                      slot_id: selectedSlot?.id ? parseInt(selectedSlot.id, 10) : 2,
                      slot_time: selectedSlot?.time || '',
                      booking_date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}`,
                    }
                    const data = await createBooking(payload)
                    setConfirmedBooking(data)
                    setStep(4)
                  } catch (err) {
                    if (err.status === 401 || err.status === 403) {
                      setShowAuthModal(true)
                      return
                    }
                    setBookingError(err.message || 'Failed to confirm booking.')
                  } finally {
                    setIsSubmitting(false)
                  }
                }}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Booking Slot...</span>
                  </>
                ) : (
                  'Confirm Booking'
                )}
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
              <p className="success-sub">Your digital queue token number is</p>

              {/* Token Display Pill */}
              <div className="success-token-box">
                <span className="success-token-code">
                  {confirmedBooking?.formatted_token || 'A-042'}
                </span>
              </div>

              {/* Specs Summary List */}
              <div className="success-specs-list">
                <div className="spec-item">
                  <Building2 size={16} className="spec-icon" />
                  <span className="spec-text">
                    {confirmedBooking?.center_name || selectedCenter.name}
                  </span>
                </div>
                <div className="spec-item">
                  <CalendarIcon size={16} className="spec-icon" />
                  <span className="spec-text">
                    {confirmedBooking?.formatted_date || `${selectedDate} September 2025`}
                  </span>
                </div>
                <div className="spec-item">
                  <Clock size={16} className="spec-icon" />
                  <span className="spec-text">
                    {confirmedBooking?.slot_time || selectedSlot.time}
                  </span>
                </div>
                <div className="spec-item">
                  <Sprout size={16} className="spec-icon" />
                  <span className="spec-text">
                    {confirmedBooking?.produce || selectedProduce} ({confirmedBooking?.quantity_kg ?? quantityKg} kg)
                  </span>
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
