import { useEffect, useState } from 'react'
import AdminLayout from '../components/AdminLayout'
import { getAdminCenterDetails, deleteAdminCenter, getCenterStaff, createCenterStaff, deleteStaffMember, updateAdminCenter, updateAdminSlot, deleteAdminSlot, createAdminSlot } from '../api'
import {
  Building2, MapPin, Clock, Navigation, ArrowLeft, CalendarDays,
  Trash2, AlertTriangle, Sprout, Users, UserPlus, Eye, EyeOff,
  X, ShieldCheck, Loader2, Hash, Zap, TrendingUp, CheckCircle, Edit, Save, Plus,
} from 'lucide-react'
import CropIcon from '../components/CropIcon'

export default function AdminCenterDetailsPage() {
  const [center, setCenter]           = useState(null)
  const [loading, setLoading]         = useState(true)
  const [isDeleting, setIsDeleting]   = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const [staffList, setStaffList]       = useState([])
  const [staffLoading, setStaffLoading] = useState(false)
  const [showAddStaff, setShowAddStaff] = useState(false)
  const [staffForm, setStaffForm]       = useState({ full_name: '', mobile_number: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [staffSaving, setStaffSaving]   = useState(false)
  const [staffError, setStaffError]     = useState('')
  const [toast, setToast]               = useState(null)
  const [deletingStaffId, setDeletingStaffId] = useState(null)

  // Edit Center state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [isSaving, setIsSaving] = useState(false)

  // Edit Slots state
  const [showSlotsModal, setShowSlotsModal] = useState(false)
  const [editingSlots, setEditingSlots] = useState([])
  const [isSavingSlots, setIsSavingSlots] = useState(false)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const handleConfirmDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteAdminCenter(center.id)
      window.location.href = '/admin/centers'
    } catch (err) {
      alert(err.message || 'Failed to delete center')
      setIsDeleting(false)
      setShowConfirmModal(false)
    }
  }

  const loadStaff = async (centerId) => {
    setStaffLoading(true)
    try {
      setStaffList(await getCenterStaff(centerId) || [])
    } catch (e) { console.error(e) }
    finally { setStaffLoading(false) }
  }

  useEffect(() => {
    async function load() {
      const id = new URLSearchParams(window.location.search).get('id')
      if (id) {
        const data = await getAdminCenterDetails(id)
        setCenter(data)
        await loadStaff(id)
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleOpenEdit = () => {
    setEditForm({
      daily_capacity: center.daily_capacity || '',
      opening_time: center.opening_time || '',
      closing_time: center.closing_time || '',
      status: center.status || 'Active'
    })
    setShowEditModal(true)
  }

  const handleEditSave = async (e) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      await updateAdminCenter(center.id, editForm)
      showToast('Center details updated successfully')
      // Refresh center details
      const data = await getAdminCenterDetails(center.id)
      setCenter(data)
      setShowEditModal(false)
    } catch (err) {
      showToast(err.message || 'Failed to update center', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleOpenSlots = () => {
    setEditingSlots(center.slots ? [...center.slots] : [])
    setShowSlotsModal(true)
  }

  const handleAddSlot = () => {
    setEditingSlots([...editingSlots, { id: `new_${Date.now()}`, start_time: '', end_time: '', capacity: 10, status: 'Available' }])
  }

  const handleUpdateSlotField = (id, field, value) => {
    setEditingSlots(editingSlots.map(s => s.id === id ? { ...s, [field]: value } : s))
  }

  const handleRemoveSlot = (id) => {
    setEditingSlots(editingSlots.filter(s => s.id !== id))
  }

  const handleSaveSlots = async (e) => {
    e.preventDefault()
    setIsSavingSlots(true)
    try {
      // Find deleted slots
      const originalIds = new Set((center.slots || []).map(s => s.id))
      const currentIds = new Set(editingSlots.map(s => s.id).filter(id => typeof id === 'number'))
      
      const toDelete = [...originalIds].filter(id => !currentIds.has(id))
      
      // Execute deletions
      for (const id of toDelete) {
        await deleteAdminSlot(id)
      }
      
      // Execute updates and creations
      for (const slot of editingSlots) {
        if (typeof slot.id === 'string' && slot.id.startsWith('new_')) {
          // create new slot
          await createAdminSlot({
            center_id: center.id,
            start_time: slot.start_time,
            end_time: slot.end_time,
            capacity: slot.capacity,
            status: slot.status
          })
        } else {
          // update existing
          await updateAdminSlot(slot.id, {
            start_time: slot.start_time,
            end_time: slot.end_time,
            capacity: slot.capacity,
            status: slot.status
          })
        }
      }

      showToast('Slots updated successfully')
      const data = await getAdminCenterDetails(center.id)
      setCenter(data)
      setShowSlotsModal(false)
    } catch (err) {
      showToast(err.message || 'Failed to update slots', 'error')
    } finally {
      setIsSavingSlots(false)
    }
  }

  const handleAddStaff = async (e) => {
    e.preventDefault()
    setStaffError('')
    if (!staffForm.full_name.trim() || !staffForm.mobile_number.trim() || !staffForm.password.trim()) {
      setStaffError('All fields are required'); return
    }
    if (staffForm.mobile_number.length !== 10) {
      setStaffError('Mobile number must be exactly 10 digits'); return
    }
    if (staffForm.password.length < 6) {
      setStaffError('Password must be at least 6 characters'); return
    }
    setStaffSaving(true)
    try {
      await createCenterStaff(center.id, staffForm)
      showToast('Staff member added successfully!')
      setStaffForm({ full_name: '', mobile_number: '', password: '' })
      setShowAddStaff(false)
      await loadStaff(center.id)
    } catch (err) {
      setStaffError(err.message || 'Failed to create staff')
    } finally { setStaffSaving(false) }
  }

  const handleDeleteStaff = async (staffId, name) => {
    if (!window.confirm(`Remove ${name} from this center?`)) return
    setDeletingStaffId(staffId)
    try {
      await deleteStaffMember(staffId)
      showToast(`${name} removed successfully`)
      await loadStaff(center.id)
    } catch (err) {
      showToast(err.message || 'Failed to remove staff', 'error')
    } finally { setDeletingStaffId(null) }
  }

  const getInitials = (name = '') =>
    name.trim().split(/\s+/).map(n => n[0]).join('').slice(0, 2).toUpperCase()

  if (loading) return (
    <AdminLayout activePath="/admin/centers" title="Center Details" showTimeframe={false}>
      <div className="cdet-loading">
        <div className="cdet-spinner" />
        <span>Loading center details…</span>
      </div>
    </AdminLayout>
  )

  if (!center) return (
    <AdminLayout activePath="/admin/centers" title="Center Details" showTimeframe={false}>
      <div className="cdet-loading">
        <a href="/admin/centers" className="cdet-back"><ArrowLeft size={15}/> Back to Centers</a>
        <p>Center not found.</p>
      </div>
    </AdminLayout>
  )

  const utilPct = center.utilization ?? Math.round((center.current_capacity / center.daily_capacity) * 100)

  return (
    <AdminLayout activePath="/admin/centers" title="Center Details" showTimeframe={false}>
      {toast && (
        <div className={`staff-toast ${toast.type === 'error' ? 'staff-toast-error' : 'staff-toast-success'}`}>
          {toast.msg}
        </div>
      )}

      <div className="cdet-page">

        {/* ── HERO HEADER ── */}
        <div className="cdet-hero">
          <div className="cdet-hero-left">
            <a href="/admin/centers" className="cdet-back">
              <ArrowLeft size={15}/> Back to Centers
            </a>
            <div className="cdet-hero-name-row">
              <h1 className="cdet-hero-name">{center.name}</h1>
              <span className={`cdet-status-pill ${center.status === 'Active' ? 'cdet-pill-active' : 'cdet-pill-inactive'}`}>
                {center.status === 'Active' && <span className="cdet-live-dot"/>}
                {center.status}
              </span>
            </div>
            <div className="cdet-hero-badges">
              <span className="cdet-id-badge">
                <Hash size={13}/> Center ID: <strong>#{center.id}</strong>
              </span>
              <span className="cdet-meta-badge">
                <MapPin size={12}/> {center.district}, {center.state}
              </span>
              <span className="cdet-meta-badge">
                <Clock size={12}/> {center.opening_time} – {center.closing_time}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              className="cdet-edit-btn"
              onClick={handleOpenEdit}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: '8px',
                border: '1.5px solid #e2e8f0', background: '#fff',
                fontSize: '13px', fontWeight: '600', color: '#1e293b', cursor: 'pointer'
              }}
            >
              <Edit size={15}/> Edit Center
            </button>
            <button
              className="cdet-delete-btn"
              onClick={() => setShowConfirmModal(true)}
              disabled={isDeleting}
            >
              <Trash2 size={15}/>
              {isDeleting ? 'Deleting…' : 'Delete Center'}
            </button>
          </div>
        </div>

        {/* ── STAT CARDS ROW ── */}
        <div className="cdet-stats-row">
          <div className="cdet-stat-card">
            <div className="cdet-stat-icon" style={{ background: '#eff6ff' }}>
              <Zap size={18} style={{ color: '#3b82f6' }}/>
            </div>
            <div>
              <div className="cdet-stat-val">{center.daily_capacity} <span className="cdet-stat-unit">quintals</span></div>
              <div className="cdet-stat-label">Daily Capacity</div>
            </div>
          </div>
          <div className="cdet-stat-card">
            <div className="cdet-stat-icon" style={{ background: '#f0fdf4' }}>
              <TrendingUp size={18} style={{ color: '#22c55e' }}/>
            </div>
            <div>
              <div className="cdet-stat-val">{center.current_capacity} <span className="cdet-stat-unit">/ {center.daily_capacity}</span></div>
              <div className="cdet-stat-label">Current Usage</div>
            </div>
            <div className="cdet-util-pill" style={{
              background: utilPct >= 80 ? '#fee2e2' : utilPct >= 50 ? '#fef3c7' : '#dcfce7',
              color: utilPct >= 80 ? '#dc2626' : utilPct >= 50 ? '#92400e' : '#16a34a',
            }}>
              {utilPct}%
            </div>
          </div>
          <div className="cdet-stat-card">
            <div className="cdet-stat-icon" style={{ background: '#fdf4ff' }}>
              <CalendarDays size={18} style={{ color: '#a855f7' }}/>
            </div>
            <div>
              <div className="cdet-stat-val">{center.slots?.length ?? 0} <span className="cdet-stat-unit">slots</span></div>
              <div className="cdet-stat-label">Time Slots Configured</div>
            </div>
          </div>
          <div className="cdet-stat-card">
            <div className="cdet-stat-icon" style={{ background: '#fff7ed' }}>
              <Users size={18} style={{ color: '#f97316' }}/>
            </div>
            <div>
              <div className="cdet-stat-val">{staffList.length} <span className="cdet-stat-unit">assigned</span></div>
              <div className="cdet-stat-label">Staff Members</div>
            </div>
          </div>
        </div>

        {/* ── MAIN GRID ── */}
        <div className="cdet-grid">

          {/* ──────────── LEFT COLUMN ──────────── */}
          <div className="cdet-col">

            {/* Basic Info */}
            <div className="cdet-card">
              <div className="cdet-card-head">
                <div className="cdet-card-icon"><Building2 size={15}/></div>
                <span className="cdet-card-title">Basic Information</span>
              </div>
              <div className="cdet-kv-grid">
                <div className="cdet-kv">
                  <span className="cdet-kv-label">Center ID</span>
                  <span className="cdet-kv-val cdet-id-mono">#{center.id}</span>
                </div>
                <div className="cdet-kv">
                  <span className="cdet-kv-label">Status</span>
                  <span className={`cdet-inline-pill ${center.status === 'Active' ? 'cdet-pill-active' : 'cdet-pill-inactive'}`}>
                    {center.status}
                  </span>
                </div>
                <div className="cdet-kv">
                  <span className="cdet-kv-label">Daily Capacity</span>
                  <span className="cdet-kv-val">{center.daily_capacity} quintals</span>
                </div>
                <div className="cdet-kv">
                  <span className="cdet-kv-label">Utilization</span>
                  <div className="cdet-progress-row">
                    <div className="cdet-progress-bar">
                      <div className="cdet-progress-fill" style={{
                        width: `${Math.min(utilPct, 100)}%`,
                        background: utilPct >= 80 ? '#ef4444' : utilPct >= 50 ? '#f59e0b' : '#22c55e',
                      }}/>
                    </div>
                    <span className="cdet-progress-pct">{utilPct}%</span>
                  </div>
                </div>
                <div className="cdet-kv">
                  <span className="cdet-kv-label">Opening Time</span>
                  <span className="cdet-kv-val cdet-time"><Clock size={13}/> {center.opening_time}</span>
                </div>
                <div className="cdet-kv">
                  <span className="cdet-kv-label">Closing Time</span>
                  <span className="cdet-kv-val cdet-time"><Clock size={13}/> {center.closing_time}</span>
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="cdet-card">
              <div className="cdet-card-head">
                <div className="cdet-card-icon"><MapPin size={15}/></div>
                <span className="cdet-card-title">Location Details</span>
              </div>
              <div className="cdet-kv-grid">
                <div className="cdet-kv">
                  <span className="cdet-kv-label">State</span>
                  <span className="cdet-kv-val">{center.state}</span>
                </div>
                <div className="cdet-kv">
                  <span className="cdet-kv-label">District</span>
                  <span className="cdet-kv-val">{center.district}</span>
                </div>
                <div className="cdet-kv">
                  <span className="cdet-kv-label">Village</span>
                  <span className="cdet-kv-val">{center.village}</span>
                </div>
                <div className="cdet-kv">
                  <span className="cdet-kv-label">Pincode</span>
                  <span className="cdet-kv-val cdet-id-mono">{center.pincode}</span>
                </div>
              </div>
              <div className="cdet-address-box">
                <MapPin size={14} className="cdet-address-icon"/>
                <span>{center.address}</span>
              </div>
              {(center.latitude || center.longitude) && (
                <div className="cdet-coords-box">
                  <Navigation size={13}/>
                  <span>{center.latitude}, {center.longitude}</span>
                </div>
              )}
            </div>

            {/* Accepted Produces */}
            <div className="cdet-card">
              <div className="cdet-card-head">
                <div className="cdet-card-icon"><Sprout size={15}/></div>
                <span className="cdet-card-title">Accepted Produces</span>
                <span className="cdet-count-chip">{center.crops?.length ?? 0}</span>
              </div>
              {center.crops && center.crops.length > 0 ? (
                <div className="cdet-produce-list">
                  {center.crops.map((crop, idx) => (
                    <div key={crop.id || idx} className="cdet-produce-row">
                      <div className="cdet-produce-icon">
                        <CropIcon name={crop.name} size={32} />
                      </div>
                      <div className="cdet-produce-info">
                        <span className="cdet-produce-name">{crop.name}</span>
                        <span className="cdet-produce-label">Produce #{idx + 1}</span>
                      </div>
                      <div className="cdet-produce-price">
                        <span className="cdet-price-val">₹{crop.price_per_kg}</span>
                        <span className="cdet-price-unit">/ kg</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="cdet-empty-mini">No produces configured for this center.</div>
              )}
            </div>

          </div>

          {/* ──────────── RIGHT COLUMN ──────────── */}
          <div className="cdet-col">

            {/* Time Slots */}
            <div className="cdet-card">
              <div className="cdet-card-head">
                <div className="cdet-card-icon"><CalendarDays size={15}/></div>
                <span className="cdet-card-title">Configured Time Slots</span>
                <span className="cdet-count-chip">{center.slots?.length ?? 0}</span>
                <button 
                  className="cdet-edit-btn" 
                  onClick={handleOpenSlots}
                  style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', padding: '4px 8px', borderRadius: '4px', background: '#e0e7ff', color: '#4338ca', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                  <Edit size={12}/> Edit Slots
                </button>
              </div>
              {center.slots && center.slots.length > 0 ? (
                <div className="cdet-slots-list">
                  {center.slots.map((slot, idx) => (
                    <div key={slot.id} className="cdet-slot-row">
                      <div className="cdet-slot-number">{idx + 1}</div>
                      <div className="cdet-slot-body">
                        <div className="cdet-slot-time">{slot.start_time} – {slot.end_time}</div>
                        <div className="cdet-slot-meta">
                          <span>Capacity: <strong>{slot.capacity}q</strong></span>
                          <span>·</span>
                          <span>Booked: <strong>{slot.booked_count}q</strong></span>
                        </div>
                      </div>
                      <span className={`cdet-slot-badge ${slot.status === 'Available' ? 'cdet-slot-avail' : 'cdet-slot-full'}`}>
                        {slot.status === 'Available' && <CheckCircle size={11}/>}
                        {slot.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="cdet-empty-mini">No time slots configured.</div>
              )}
            </div>

            {/* Staff Management */}
            <div className="cdet-card">
              <div className="cdet-card-head">
                <div className="cdet-card-icon"><Users size={15}/></div>
                <span className="cdet-card-title">Staff Management</span>
                <span className="cdet-count-chip">{staffList.length}</span>
              </div>

              {staffLoading ? (
                <div className="cdet-staff-loading">
                  <Loader2 size={18} className="scd-spin"/> Loading staff…
                </div>
              ) : staffList.length === 0 ? (
                <div className="cdet-empty-mini" style={{ textAlign: 'center', padding: '20px 0' }}>
                  <Users size={28} style={{ color: '#cbd5e1', display: 'block', margin: '0 auto 6px' }}/>
                  No staff assigned yet
                </div>
              ) : (
                <div className="cdet-staff-list">
                  {staffList.map((s) => (
                    <div key={s.id} className="cdet-staff-row">
                      <div className="cdet-staff-av">{getInitials(s.full_name)}</div>
                      <div className="cdet-staff-info">
                        <div className="cdet-staff-name">{s.full_name}</div>
                        <div className="cdet-staff-meta">
                          <span className="cdet-staff-id">{s.staff_id}</span>
                          <span className="cdet-dot">·</span>
                          <span>+91 {s.mobile_number}</span>
                          <span className="cdet-dot">·</span>
                          <span>{s.created_at}</span>
                        </div>
                      </div>
                      <button
                        className="cdet-remove-btn"
                        onClick={() => handleDeleteStaff(s.id, s.full_name)}
                        disabled={deletingStaffId === s.id}
                        title="Remove"
                      >
                        {deletingStaffId === s.id
                          ? <Loader2 size={13} className="scd-spin"/>
                          : <X size={13}/>}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {!showAddStaff ? (
                <button className="cdet-add-trigger" onClick={() => { setShowAddStaff(true); setStaffError('') }}>
                  <UserPlus size={15}/> Add Staff Member
                </button>
              ) : (
                <form className="cdet-add-form" onSubmit={handleAddStaff} autoComplete="off">
                  <div className="cdet-form-title">
                    <UserPlus size={14}/> New Staff Account
                    <button type="button" className="scd-form-close"
                      onClick={() => { setShowAddStaff(false); setStaffError(''); setStaffForm({ full_name: '', mobile_number: '', password: '' }) }}>
                      <X size={13}/>
                    </button>
                  </div>

                  {staffError && (
                    <div className="scd-form-error">
                      <AlertTriangle size={13}/> {staffError}
                    </div>
                  )}

                  <div className="scd-field">
                    <label htmlFor="scd-fullname">Full Name</label>
                    <input id="scd-fullname" type="text" placeholder="e.g. Suresh Verma"
                      value={staffForm.full_name}
                      onChange={e => setStaffForm(f => ({ ...f, full_name: e.target.value }))}
                      autoComplete="off"/>
                  </div>

                  <div className="scd-field">
                    <label htmlFor="scd-mobile">Mobile Number</label>
                    <div className="scd-prefix-wrap">
                      <span className="scd-prefix">+91</span>
                      <input id="scd-mobile" type="tel" inputMode="numeric" maxLength={10}
                        placeholder="10-digit number"
                        value={staffForm.mobile_number}
                        onChange={e => setStaffForm(f => ({ ...f, mobile_number: e.target.value.replace(/\D/g, '') }))}
                        autoComplete="off"/>
                    </div>
                  </div>

                  <div className="scd-field">
                    <label htmlFor="scd-password">Password</label>
                    <div className="scd-eye-wrap">
                      <input id="scd-password" type={showPassword ? 'text' : 'password'}
                        placeholder="Min. 6 characters"
                        value={staffForm.password}
                        onChange={e => setStaffForm(f => ({ ...f, password: e.target.value }))}
                        autoComplete="new-password"/>
                      <button type="button" className="scd-eye-btn"
                        onClick={() => setShowPassword(v => !v)}>
                        {showPassword ? <EyeOff size={14}/> : <Eye size={14}/>}
                      </button>
                    </div>
                  </div>

                  <div className="scd-form-actions">
                    <button type="button" className="scd-btn-cancel"
                      onClick={() => { setShowAddStaff(false); setStaffError('') }}>
                      Cancel
                    </button>
                    <button id="save-staff-btn" type="submit" className="scd-btn-save" disabled={staffSaving}>
                      {staffSaving
                        ? <><Loader2 size={13} className="scd-spin"/> Saving…</>
                        : <><ShieldCheck size={13}/> Create Staff</>}
                    </button>
                  </div>
                </form>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Delete Confirm Modal */}
      {showConfirmModal && (
        <div className="cdet-modal-backdrop">
          <div className="cdet-modal">
            <div className="cdet-modal-icon">
              <AlertTriangle size={32} strokeWidth={2.2}/>
            </div>
            <h2 className="cdet-modal-title">Delete Procurement Center?</h2>
            <p className="cdet-modal-body">
              You're about to permanently delete <strong>{center.name}</strong> (Center #{center.id}).
              This is irreversible and removes all configured time slots.
            </p>
            <div className="cdet-modal-actions">
              <button className="cdet-modal-cancel" onClick={() => setShowConfirmModal(false)} disabled={isDeleting}>
                Cancel
              </button>
              <button className="cdet-modal-confirm" onClick={handleConfirmDelete} disabled={isDeleting}>
                {isDeleting ? 'Deleting…' : 'Yes, Delete Center'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT CENTER MODAL ── */}
      {showEditModal && (
        <div className="cdet-modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="cdet-modal" onClick={e => e.stopPropagation()}>
            <div className="cdet-modal-header">
              <div className="cdet-modal-title">
                <Edit size={18} style={{ color: '#2563eb' }} />
                <h3>Edit Center Details</h3>
              </div>
              <button className="cdet-modal-close" onClick={() => setShowEditModal(false)}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleEditSave} className="cdet-modal-body">
              <div className="cdet-form-group">
                <label>Status</label>
                <select 
                  className="cdet-form-input" 
                  value={editForm.status}
                  onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="cdet-form-group">
                <label>Daily Capacity (quintals)</label>
                <input 
                  type="number" 
                  className="cdet-form-input" 
                  value={editForm.daily_capacity}
                  onChange={e => setEditForm(p => ({ ...p, daily_capacity: e.target.value }))}
                  min="1"
                  required 
                />
              </div>

              <div className="cdet-form-row">
                <div className="cdet-form-group" style={{ flex: 1 }}>
                  <label>Opening Time</label>
                  <input 
                    type="time" 
                    className="cdet-form-input" 
                    value={editForm.opening_time}
                    onChange={e => setEditForm(p => ({ ...p, opening_time: e.target.value }))}
                    required 
                  />
                </div>
                <div className="cdet-form-group" style={{ flex: 1 }}>
                  <label>Closing Time</label>
                  <input 
                    type="time" 
                    className="cdet-form-input" 
                    value={editForm.closing_time}
                    onChange={e => setEditForm(p => ({ ...p, closing_time: e.target.value }))}
                    required 
                  />
                </div>
              </div>

              <div className="cdet-modal-footer">
                <button type="button" className="cdet-btn-cancel" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="cdet-btn-confirm" disabled={isSaving} style={{ background: '#2563eb', color: '#fff', border: 'none' }}>
                  {isSaving ? <Loader2 size={16} className="spin-icon" /> : <Save size={16} />}
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT SLOTS MODAL ── */}
      {showSlotsModal && (
        <div className="cdet-modal-overlay" onClick={() => setShowSlotsModal(false)}>
          <div className="cdet-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="cdet-modal-header">
              <div className="cdet-modal-title">
                <CalendarDays size={18} style={{ color: '#8b5cf6' }} />
                <h3>Edit Time Slots</h3>
              </div>
              <button className="cdet-modal-close" onClick={() => setShowSlotsModal(false)}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSaveSlots} className="cdet-modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <div className="cdet-slot-list">
                {editingSlots.length === 0 ? (
                  <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center' }}>No slots configured.</p>
                ) : (
                  editingSlots.map((slot, index) => (
                    <div key={slot.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Slot #{index + 1}</span>
                        <button type="button" onClick={() => handleRemoveSlot(slot.id)} style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }} title="Remove Slot">
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Start</label>
                          <input type="time" className="cdet-form-input" value={slot.start_time} onChange={e => handleUpdateSlotField(slot.id, 'start_time', e.target.value)} required />
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>End</label>
                          <input type="time" className="cdet-form-input" value={slot.end_time} onChange={e => handleUpdateSlotField(slot.id, 'end_time', e.target.value)} required />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Capacity (q)</label>
                          <input type="number" className="cdet-form-input" value={slot.capacity} onChange={e => handleUpdateSlotField(slot.id, 'capacity', e.target.value)} min="1" required />
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Status</label>
                          <select className="cdet-form-input" value={slot.status} onChange={e => handleUpdateSlotField(slot.id, 'status', e.target.value)}>
                            <option value="Available">Available</option>
                            <option value="Full">Full</option>
                            <option value="Inactive">Inactive</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <button 
                type="button" 
                onClick={handleAddSlot}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', background: '#f1f5f9', color: '#334155', border: '1px dashed #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, marginTop: '8px' }}
              >
                <Plus size={14}/> Add New Slot
              </button>

              <div className="cdet-modal-footer" style={{ marginTop: '16px', padding: 0, paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
                <button type="button" className="cdet-btn-cancel" onClick={() => setShowSlotsModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="cdet-btn-confirm" disabled={isSavingSlots} style={{ background: '#8b5cf6', color: '#fff', border: 'none' }}>
                  {isSavingSlots ? <Loader2 size={16} className="spin-icon" /> : <Save size={16} />}
                  {isSavingSlots ? 'Saving...' : 'Save Slots'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </AdminLayout>
  )
}
