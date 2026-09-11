import { useState, useEffect } from 'react'
import { Lock, ArrowRight, ShieldAlert } from 'lucide-react'

export default function AuthModal({
  isOpen,
  title = 'Authentication Required',
  message = 'You are not logged in or your session has expired. Please log in to continue.',
  redirectDelay = 3,
  onLogin,
}) {
  const [countdown, setCountdown] = useState(redirectDelay)

  const handleRedirect = () => {
    if (onLogin) {
      onLogin()
    } else {
      window.location.href = '/login'
    }
  }

  useEffect(() => {
    if (!isOpen) return

    setCountdown(redirectDelay)
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          handleRedirect()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isOpen, redirectDelay])

  if (!isOpen) return null

  return (
    <div className="auth-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
      <div className="auth-modal-card">
        {/* Glow & Icon */}
        <div className="auth-modal-icon-wrapper">
          <div className="auth-modal-icon-ring" />
          <div className="auth-modal-icon-badge">
            <Lock size={28} className="auth-modal-lock" strokeWidth={2.2} />
          </div>
        </div>

        {/* Title & Description */}
        <h2 id="auth-modal-title" className="auth-modal-title">
          {title}
        </h2>
        <p className="auth-modal-message">
          {message}
        </p>

        {/* Countdown Pill & Progress */}
        <div className="auth-modal-countdown-box">
          <div className="auth-modal-countdown-label">
            Redirecting to login in <span className="auth-modal-seconds">{countdown}s</span>
          </div>
          <div className="auth-modal-progress-track">
            <div
              className="auth-modal-progress-bar"
              style={{
                animationDuration: `${redirectDelay}s`,
              }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="auth-modal-actions">
          <button
            type="button"
            className="auth-modal-btn primary"
            onClick={handleRedirect}
          >
            <span>Log In Now</span>
            <ArrowRight size={16} />
          </button>
          <a href="/" className="auth-modal-btn ghost">
            Back to Home
          </a>
        </div>
      </div>
    </div>
  )
}
