import { useState } from 'react'
import { ChevronDown, LockKeyhole, Mail, MapPin, Phone, UserRound } from 'lucide-react'
import Brand from '../components/Brand'
import FormField from '../components/FormField'
import indiaDistricts from '../data/india-districts.json'

const districtsByState = indiaDistricts.districts.reduce((locations, { state, district }) => {
  if (!locations[state]) locations[state] = []
  locations[state].push(district)
  return locations
}, {})

const states = Object.keys(districtsByState).sort((first, second) => first.localeCompare(second))
Object.values(districtsByState).forEach((districts) => districts.sort((first, second) => first.localeCompare(second)))

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
      <section className="form-panel">
        <Brand />
        <div className="form-content">
          <div className="form-heading"><h1>Create Farmer Account</h1><p>Register as a farmer and access better markets.</p></div>
          <form onSubmit={preventSubmit}>
            <FormField icon={UserRound} label="Full Name" placeholder="Enter your full name" />
            <FormField icon={Mail} label="Mobile Number" placeholder="Enter your mobile number" type="tel" />
            <FormField icon={LockKeyhole} label="Farmer ID (Optional)" placeholder="Enter farmer ID" required={false} />
            <div className="field-row">
              <LocationSelect label="State" placeholder="Select State" options={states} value={selectedState} onChange={selectState} />
              <LocationSelect label="District" placeholder="Select District" options={districts} value={selectedDistrict} onChange={(event) => setSelectedDistrict(event.target.value)} disabled={!selectedState} />
            </div>
            <FormField icon={MapPin} label="Village" placeholder="Enter your village name" />
            <label className="terms"><input type="checkbox" required /><span>I agree to the <a href="#terms">Terms &amp; Conditions</a></span></label>
            <button className="register-button" type="submit">Register <span>→</span></button>
          </form>
          <p className="signin">Already have an account? <a href="#login">Login here</a></p>
        </div>
      </section>
      <aside className="visual-panel" aria-label="Farmer in a field">
        {/* <div className="visual-note"><Phone aria-hidden="true" /><span>Need help?<br /><b>+91 1800 123 4567</b></span></div> */}
      </aside>
    </main>
  )
}
