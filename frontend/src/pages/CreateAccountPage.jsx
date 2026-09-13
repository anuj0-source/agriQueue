import { useState, useEffect } from 'react'
import { AlertCircle, ArrowLeft, CheckCircle2, ChevronDown, LockKeyhole, Mail, MapPin, UserRound } from 'lucide-react'
import Brand from '../components/Brand'
import FormField from '../components/FormField'
import indiaDistricts from '../data/india-districts.json'
import { createFarmerAccount, checkAuthSession } from '../api'

const districtsByState = indiaDistricts.districts.reduce((locations, { state, district }) => {
  if (!locations[state]) locations[state] = []
  locations[state].push(district)
  return locations
}, {})

const states = Object.keys(districtsByState).sort((a, b) => a.localeCompare(b))
Object.values(districtsByState).forEach((districts) => districts.sort((a, b) => a.localeCompare(b)))

function LocationSelect({ label, placeholder, options, value, onChange, disabled = false }) {
  return (
    <FormField label={label}>
      <select value={value} onChange={onChange} disabled={disabled} required>
        <option value="" disabled>{placeholder}</option>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
      <ChevronDown aria-hidden="true" className="select-arrow" />
    </FormField>
  )
}

export default function CreateAccountPage() {
  const [fullName, setFullName] = useState('')
  const [mobile, setMobile] = useState('')
  const [farmerId, setFarmerId] = useState('')
  const [selectedState, setSelectedState] = useState('')
  const [selectedDistrict, setSelectedDistrict] = useState('')
  const [village, setVillage] = useState('')
  const [password, setPassword] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    async function verifySession() {
      const session = await checkAuthSession()
      if (session && session.authenticated) {
        if (session.role === 'admin' || session.user?.role === 'admin') {
          window.location.href = '/admin'
        } else {
          window.location.href = '/dashboard'
        }
      }
    }
    verifySession()
  }, [])

  const districts = selectedState ? districtsByState[selectedState] : []

  const selectState = (event) => {
    setSelectedState(event.target.value)
    setSelectedDistrict('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (mobile.length !== 10) {
      setError('Please enter a valid 10-digit mobile number')
      return
    }

    if (!selectedState || !selectedDistrict) {
      setError('Please select your state and district')
      return
    }

    if (!password || password.length < 4) {
      setError('Please enter a password with at least 4 characters')
      return
    }

    if (!termsAccepted) {
      setError('Please agree to the Terms & Conditions')
      return
    }

    setIsLoading(true)
    try {
      await createFarmerAccount({
        full_name: fullName.trim(),
        mobile_number: mobile.trim(),
        farmer_id: farmerId.trim() || null,
        state: selectedState,
        district: selectedDistrict,
        village: village.trim(),
        password: password,
      })

      setSuccess('Account created successfully! Redirecting to login...')
      setTimeout(() => {
        window.location.href = '/login'
      }, 1200)
    } catch (err) {
      setError(err.message || 'Failed to create account. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="signup-page">
      {/* ─── Form Panel ─────────────────────────────── */}
      <section className="form-panel">
        <div className="form-panel-top">
          <Brand />
          <a className="form-back" href="/">
            <ArrowLeft aria-hidden="true" /> Back to Home
          </a>
        </div>

        <div className="form-content">
          <div className="form-heading">
            <h1>Create Farmer Account</h1>
            <p>Register as a farmer and access better markets, fair prices, and faster payments.</p>
          </div>

          {/* Step progress dots */}
          <div className="form-steps" aria-label="Registration progress">
            <div className="form-step-dot active" />
            <div className="form-step-dot" />
            <div className="form-step-dot" />
          </div>

          {/* Feedback Banners */}
          {error && (
            <div className="auth-error-banner" role="alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="auth-success-banner" role="status">
              <CheckCircle2 size={16} />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} autoComplete="off">
            {/* Off-screen dummy inputs to absorb browser password manager auto-fill */}
            <div style={{ position: 'absolute', opacity: 0, height: 0, width: 0, overflow: 'hidden', zIndex: -1 }} aria-hidden="true">
              <input type="text" name="fake_username_autofill" tabIndex={-1} autoComplete="off" />
              <input type="password" name="fake_password_autofill" tabIndex={-1} autoComplete="new-password" />
            </div>

            <FormField
              icon={UserRound}
              label="Full Name"
              name="farmer_full_name"
              id="farmer_full_name"
              autoComplete="off"
              placeholder="Enter your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <FormField
              icon={Mail}
              label="Mobile Number"
              name="farmer_mobile"
              id="farmer_mobile"
              autoComplete="off"
              placeholder="10-digit mobile number"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
              required
            />
            <FormField
              icon={LockKeyhole}
              label="Farmer ID (Optional)"
              name="farmer_id_input"
              id="farmer_id_input"
              autoComplete="off"
              placeholder="Enter farmer ID if available"
              value={farmerId}
              onChange={(e) => setFarmerId(e.target.value)}
              required={false}
            />
            <div className="field-row">
              <LocationSelect
                label="State"
                placeholder="Select State"
                options={states}
                value={selectedState}
                onChange={selectState}
              />
              <LocationSelect
                label="District"
                placeholder="Select District"
                options={districts}
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                disabled={!selectedState}
              />
            </div>
            <FormField
              icon={MapPin}
              label="Village / Town"
              name="farmer_village"
              id="farmer_village"
              autoComplete="off"
              placeholder="Enter your village or town"
              value={village}
              onChange={(e) => setVillage(e.target.value)}
              required
            />
            <FormField
              icon={LockKeyhole}
              label="Password"
              name="farmer_registration_password"
              id="farmer_registration_password"
              autoComplete="new-password"
              type="password"
              placeholder="Create a secure password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <label className="terms">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                required
              />
              <span>I agree to the <a href="#terms">Terms &amp; Conditions</a> and <a href="#privacy">Privacy Policy</a></span>
            </label>
            <button className="register-button" type="submit" disabled={isLoading}>
              {isLoading ? 'Creating Account...' : (
                <>
                  Create Account <span className="btn-arrow">→</span>
                </>
              )}
            </button>
          </form>

          <p className="signin">Already have an account? <a href="/login">Login here</a></p>
        </div>
      </section>

      {/* ─── Visual Panel ───────────────────────────── */}
      <aside className="visual-panel" aria-label="Farmer in a field">
      </aside>
    </main>
  )
}

