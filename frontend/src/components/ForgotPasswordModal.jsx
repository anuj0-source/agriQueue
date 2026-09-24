import { useState, useEffect } from 'react'
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  IdCard,
  KeyRound,
  Loader2,
  Lock,
  X,
} from 'lucide-react'
import { forgetPassword } from '../api'

export default function ForgotPasswordModal({
  isOpen,
  onClose,
  initialMobile = '',
  initialRole = 'Farmer',
  onSuccess,
}) {
  const [role, setRole] = useState(initialRole)
  const [mobile, setMobile] = useState(initialMobile)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  // Sync initial props when opened
  useEffect(() => {
    if (isOpen) {
      setMobile(initialMobile || '')
      setRole(initialRole || 'Farmer')
      setNewPassword('')
      setConfirmPassword('')
      setError('')
      setIsSuccess(false)
      setShowPassword(false)
      setShowConfirmPassword(false)
    }
  }, [isOpen, initialMobile, initialRole])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isLoading, onClose])

  if (!isOpen) return null

  // Password strength helper
  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, text: '', color: '#e5e7eb' }
    let score = 0
    if (pass.length >= 6) score += 1
    if (pass.length >= 8) score += 1
    if (/[0-9]/.test(pass)) score += 1
    if (/[^A-Za-z0-9]/.test(pass) || /[A-Z]/.test(pass)) score += 1

    if (score <= 1) return { score: 1, text: 'Weak', color: '#ef4444' }
    if (score <= 2) return { score: 2, text: 'Fair', color: '#f59e0b' }
    if (score === 3) return { score: 3, text: 'Good', color: '#10b981' }
    return { score: 4, text: 'Strong', color: '#059669' }
  }

  const strength = getPasswordStrength(newPassword)
  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword
  const passwordMismatch = confirmPassword && newPassword !== confirmPassword

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const cleanMobile = mobile.replace(/\D/g, '').trim()
    if (!cleanMobile || cleanMobile.length !== 10) {
      setError('Please enter a valid 10-digit mobile number')
      return
    }

    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)

    try {
      await forgetPassword(cleanMobile, newPassword, role)
      setIsSuccess(true)
      if (onSuccess) {
        onSuccess({ mobile_number: cleanMobile, new_password: newPassword, role })
      }
    } catch (err) {
      setError(err.message || 'Failed to change password. Please check your details.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="forgot-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="forgot-modal-title"
      onClick={() => {
        if (!isLoading) onClose()
      }}
    >
      <div
        className="forgot-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          className="forgot-modal-close-btn"
          onClick={onClose}
          aria-label="Close modal"
          disabled={isLoading}
        >
          <X size={18} />
        </button>

        {!isSuccess ? (
          <>
            {/* Header Icon & Title */}
            <div className="forgot-modal-header">
              <div className="forgot-modal-icon-badge">
                <div className="forgot-modal-icon-glow" />
                <KeyRound size={26} className="forgot-modal-key-icon" strokeWidth={2.2} />
              </div>
              <h2 id="forgot-modal-title" className="forgot-modal-title">
                Reset Password
              </h2>
              <p className="forgot-modal-subtitle">
                Enter your registered mobile number and choose a new password for your account.
              </p>
            </div>

            {/* Role Pills */}
            <div className="forgot-modal-roles" role="group" aria-label="Select account role">
              {['Farmer', 'Staff', 'Admin'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`forgot-role-pill ${role === tab ? 'active' : ''}`}
                  onClick={() => setRole(tab)}
                  disabled={isLoading}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Error Banner */}
            {error && (
              <div className="forgot-modal-error" role="alert">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="forgot-modal-form" autoComplete="off">
              {/* Mobile Number */}
              <div className="forgot-field-group">
                <label htmlFor="forgot-mobile" className="forgot-field-label">
                  Registered Mobile Number
                </label>
                <div className="forgot-input-box">
                  <span className="forgot-input-icon" aria-hidden="true">
                    <IdCard size={18} strokeWidth={1.8} />
                  </span>
                  <span className="forgot-country-prefix">+91</span>
                  <input
                    id="forgot-mobile"
                    name="forgot_mobile"
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]{10}"
                    maxLength={10}
                    placeholder="Enter 10-digit mobile"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                    disabled={isLoading}
                    autoFocus
                    required
                  />
                </div>
              </div>

              {/* New Password */}
              <div className="forgot-field-group">
                <div className="forgot-field-header">
                  <label htmlFor="forgot-new-password" className="forgot-field-label">
                    New Password
                  </label>
                  {newPassword && (
                    <span
                      className="forgot-strength-text"
                      style={{ color: strength.color }}
                    >
                      {strength.text}
                    </span>
                  )}
                </div>
                <div className="forgot-input-box">
                  <span className="forgot-input-icon" aria-hidden="true">
                    <Lock size={17} strokeWidth={1.8} />
                  </span>
                  <input
                    id="forgot-new-password"
                    name="forgot_new_password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter new password (min. 6 chars)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isLoading}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="forgot-toggle-pass-btn"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>

                {/* Password Strength Bar */}
                {newPassword && (
                  <div className="forgot-strength-track">
                    <div
                      className="forgot-strength-fill"
                      style={{
                        width: `${(strength.score / 4) * 100}%`,
                        backgroundColor: strength.color,
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="forgot-field-group">
                <div className="forgot-field-header">
                  <label htmlFor="forgot-confirm-password" className="forgot-field-label">
                    Confirm New Password
                  </label>
                  {passwordsMatch && (
                    <span className="forgot-match-badge match">
                      <Check size={12} strokeWidth={2.5} /> Matches
                    </span>
                  )}
                  {passwordMismatch && (
                    <span className="forgot-match-badge mismatch">
                      Does not match
                    </span>
                  )}
                </div>
                <div className="forgot-input-box">
                  <span className="forgot-input-icon" aria-hidden="true">
                    <Lock size={17} strokeWidth={1.8} />
                  </span>
                  <input
                    id="forgot-confirm-password"
                    name="forgot_confirm_password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="forgot-toggle-pass-btn"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="forgot-modal-actions">
                <button
                  type="button"
                  className="forgot-btn-secondary"
                  onClick={onClose}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="forgot-btn-primary"
                  disabled={isLoading || (confirmPassword && !passwordsMatch)}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="spin-icon" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <span>Reset Password</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          /* Success Screen */
          <div className="forgot-success-view">
            <div className="forgot-success-icon-badge">
              <CheckCircle2 size={46} className="forgot-success-check-icon" strokeWidth={2.2} />
            </div>
            <h2 className="forgot-success-title">Password Changed!</h2>
            <p className="forgot-success-desc">
              Your password for account <strong>+91 {mobile}</strong> ({role}) has been successfully updated. You can now log in with your new password.
            </p>
            <button
              type="button"
              className="forgot-btn-primary forgot-success-btn"
              onClick={onClose}
            >
              <span>Back to Login</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
