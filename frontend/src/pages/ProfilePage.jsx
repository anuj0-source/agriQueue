import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import FarmerLayout from '../components/FarmerLayout'
import { FARMER_PROFILE } from '../data/farmer-data'

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false)
  const [profile, setProfile] = useState(FARMER_PROFILE)

  const handleSave = (e) => {
    e.preventDefault()
    setIsEditing(false)
  }

  return (
    <FarmerLayout activePath="/profile">
      <div className="profile-page-container">
        <h1 className="page-main-heading">My Profile</h1>

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
      </div>
    </FarmerLayout>
  )
}
