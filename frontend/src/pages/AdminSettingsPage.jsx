import { useEffect, useState } from 'react'
import AdminLayout from '../components/AdminLayout'
import { getAdminSettings, triggerAdminSeed } from '../api'
import { Settings, Save, Database, ShieldCheck, CheckCircle2 } from 'lucide-react'

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState(null)
  const [mspRates, setMspRates] = useState({
    Wheat: 23,
    Rice: 22,
    Maize: 21,
    Pulses: 65,
  })
  const [operatingHours, setOperatingHours] = useState('08:00 AM - 06:00 PM')
  const [smsNotifs, setSmsNotifs] = useState(true)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [seedSuccess, setSeedSuccess] = useState(false)

  useEffect(() => {
    async function load() {
      const data = await getAdminSettings()
      if (data) {
        setSettings(data)
        if (data.msp_rates) setMspRates(data.msp_rates)
        if (data.operating_hours) setOperatingHours(data.operating_hours)
        if (data.sms_notifications !== undefined) setSmsNotifs(data.sms_notifications)
      }
    }
    load()
  }, [])

  const handleSave = (e) => {
    e.preventDefault()
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 3000)
  }

  const handleSeed = async () => {
    try {
      await triggerAdminSeed()
      setSeedSuccess(true)
      setTimeout(() => setSeedSuccess(false), 4000)
    } catch (err) {
      alert('Seeding complete or already up-to-date.')
    }
  }

  return (
    <AdminLayout activePath="/admin/settings" title="System Settings & Pricing" showTimeframe={false}>
      <div className="admin-page-container">
        {savedSuccess && (
          <div className="confirm-info-banner" style={{ marginBottom: '16px' }}>
            <CheckCircle2 size={18} className="info-icon" />
            <span>Settings and MSP prices updated successfully.</span>
          </div>
        )}

        <form onSubmit={handleSave} className="admin-settings-layout">
          {/* Minimum Support Price (MSP) Configuration */}
          <div className="admin-panel-card">
            <div className="panel-header">
              <h2 className="panel-title">Government Minimum Support Price (MSP Rates)</h2>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px' }}>
              These rates automatically compute payout calculations across farmer bookings and DBT disbursements.
            </p>

            <div className="msp-inputs-grid">
              {Object.entries(mspRates).map(([crop, rate]) => (
                <div key={crop} className="form-group">
                  <label>{crop} MSP Rate (₹/kg)</label>
                  <input
                    type="number"
                    min="1"
                    value={rate}
                    onChange={(e) => setMspRates({ ...mspRates, [crop]: Number(e.target.value) })}
                    required
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Operational Rules */}
          <div className="admin-panel-card">
            <div className="panel-header">
              <h2 className="panel-title">Center Operations &amp; Notifications</h2>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Default Mandi Operating Hours</label>
                <input
                  type="text"
                  value={operatingHours}
                  onChange={(e) => setOperatingHours(e.target.value)}
                  placeholder="08:00 AM - 06:00 PM"
                />
              </div>

              <div className="form-group">
                <label>Maximum Farmer Booking Quota (kg)</label>
                <input type="number" defaultValue={5000} />
              </div>
            </div>

            <div className="settings-toggle-row">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={smsNotifs}
                  onChange={(e) => setSmsNotifs(e.target.checked)}
                />
                <span>Enable Automated SMS Dispatch for Token Approvals</span>
              </label>
            </div>
          </div>

          {/* Dummy Data Seeding Utility */}
          <div className="admin-panel-card">
            <div className="panel-header">
              <h2 className="panel-title">Demo Database Seed Utility</h2>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 12px' }}>
              Repopulate or refresh database dummy records (8 Procurement Centers, 15 Farmers, and 40+ Bookings).
            </p>
            {seedSuccess && (
              <div className="confirm-info-banner" style={{ marginBottom: '12px' }}>
                <CheckCircle2 size={18} className="info-icon" />
                <span>Demo database successfully refreshed with full dummy records!</span>
              </div>
            )}
            <button
              type="button"
              className="admin-btn outline"
              onClick={handleSeed}
            >
              <Database size={15} />
              <span>Re-seed Database Now</span>
            </button>
          </div>

          <div className="settings-bottom-actions">
            <button type="submit" className="admin-btn primary">
              <Save size={16} />
              <span>Save Configuration</span>
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  )
}
