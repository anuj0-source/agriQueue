import { useEffect, useState } from 'react'
import {
  UserRound, Building2, Phone, Hash,
  Calendar, CheckCircle2, ShieldCheck,
} from 'lucide-react'
import StaffLayout from '../components/StaffLayout'
import { getStaffProfile } from '../api'

export default function StaffProfilePage() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const currentUser = (() => {
      try { return JSON.parse(localStorage.getItem('currentUser') || 'null') } catch { return null }
    })()
    if (!currentUser || currentUser.role !== 'staff') {
      window.location.href = '/login'
      return
    }
    fetchProfile()
  }, [])

  async function fetchProfile() {
    setLoading(true)
    try {
      const res = await getStaffProfile()
      setProfile(res)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const getInitials = (name = '') =>
    name.trim().split(/\s+/).map(n => n[0]).join('').slice(0, 2).toUpperCase()

  if (loading) return (
    <StaffLayout activePath="/staff/profile" title="Profile">
      <div className="staff-loading">
        <div className="staff-spinner" />
        <p>Loading profile…</p>
      </div>
    </StaffLayout>
  )

  if (error) return (
    <StaffLayout activePath="/staff/profile" title="Profile">
      <div className="staff-error-card">
        <p>⚠️ {error}</p>
        <button onClick={fetchProfile} className="staff-btn-primary">Retry</button>
      </div>
    </StaffLayout>
  )

  const p = profile || {}

  return (
    <StaffLayout activePath="/staff/profile" title="Profile">
      <div className="spr-wrapper">
        {/* Profile Hero */}
        <div className="spr-hero-card">
          <div className="spr-avatar">{getInitials(p.full_name)}</div>
          <div className="spr-hero-info">
            <h2 className="spr-name">{p.full_name}</h2>
            <p className="spr-role">{p.role || 'Procurement Staff'}</p>
            <div className="spr-verified">
              <ShieldCheck size={15} />
              <span>Verified Employee</span>
            </div>
          </div>
          <div className="spr-today-badge">
            <CheckCircle2 size={16} />
            <span>{p.today_completed} completed today</span>
          </div>
        </div>

        {/* Info grid */}
        <div className="spr-info-grid">
          {/* Personal Info */}
          <div className="spr-info-card">
            <div className="spr-card-title">
              <UserRound size={18} />
              <h3>Personal Information</h3>
            </div>
            <div className="spr-field-list">
              <div className="spr-field">
                <Hash size={14} className="spr-field-icon" />
                <div>
                  <span className="spr-field-label">Staff ID</span>
                  <span className="spr-field-value">{p.staff_id || 'N/A'}</span>
                </div>
              </div>
              <div className="spr-field">
                <Phone size={14} className="spr-field-icon" />
                <div>
                  <span className="spr-field-label">Mobile Number</span>
                  <span className="spr-field-value">+91 {p.mobile_number}</span>
                </div>
              </div>
              <div className="spr-field">
                <Calendar size={14} className="spr-field-icon" />
                <div>
                  <span className="spr-field-label">Joined On</span>
                  <span className="spr-field-value">{p.created_at || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Center Info */}
          <div className="spr-info-card">
            <div className="spr-card-title">
              <Building2 size={18} />
              <h3>Assigned Center</h3>
            </div>
            <div className="spr-field-list">
              <div className="spr-field">
                <Building2 size={14} className="spr-field-icon" />
                <div>
                  <span className="spr-field-label">Center Name</span>
                  <span className="spr-field-value">{p.center_name || 'N/A'}</span>
                </div>
              </div>
              <div className="spr-field">
                <Hash size={14} className="spr-field-icon" />
                <div>
                  <span className="spr-field-label">Center ID</span>
                  <span className="spr-field-value">#{p.center_id}</span>
                </div>
              </div>
              {p.center_address && (
                <div className="spr-field">
                  <Building2 size={14} className="spr-field-icon" />
                  <div>
                    <span className="spr-field-label">Address</span>
                    <span className="spr-field-value">{p.center_address}</span>
                  </div>
                </div>
              )}
              {p.center_district && (
                <div className="spr-field">
                  <Building2 size={14} className="spr-field-icon" />
                  <div>
                    <span className="spr-field-label">Location</span>
                    <span className="spr-field-value">
                      {p.center_district}{p.center_state ? `, ${p.center_state}` : ''}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </StaffLayout>
  )
}
