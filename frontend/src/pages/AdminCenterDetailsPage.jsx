import { useEffect, useState } from 'react'
import AdminLayout from '../components/AdminLayout'
import { getAdminCenterDetails, deleteAdminCenter } from '../api'
import { Building2, MapPin, Clock, Hash, Navigation, ArrowLeft, CalendarDays, Users, Trash2, AlertTriangle, Sprout } from 'lucide-react'

export default function AdminCenterDetailsPage() {
  const [center, setCenter] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

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

  useEffect(() => {
    async function load() {
      const urlParams = new URLSearchParams(window.location.search)
      const id = urlParams.get('id')
      if (id) {
        const data = await getAdminCenterDetails(id)
        setCenter(data)
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <AdminLayout activePath="/admin/centers" title="Center Details" showTimeframe={false}>
        <div className="admin-page-container">
          <p>Loading center details...</p>
        </div>
      </AdminLayout>
    )
  }

  if (!center) {
    return (
      <AdminLayout activePath="/admin/centers" title="Center Details" showTimeframe={false}>
        <div className="admin-page-container">
          <a href="/admin/centers" className="back-link" style={{ marginBottom: '16px', display: 'inline-block' }}>
            <ArrowLeft size={16} /> Back to Centers
          </a>
          <p>Center not found.</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout activePath="/admin/centers" title="Center Details" showTimeframe={false}>
      <div className="add-center-page">
        <div className="add-center-page-header" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <a href="/admin/centers" className="back-link">
              <ArrowLeft size={16} /> Back to Centers
            </a>
            <div className="page-header-text">
              <h1>{center.name}</h1>
              <p>View complete information and configured slots for this procurement center.</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => setShowConfirmModal(true)}
            disabled={isDeleting}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              backgroundColor: '#ef4444', color: 'white',
              border: 'none', borderRadius: '8px',
              padding: '10px 16px', fontSize: '14px',
              fontWeight: '500', cursor: isDeleting ? 'not-allowed' : 'pointer',
              opacity: isDeleting ? 0.7 : 1, transition: 'background-color 0.2s',
              marginBottom: '16px'
            }}
          >
            <Trash2 size={16} />
            {isDeleting ? 'Deleting...' : 'Delete Center'}
          </button>
        </div>

        <div className="add-center-form-layout">
          <div className="add-center-col">
            <div className="add-center-card">
              <div className="add-center-card-head">
                <div className="card-head-icon"><Building2 size={16} /></div>
                <h2>Basic Information</h2>
                <span className={`status-pill ${center.status === 'Active' ? 'active' : 'inactive'}`} style={{ marginLeft: 'auto' }}>
                  {center.status}
                </span>
              </div>
              <div className="admin-form" style={{ paddingTop: 0 }}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Daily Slot Capacity</label>
                    <div className="readonly-field-box">
                      {center.daily_capacity} quintals
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Current Capacity / Utilization</label>
                    <div className="readonly-field-box">
                      {center.current_capacity} / {center.daily_capacity} <span className="util-badge">({center.utilization}%)</span>
                    </div>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Opening Time</label>
                    <div className="readonly-field-box">
                      <Clock size={16} className="field-icon" /> {center.opening_time}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Closing Time</label>
                    <div className="readonly-field-box">
                      <Clock size={16} className="field-icon" /> {center.closing_time}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="add-center-card">
              <div className="add-center-card-head">
                <div className="card-head-icon"><MapPin size={16} /></div>
                <h2>Location Details</h2>
              </div>
              <div className="admin-form" style={{ paddingTop: 0 }}>
                <div className="form-row">
                  <div className="form-group">
                    <label>State & District</label>
                    <div className="readonly-field-box">
                      {center.district}, {center.state}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Village & Pincode</label>
                    <div className="readonly-field-box">
                      {center.village} - {center.pincode}
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <label>Full Address</label>
                  <div className="readonly-field-box">
                    {center.address}
                  </div>
                </div>
                {(center.latitude || center.longitude) && (
                  <div className="form-row">
                    <div className="form-group">
                      <label>Coordinates</label>
                      <div className="readonly-field-box">
                        <Navigation size={16} className="field-icon" /> {center.latitude}, {center.longitude}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="add-center-card add-center-slots-card" style={{ marginTop: '24px' }}>
              <div className="add-center-card-head">
                <div className="card-head-icon"><Sprout size={16} /></div>
                <h2>Accepted Produces</h2>
              </div>
              
              <div className="slots-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {center.crops && center.crops.length > 0 ? (
                  center.crops.map((crop, idx) => (
                    <div key={crop.id || idx} style={{ 
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Produce #{idx + 1}</span>
                        <span style={{ fontSize: '16px', color: '#0f172a', fontWeight: '600' }}>{crop.name}</span>
                      </div>
                      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Price</span>
                        <span style={{ fontSize: '16px', color: '#10b981', fontWeight: '700' }}>₹{crop.price_per_kg} <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>/ kg</span></span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="slots-helper-text" style={{ padding: '16px 0', textAlign: 'center' }}>No produces have been configured for this center.</p>
                )}
              </div>
            </div>

          </div>

          <div className="add-center-col">
            <div className="add-center-card add-center-slots-card">
              <div className="add-center-card-head">
                <div className="card-head-icon"><CalendarDays size={16} /></div>
                <h2>Configured Time Slots</h2>
              </div>
              
              <div className="slots-list">
                {center.slots && center.slots.length > 0 ? (
                  center.slots.map((slot, idx) => (
                    <div key={slot.id} className="details-slot-card">
                      <div className="details-slot-head">
                        <div className="details-slot-title">Slot #{idx + 1}</div>
                        <span className={`status-pill ${slot.status === 'Available' ? 'active' : 'inactive'}`}>
                          {slot.status}
                        </span>
                      </div>
                      <div className="details-slot-grid">
                        <div className="details-slot-stat">
                          <label>Time</label>
                          <div className="val">{slot.start_time} - {slot.end_time}</div>
                        </div>
                        <div className="details-slot-stat">
                          <label>Total Capacity</label>
                          <div className="val">{slot.capacity} <span className="unit">q</span></div>
                        </div>
                        <div className="details-slot-stat">
                          <label>Booked</label>
                          <div className="val">{slot.booked_count} <span className="unit">q</span></div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="slots-helper-text">No time slots have been configured for this center.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showConfirmModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{ 
            backgroundColor: '#ffffff', borderRadius: '24px', padding: '40px 32px',
            maxWidth: '440px', width: '90%', textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0,0,0,0.05)',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <div style={{ 
                background: '#fef2f2', 
                padding: '18px', 
                borderRadius: '50%',
                border: '8px solid #fff1f2',
                color: '#ef4444',
                boxShadow: '0 8px 24px -6px rgba(239, 68, 68, 0.4)'
              }}>
                <AlertTriangle size={36} strokeWidth={2.2} />
              </div>
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', marginBottom: '12px', letterSpacing: '-0.02em' }}>Delete Procurement Center?</h2>
            <p style={{ color: '#64748b', fontSize: '15px', marginBottom: '32px', lineHeight: '1.6' }}>
              You're about to permanently delete <strong>{center.name}</strong>. This action is irreversible and will remove all configured time slots instantly.
            </p>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <button 
                type="button" 
                style={{ 
                  flex: 1, padding: '12px 20px', borderRadius: '12px',
                  backgroundColor: '#f1f5f9', color: '#475569',
                  border: '1px solid #e2e8f0', fontSize: '15px', fontWeight: '600',
                  cursor: 'pointer'
                }}
                onClick={() => setShowConfirmModal(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button 
                type="button" 
                style={{ 
                  flex: 1, padding: '12px 20px', borderRadius: '12px',
                  background: 'linear-gradient(to bottom, #f87171, #ef4444)', color: 'white', 
                  border: 'none', fontSize: '15px', fontWeight: '600',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
                  opacity: isDeleting ? 0.7 : 1
                }}
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Center'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
