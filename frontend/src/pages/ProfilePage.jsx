import { useState, useEffect } from 'react'
import { CheckCircle2, LogOut, Loader2 } from 'lucide-react'
import FarmerLayout from '../components/FarmerLayout'
import { ProfileSkeleton } from '../components/Skeletons'
import { FARMER_PROFILE } from '../data/farmer-data'
import { logoutFarmer, getFarmerDashboard } from '../api'

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(() => {
    try {
      const stored = localStorage.getItem('currentUser')
      if (stored) {
        const u = JSON.parse(stored)
        return {
          name: u.full_name || FARMER_PROFILE.name,
          farmerId: u.farmer_id || 'N/A',
          mobile: u.mobile_number ? `+91 ${u.mobile_number}` : FARMER_PROFILE.mobile,
          village: u.village || FARMER_PROFILE.village,
          district: u.district || FARMER_PROFILE.district,
          state: u.state || FARMER_PROFILE.state,
          initials: u.full_name
            ? u.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
            : FARMER_PROFILE.initials,
          verified: true,
        }
      }
    } catch (err) {
      // Ignore JSON error
    }
    return {
      ...FARMER_PROFILE,
      farmerId: FARMER_PROFILE.farmerId || 'N/A',
    }
  })

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await getFarmerDashboard()
        if (data && data.user) {
          const u = data.user
          setProfile({
            name: u.full_name || FARMER_PROFILE.name,
            farmerId: u.farmer_id || 'N/A',
            mobile: u.mobile_number ? `+91 ${u.mobile_number}` : FARMER_PROFILE.mobile,
            village: u.village || FARMER_PROFILE.village,
            district: u.district || FARMER_PROFILE.district,
            state: u.state || FARMER_PROFILE.state,
            initials: u.full_name
              ? u.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
              : FARMER_PROFILE.initials,
            verified: true,
          })
        }
      } catch (err) {
        // use existing/fallback profile
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [])

  const handleSave = (e) => {
    e.preventDefault()
    setIsEditing(false)
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logoutFarmer()
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      localStorage.removeItem('currentUser')
      window.location.href = '/login'
    }
  }

  return (
    <FarmerLayout activePath="/profile">
      <div className="profile-page-container">
        <h1 className="page-main-heading">My Profile</h1>

        {loading ? (
          <ProfileSkeleton />
        ) : (
          <div className="portal-card profile-main-card">
            {/* Avatar with Verified check */}
          <div className="profile-avatar-wrap">
            <div className="profile-avatar-circle">
              <span>{profile.initials}</span>
            </div>
            <div className="profile-verified-badge" title="Verified Farmer">
              <CheckCircle2 size={18} />
            </div>
          </div>

          {/* Key-Value Details */}
          {!isEditing ? (
            <div className="profile-details-table">
              <div className="profile-detail-row">
                <span className="profile-detail-key">Full Name</span>
                <span className="profile-detail-value">{profile.name}</span>
              </div>
              <div className="profile-detail-row">
                <span className="profile-detail-key">Mobile Number</span>
                <span className="profile-detail-value">{profile.mobile}</span>
              </div>
              <div className="profile-detail-row">
                <span className="profile-detail-key">Farmer ID</span>
                <span className="profile-detail-value">{profile.farmerId}</span>
              </div>
              <div className="profile-detail-row">
                <span className="profile-detail-key">Village</span>
                <span className="profile-detail-value">{profile.village}</span>
              </div>
              <div className="profile-detail-row">
                <span className="profile-detail-key">District</span>
                <span className="profile-detail-value">{profile.district}</span>
              </div>
              <div className="profile-detail-row">
                <span className="profile-detail-key">State</span>
                <span className="profile-detail-value">{profile.state}</span>
              </div>

              <div className="profile-action-center">
                <button
                  type="button"
                  className="profile-edit-btn"
                  onClick={() => setIsEditing(true)}
                >
                  Edit Profile
                </button>
                <button
                  type="button"
                  className="profile-logout-btn"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Logging out...</span>
                    </>
                  ) : (
                    <>
                      <LogOut size={16} />
                      <span>Log Out</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave} className="profile-edit-form">
              <div className="edit-field-group">
                <label>Full Name</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  required
                />
              </div>

              <div className="edit-field-group">
                <label>Mobile Number</label>
                <input
                  type="tel"
                  value={profile.mobile}
                  onChange={(e) => setProfile({ ...profile, mobile: e.target.value })}
                  required
                />
              </div>

              <div className="edit-field-group">
                <label>Village</label>
                <input
                  type="text"
                  value={profile.village}
                  onChange={(e) => setProfile({ ...profile, village: e.target.value })}
                  required
                />
              </div>

              <div className="edit-field-group">
                <label>District</label>
                <input
                  type="text"
                  value={profile.district}
                  onChange={(e) => setProfile({ ...profile, district: e.target.value })}
                  required
                />
              </div>

              <div className="edit-field-group">
                <label>State</label>
                <input
                  type="text"
                  value={profile.state}
                  onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                  required
                />
              </div>

              <div className="profile-form-buttons">
                <button
                  type="button"
                  className="step-btn outline"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="step-btn primary">
                  Save Changes
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
    </FarmerLayout>
  )
}
