import { useState } from 'react'
import AdminLayout from '../components/AdminLayout'
import { createAdminCenter, createAdminSlot } from '../api'
import {
  ArrowLeft, Building2, MapPin, Clock, Hash,
  Navigation, Plus, Trash2, CheckCircle2, AlertCircle,
  CalendarDays, Users,
} from 'lucide-react'
import indiaDistricts from '../data/india-districts.json'

const districtsByState = indiaDistricts.districts.reduce((locations, { state, district }) => {
  if (!locations[state]) locations[state] = []
  locations[state].push(district)
  return locations
}, {})

const states = Object.keys(districtsByState).sort((a, b) => a.localeCompare(b))
Object.values(districtsByState).forEach((districts) => districts.sort((a, b) => a.localeCompare(b)))

/* ─── helpers ──────────────────────────────── */
const TODAY = new Date().toISOString().split('T')[0]

const EMPTY_CENTER = {
  name: '',
  state: '',
  district: '',
  village: '',
  address: '',
  pincode: '',
  daily_capacity: '',
  opening_time: '',
  closing_time: '',
  latitude: '',
  longitude: '',
  status: 'Active',
}

const newSlotRow = () => ({
  _id: Math.random().toString(36).slice(2),
  slot_date: '',
  start_time: '',
  end_time: '',
  capacity: '',
})

/* ─── Component ─────────────────────────────── */
export default function AdminAddCenterPage() {
  const [centerData, setCenterData] = useState(EMPTY_CENTER)
  const [slots, setSlots] = useState([newSlotRow()])
  const [step, setStep] = useState('form') // 'form' | 'saving' | 'done'
  const [error, setError] = useState('')
  const [createdCenterId, setCreatedCenterId] = useState(null)
  const [savedSlots, setSavedSlots] = useState(0)

  const setField = (key, value) =>
    setCenterData((prev) => ({ ...prev, [key]: value }))

  /* Slot rows */
  const addSlot = () => setSlots((prev) => [...prev, newSlotRow()])
  const removeSlot = (id) => setSlots((prev) => prev.filter((s) => s._id !== id))
  const updateSlot = (id, key, value) =>
    setSlots((prev) => prev.map((s) => (s._id === id ? { ...s, [key]: value } : s)))

  /* Submit */
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!centerData.pincode || centerData.pincode.toString().length !== 6) {
      setError('Please enter a valid 6-digit pincode.')
      return
    }

    setStep('saving')
    try {
      const res = await createAdminCenter({
        ...centerData,
        pincode: parseInt(centerData.pincode),
        daily_capacity: parseInt(centerData.daily_capacity),
      })
      const centerId = res.center_id
      setCreatedCenterId(centerId)

      // save slots
      let saved = 0
      for (const slot of slots) {
        await createAdminSlot({
          center_id: centerId,
          slot_date: slot.slot_date,
          start_time: slot.start_time,
          end_time: slot.end_time,
          capacity: parseInt(slot.capacity),
        })
        saved++
        setSavedSlots(saved)
      }

      setStep('done')
    } catch (err) {
      setError(err.message || 'Something went wrong.')
      setStep('form')
    }
  }

  /* ─── Done screen ─────────────────────────── */
  if (step === 'done') {
    return (
      <AdminLayout activePath="/admin/centers" title="Add Procurement Center" showTimeframe={false}>
        <div className="add-center-done-screen">
          <div className="done-icon-ring">
            <CheckCircle2 size={40} />
          </div>
          <h2>Center Created!</h2>
          <p>
            <strong>{centerData.name}</strong> has been added with{' '}
            <strong>{savedSlots} slot{savedSlots !== 1 ? 's' : ''}</strong>.
          </p>
          <div className="done-actions">
            <a href="/admin/centers" className="admin-btn primary done-btn">
              ← Back to Centers
            </a>
            <button
              className="admin-btn outline done-btn"
              onClick={() => {
                setCenterData(EMPTY_CENTER)
                setSlots([newSlotRow()])
                setSavedSlots(0)
                setCreatedCenterId(null)
                setStep('form')
              }}
            >
              Add Another Center
            </button>
          </div>
        </div>
      </AdminLayout>
    )
  }

  const isSaving = step === 'saving'

  return (
    <AdminLayout activePath="/admin/centers" title="Add Procurement Center" showTimeframe={false}>
      <div className="add-center-page">

        {/* Page Header */}
        <div className="add-center-page-header">
          <a href="/admin/centers" className="back-link">
            <ArrowLeft size={16} /> Back to Centers
          </a>
          <div className="page-header-text">
            <h1>Add New Procurement Center</h1>
            <p>Fill in the details below and configure time slots for the center.</p>
          </div>
        </div>

        {error && (
          <div className="modal-banner error" style={{ maxWidth: 680, marginBottom: 0 }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="add-center-form-layout">

          {/* ── LEFT COLUMN ── */}
          <div className="add-center-col">

            {/* ── Card: Basic Info ── */}
            <div className="add-center-card">
              <div className="add-center-card-head">
                <div className="card-head-icon"><Building2 size={16} /></div>
                <h2>Basic Information</h2>
              </div>

              <div className="admin-form" style={{ paddingTop: 0 }}>
                <div className="form-group">
                  <label>Center Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kisan Samiti Center"
                    value={centerData.name}
                    onChange={(e) => setField('name', e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Status</label>
                    <select value={centerData.status} onChange={(e) => setField('status', e.target.value)}>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Daily Slot Capacity (in quintals) *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      placeholder="e.g. 180"
                      value={centerData.daily_capacity}
                      onChange={(e) => setField('daily_capacity', e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Opening Time *</label>
                    <div className="input-with-icon">
                      <span className="input-prefix-icon"><Clock size={14} /></span>
                      <input
                        type="time"
                        className="modern-time-input"
                        required
                        value={centerData.opening_time}
                        onChange={(e) => setField('opening_time', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Closing Time *</label>
                    <div className="input-with-icon">
                      <span className="input-prefix-icon"><Clock size={14} /></span>
                      <input
                        type="time"
                        className="modern-time-input"
                        required
                        value={centerData.closing_time}
                        onChange={(e) => setField('closing_time', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Card: Location ── */}
            <div className="add-center-card">
              <div className="add-center-card-head">
                <div className="card-head-icon"><MapPin size={16} /></div>
                <h2>Location Details</h2>
              </div>

              <div className="admin-form" style={{ paddingTop: 0 }}>
                <div className="form-row">
                  <div className="form-group">
                    <label>State *</label>
                    <select required value={centerData.state} onChange={(e) => {
                      setField('state', e.target.value)
                      setField('district', '')
                    }}>
                      <option value="">Select State</option>
                      {states.map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>District *</label>
                    <select required value={centerData.district} onChange={(e) => setField('district', e.target.value)} disabled={!centerData.state}>
                      <option value="">Select District</option>
                      {(districtsByState[centerData.state] || []).map(district => (
                        <option key={district} value={district}>{district}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Village / Town *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Daurala"
                      value={centerData.village}
                      onChange={(e) => setField('village', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Pincode *</label>
                    <div className="input-with-icon">
                      <span className="input-prefix-icon"><Hash size={13} /></span>
                      <input
                        type="text"
                        required
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="6-digit"
                        value={centerData.pincode}
                        onChange={(e) => setField('pincode', e.target.value.replace(/\D/g, ''))}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label>Full Address *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mandi Compound, NH-58"
                    value={centerData.address}
                    onChange={(e) => setField('address', e.target.value)}
                  />
                </div>


              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: Slots ── */}
          <div className="add-center-col">
            <div className="add-center-card add-center-slots-card">
              <div className="add-center-card-head">
                <div className="card-head-icon"><CalendarDays size={16} /></div>
                <h2>Time Slots</h2>
                <button
                  type="button"
                  className="add-slot-inline-btn"
                  onClick={addSlot}
                >
                  <Plus size={14} /> Add Slot
                </button>
              </div>

              <p className="slots-helper-text">
                Define the daily appointment slots farmers can book at this center.
              </p>

              <div className="slots-list">
                {slots.map((slot, idx) => (
                  <div key={slot._id} className="slot-row-card">
                    <div className="slot-row-number">#{idx + 1}</div>
                    <div className="slot-row-fields">
                      <div className="form-group">
                        <label>Date</label>
                        <input
                          type="date"
                          required
                          value={slot.slot_date}
                          onChange={(e) => updateSlot(slot._id, 'slot_date', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Start Time</label>
                        <div className="input-with-icon">
                          <span className="input-prefix-icon"><Clock size={13} /></span>
                          <input
                            type="time"
                            className="modern-time-input"
                            value={slot.start_time}
                            onChange={(e) => updateSlot(slot._id, 'start_time', e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="form-group">
                        <label>End Time</label>
                        <div className="input-with-icon">
                          <span className="input-prefix-icon"><Clock size={13} /></span>
                          <input
                            type="time"
                            className="modern-time-input"
                            value={slot.end_time}
                            onChange={(e) => updateSlot(slot._id, 'end_time', e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Capacity (in quintals)</label>
                        <input
                          type="number"
                          min={1}
                          placeholder="e.g. 30"
                          value={slot.capacity}
                          onChange={(e) => updateSlot(slot._id, 'capacity', e.target.value)}
                        />
                      </div>
                    </div>
                    {slots.length > 1 && (
                      <button
                        type="button"
                        className="remove-slot-btn"
                        onClick={() => removeSlot(slot._id)}
                        aria-label="Remove slot"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="add-slot-bottom-btn"
                onClick={addSlot}
              >
                <Plus size={15} /> Add Another Slot
              </button>
            </div>

            {/* Sticky Submit */}
            <div className="add-center-submit-bar">
              <a href="/admin/centers" className="admin-btn outline">
                Cancel
              </a>
              <button
                type="submit"
                className="admin-btn primary"
                disabled={isSaving}
              >
                {isSaving ? (
                  <span className="saving-dots">
                    Saving{' '}
                    <span className="saving-center-name">{centerData.name || 'center'}</span>…
                  </span>
                ) : (
                  <>
                    <Building2 size={15} />
                    Save Center &amp; Slots
                  </>
                )}
              </button>
            </div>
          </div>

        </form>
      </div>
    </AdminLayout>
  )
}
