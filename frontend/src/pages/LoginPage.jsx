import { useState } from 'react'
import { ArrowLeft, Building2, Eye, EyeOff, IdCard, Lock } from 'lucide-react'
import Brand from '../components/Brand'

export default function LoginPage() {
  const [role, setRole] = useState('Farmer')
  const [centerCode, setCenterCode] = useState('')
  const [mobile, setMobile] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    alert(`Logging in as ${role}${role === 'Staff' ? ` (Center: ${centerCode})` : ''} with mobile: ${mobile}`)
  }

  return (
    <main className="login-page">
      {/* ─── Left Visual Panel ─── */}
      <aside className="login-visual-panel" aria-label="Scenic farm landscape">
        <div className="login-visual-overlay" />
        <div className="login-visual-text">
          <h2 className="login-visual-title">
            Empowering<br />
            Farmers
          </h2>
          <p className="login-visual-desc">
            Building a Stronger<br />
            Tomorrow
          </p>
        </div>
      </aside>

      {/* ─── Right Form Panel ─── */}
      <section className="login-form-panel">
        <a className="login-back-link" href="/" aria-label="Back to Home">
          <ArrowLeft size={15} /> Back to Home
        </a>

        <div className="login-form-content">
          {/* AgriQueue Brand Logo */}
          <Brand />

          {/* Welcome Headings */}
          <h1 className="login-heading">Welcome Back</h1>
          <p className="login-subheading">Login to continue</p>

          {/* Role Tabs */}
          <div className="login-role-tabs" role="tablist" aria-label="Select your role">
            {['Farmer', 'Staff', 'Admin'].map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={role === tab}
                className={`login-role-tab ${role === tab ? 'active' : ''}`}
                onClick={() => setRole(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="login-form" autoComplete="off">
            {/* Hidden dummy fields to block browser auto-fill managers */}
            <input type="text" name="prevent_autofill_user" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" />
            <input type="password" name="prevent_autofill_pass" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" />

            {/* Procurement Center Code (Staff tab only) */}
            {role === 'Staff' && (
              <div className="login-field-group">
                <label className="login-field-label" htmlFor="login-center-code">
                  Procurement Center Code
                </label>
                <div className="login-input-box">
                  <span className="login-input-lock-icon" aria-hidden="true">
                    <Building2 size={17} strokeWidth={1.8} />
                  </span>
                  <input
                    id="login-center-code"
                    name="procurement_center_code"
                    type="text"
                    placeholder="Enter procurement center code"
                    value={centerCode}
                    onChange={(e) => setCenterCode(e.target.value)}
                    autoComplete="off"
                    required
                  />
                </div>
              </div>
            )}

            {/* Mobile Number Field */}
            <div className="login-field-group">
              <label className="login-field-label" htmlFor="login-mobile">
                Mobile Number
              </label>
              <div className="login-input-box">
                <span className="login-input-badge-icon" aria-hidden="true">
                  <IdCard size={18} strokeWidth={1.8} />
                </span>
                <span className="login-country-prefix">+91</span>
                <input
                  id="login-mobile"
                  name="agri_mobile"
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]{10}"
                  maxLength={10}
                  placeholder="Enter your mobile number"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                  autoComplete="off"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="login-field-group">
              <label className="login-field-label" htmlFor="login-password">
                Password
              </label>
              <div className="login-input-box">
                <span className="login-input-lock-icon" aria-hidden="true">
                  <Lock size={17} strokeWidth={1.8} />
                </span>
                <input
                  id="login-password"
                  name="agri_password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="login-toggle-password-btn"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff size={18} strokeWidth={1.8} />
                  ) : (
                    <Eye size={18} strokeWidth={1.8} />
                  )}
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="login-forgot-row">
              <a href="#forgot-password" className="login-forgot-link">
                Forgot Password?
              </a>
            </div>

            {/* Submit Button */}
            <button type="submit" className="login-submit-button">
              Login
            </button>
          </form>

          {/* Register Link */}
          <p className="login-register-prompt">
            Don't have an account?{' '}
            <a href="/create-account" className="login-register-link">
              Register
            </a>
          </p>
        </div>
      </section>
    </main>
  )
}
