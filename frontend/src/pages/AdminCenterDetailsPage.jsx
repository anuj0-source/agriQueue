import { useEffect, useState } from 'react'
import AdminLayout from '../components/AdminLayout'
import { getAdminCenterDetails } from '../api'
import { Building2, MapPin, Clock, Hash, Navigation, ArrowLeft, CalendarDays, Users } from 'lucide-react'

export default function AdminCenterDetailsPage() {
  const [center, setCenter] = useState(null)
  const [loading, setLoading] = useState(true)

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
        <div className="add-center-page-header">
          <a href="/admin/centers" className="back-link">
            <ArrowLeft size={16} /> Back to Centers
          </a>
          <div className="page-header-text">
            <h1>{center.name}</h1>
            <p>View complete information and configured slots for this procurement center.</p>
          </div>
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
                          <label>Date</label>
                          <div className="val">{slot.slot_date}</div>
                        </div>
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
    </AdminLayout>
  )
}
