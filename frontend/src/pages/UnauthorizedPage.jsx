import { ShieldAlert, Lock, ArrowLeft, LogIn, Home, RefreshCw, AlertTriangle } from 'lucide-react'

export function UnauthorizedView({
  status = 403,
  title = 'Access Restricted',
  message,
  requiredRole,
  currentRole,
  currentUser,
  path = window.location.pathname,
  onRetry,
}) {
  const user = currentUser || (() => {
    try {
      const stored = localStorage.getItem('currentUser')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })()

  const detectedRole = currentRole || user?.role || (user ? 'User' : 'Guest')
  const isGuest = !user

  // Tailored default message
  const defaultMessage = isGuest
    ? `You must be signed in with an authorized ${requiredRole ? `"${requiredRole}"` : ''} account to access this page.`
    : `Your current account (${user?.full_name || 'Signed In'} · ${detectedRole.toUpperCase()}) does not have permission to view this restricted page.`

  const displayMessage = message || defaultMessage

  const handleSwitchAccount = () => {
    localStorage.removeItem('currentUser')
    const redirectUrl = encodeURIComponent(path + (window.location.search || ''))
    window.location.href = `/login?redirect=${redirectUrl}${requiredRole ? `&role=${encodeURIComponent(requiredRole)}` : ''}`
  }

  const handleGoToMyDashboard = () => {
    const r = detectedRole.toLowerCase()
    if (r === 'admin') {
      window.location.href = '/admin'
    } else if (r === 'staff') {
      window.location.href = '/staff'
    } else if (r === 'farmer') {
      window.location.href = '/dashboard'
    } else {
      window.location.href = '/'
    }
  }

  const handleGoHome = () => {
    window.location.href = '/'
  }

  const handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back()
    } else {
      handleGoHome()
    }
  }

  return (
    <div className="unauth-wrapper">
      <div className="unauth-backdrop-glow" />
      <div className="unauth-card" role="alert" aria-live="assertive">
        
        {/* Animated Security Icon */}
        <div className="unauth-icon-container">
          <div className="unauth-pulse-ring" />
          <div className="unauth-icon-circle">
            {isGuest ? (
              <Lock size={38} className="unauth-icon lock-icon" />
            ) : (
              <ShieldAlert size={38} className="unauth-icon shield-icon" />
            )}
          </div>
        </div>

        {/* Status Badge */}
        <div className="unauth-badge-row">
          <span className={`unauth-status-pill ${status === 401 ? 'pill-401' : 'pill-403'}`}>
            <span className="unauth-dot" />
            HTTP {status} — {status === 401 ? 'UNAUTHORIZED' : 'ACCESS FORBIDDEN'}
          </span>
          {requiredRole && (
            <span className="unauth-role-pill">
              Requires: <strong>{requiredRole}</strong>
            </span>
          )}
        </div>

        {/* Heading & Explanation */}
        <h1 className="unauth-title">{title}</h1>
        <p className="unauth-desc">{displayMessage}</p>

        {/* Route & Session Inspector Card */}
        <div className="unauth-meta-box">
          <div className="unauth-meta-row">
            <span className="unauth-meta-label">Attempted Route:</span>
            <code className="unauth-meta-code">{path}{window.location.search || ''}</code>
          </div>
          <div className="unauth-meta-row">
            <span className="unauth-meta-label">Current Session:</span>
            <span className="unauth-meta-value">
              {user ? (
                <>
                  <span className="unauth-user-name">{user.full_name || 'User'}</span>
                  <span className="unauth-user-role">({user.role || 'Member'})</span>
                </>
              ) : (
                <span className="unauth-guest-text">Not Logged In (Guest Session)</span>
              )}
            </span>
          </div>
          <div className="unauth-meta-row">
            <span className="unauth-meta-label">Access Policy:</span>
            <span className="unauth-meta-value policy-text">
              {requiredRole ? `Strict role-based access control (${requiredRole} only)` : 'Protected endpoint'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="unauth-actions">
          {isGuest ? (
            <button
              type="button"
              className="unauth-btn unauth-btn-primary"
              onClick={handleSwitchAccount}
            >
              <LogIn size={16} />
              <span>Sign In to Continue</span>
            </button>
          ) : (
            <button
              type="button"
              className="unauth-btn unauth-btn-primary"
              onClick={handleSwitchAccount}
            >
              <RefreshCw size={16} />
              <span>Switch Account ({requiredRole || 'Authorized'})</span>
            </button>
          )}

          {!isGuest && (
            <button
              type="button"
              className="unauth-btn unauth-btn-secondary"
              onClick={handleGoToMyDashboard}
            >
              <span>Return to My Dashboard</span>
            </button>
          )}

          <button
            type="button"
            className="unauth-btn unauth-btn-outline"
            onClick={handleGoBack}
          >
            <ArrowLeft size={16} />
            <span>Go Back</span>
          </button>

          <button
            type="button"
            className="unauth-btn unauth-btn-ghost"
            onClick={handleGoHome}
          >
            <Home size={15} />
            <span>AgriQueue Home</span>
          </button>
        </div>

        {/* Security Notice */}
        <div className="unauth-footer">
          <AlertTriangle size={13} className="unauth-footer-icon" />
          <span>If you believe this is in error, contact your district procurement administrator.</span>
        </div>
      </div>
    </div>
  )
}

export default function UnauthorizedPage(props) {
  return (
    <div className="unauthorized-page-screen">
      <UnauthorizedView {...props} />
    </div>
  )
}
