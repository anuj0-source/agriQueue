import { useState } from 'react'
import { ArrowLeft, ChevronDown, LockKeyhole, Mail, MapPin, UserRound } from 'lucide-react'
import Brand from '../components/Brand'
import FormField from '../components/FormField'
import indiaDistricts from '../data/india-districts.json'

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
  const [selectedState, setSelectedState] = useState('')
  const [selectedDistrict, setSelectedDistrict] = useState('')
  const preventSubmit = (event) => event.preventDefault()
  const districts = selectedState ? districtsByState[selectedState] : []

  const selectState = (event) => {
    setSelectedState(event.target.value)
    setSelectedDistrict('')
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

          <form onSubmit={preventSubmit}>
            <FormField icon={UserRound} label="Full Name" placeholder="Enter your full name" />
            <FormField icon={Mail} label="Mobile Number" placeholder="10-digit mobile number" type="tel" />
            <FormField icon={LockKeyhole} label="Farmer ID (Optional)" placeholder="Enter farmer ID if available" required={false} />
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
            <FormField icon={MapPin} label="Village / Town" placeholder="Enter your village or town" />
            <label className="terms">
              <input type="checkbox" required />
              <span>I agree to the <a href="#terms">Terms &amp; Conditions</a> and <a href="#privacy">Privacy Policy</a></span>
            </label>
            <button className="register-button" type="submit">
              Create Account <span className="btn-arrow">→</span>
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

