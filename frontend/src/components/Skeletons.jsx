import React from 'react'

export function Skeleton({ width, height, borderRadius, circle = false, className = '', style = {} }) {
  const inlineStyles = {
    width: width || '100%',
    height: height || '16px',
    borderRadius: circle ? '50%' : borderRadius || '6px',
    ...style,
  }

  return (
    <div
      className={`skeleton-box ${circle ? 'skeleton-circle' : ''} ${className}`}
      style={inlineStyles}
      aria-hidden="true"
    />
  )
}

export function DashboardSkeleton() {
  return (
    <div className="dashboard-container skeleton-page">
      {/* Welcome Header Skeleton */}
      <div className="skeleton-dashboard-welcome">
        <Skeleton width="280px" height="32px" borderRadius="8px" />
        <Skeleton width="380px" height="16px" borderRadius="4px" />
      </div>

      {/* Top 3 Summary Metrics Skeleton */}
      <div className="dashboard-metrics-grid">
        {[1, 2, 3].map((i) => (
          <div key={i} className="metric-card skeleton-metric-card">
            <Skeleton width="60px" height="36px" borderRadius="8px" />
            <Skeleton width="130px" height="14px" borderRadius="4px" />
          </div>
        ))}
      </div>

      {/* Quick Actions Card Skeleton */}
      <div className="portal-card quick-actions-card">
        <div style={{ marginBottom: '16px' }}>
          <Skeleton width="120px" height="20px" borderRadius="6px" />
        </div>
        <div className="quick-actions-row">
          <Skeleton width="130px" height="42px" borderRadius="8px" />
          <Skeleton width="140px" height="42px" borderRadius="8px" />
          <Skeleton width="130px" height="42px" borderRadius="8px" />
        </div>
      </div>

      {/* Upcoming Booking Section Skeleton */}
      <div className="portal-card upcoming-booking-section">
        <div className="upcoming-header-row">
          <div className="upcoming-header-title-group">
            <Skeleton width="160px" height="22px" borderRadius="6px" />
            <Skeleton width="90px" height="22px" borderRadius="12px" />
          </div>
          <Skeleton width="60px" height="16px" borderRadius="4px" />
        </div>

        <div className="skeleton-booking-card">
          <div className="skeleton-booking-left">
            <Skeleton width="48px" height="48px" borderRadius="14px" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <Skeleton width="140px" height="20px" borderRadius="6px" />
              <Skeleton width="220px" height="14px" borderRadius="4px" />
            </div>
          </div>

          <div className="skeleton-booking-middle">
            <Skeleton width="110px" height="32px" borderRadius="20px" />
            <Skeleton width="130px" height="32px" borderRadius="20px" />
          </div>

          <div className="skeleton-booking-right">
            <Skeleton width="80px" height="12px" borderRadius="4px" />
            <Skeleton width="70px" height="24px" borderRadius="6px" />
            <Skeleton width="90px" height="18px" borderRadius="10px" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function CenterCardsSkeleton({ count = 3 }) {
  return (
    <div className="centers-list">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="skeleton-center-card">
          <Skeleton width="90px" height="90px" borderRadius="12px" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Skeleton width="60%" height="22px" borderRadius="6px" />
            <Skeleton width="45%" height="14px" borderRadius="4px" />
            <Skeleton width="30%" height="12px" borderRadius="4px" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
            <Skeleton width="120px" height="24px" borderRadius="12px" />
            <Skeleton width="90px" height="38px" borderRadius="8px" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function SlotPickerSkeleton() {
  return (
    <div className="step-content step-2-datetime" style={{ marginTop: '20px' }}>
      <div style={{ display: 'flex', gap: '20px', marginBottom: '24px' }}>
        <Skeleton width="100%" height="60px" borderRadius="12px" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
        <div className="portal-card" style={{ padding: '24px' }}>
          <Skeleton width="180px" height="24px" borderRadius="6px" style={{ marginBottom: '16px' }} />
          <Skeleton width="100%" height="260px" borderRadius="12px" />
        </div>
        <div className="portal-card" style={{ padding: '24px' }}>
          <Skeleton width="180px" height="24px" borderRadius="6px" style={{ marginBottom: '16px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} width="100%" height="48px" borderRadius="10px" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function BookingsListSkeleton({ count = 3 }) {
  return (
    <div className="bookings-list" style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="skeleton-booking-card">
          <div className="skeleton-booking-left">
            <Skeleton width="48px" height="48px" borderRadius="14px" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Skeleton width="100px" height="20px" borderRadius="6px" />
                <Skeleton width="60px" height="16px" borderRadius="4px" />
              </div>
              <Skeleton width="220px" height="14px" borderRadius="4px" />
            </div>
          </div>

          <div className="skeleton-booking-middle">
            <Skeleton width="110px" height="32px" borderRadius="20px" />
            <Skeleton width="130px" height="32px" borderRadius="20px" />
          </div>

          <div className="skeleton-booking-right">
            <Skeleton width="80px" height="12px" borderRadius="4px" />
            <Skeleton width="70px" height="24px" borderRadius="6px" />
            <Skeleton width="90px" height="18px" borderRadius="10px" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function LiveQueueSkeleton() {
  return (
    <div className="live-queue-container skeleton-page">
      {/* Header Skeleton */}
      <div className="live-queue-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Skeleton width="320px" height="32px" borderRadius="8px" />
          <Skeleton width="160px" height="16px" borderRadius="4px" />
        </div>
        <Skeleton width="70px" height="28px" borderRadius="20px" />
      </div>

      {/* Dual Cards */}
      <div className="queue-status-grid">
        <div className="queue-card now-serving-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Skeleton width="100px" height="14px" borderRadius="4px" />
          <Skeleton width="140px" height="52px" borderRadius="10px" />
        </div>
        <div className="queue-card your-token-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Skeleton width="90px" height="14px" borderRadius="4px" />
          <Skeleton width="150px" height="42px" borderRadius="10px" />
          <Skeleton width="120px" height="16px" borderRadius="4px" />
          <Skeleton width="180px" height="14px" borderRadius="4px" />
        </div>
      </div>

      {/* Upcoming Tokens List Skeleton */}
      <div className="portal-card upcoming-tokens-card">
        <div style={{ marginBottom: '16px' }}>
          <Skeleton width="140px" height="22px" borderRadius="6px" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                background: '#fafbf9',
                borderRadius: '8px',
              }}
            >
              <Skeleton width="80px" height="20px" borderRadius="6px" />
              <Skeleton width="90px" height="22px" borderRadius="12px" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function TableRowsSkeleton({ rows = 5, columns = 6 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={rIdx} className="skeleton-table-row">
          {Array.from({ length: columns }).map((_, cIdx) => (
            <td key={cIdx}>
              <Skeleton
                width={cIdx === 0 ? '70%' : cIdx === columns - 1 ? '50%' : '85%'}
                height="18px"
                borderRadius="4px"
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

export function ProfileSkeleton() {
  return (
    <div className="portal-card profile-main-card">
      <div className="profile-avatar-wrap">
        <Skeleton width="88px" height="88px" circle />
      </div>

      <div className="profile-details-table">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="profile-detail-row">
            <Skeleton width="120px" height="16px" borderRadius="4px" />
            <Skeleton width="200px" height="16px" borderRadius="4px" />
          </div>
        ))}

        <div className="profile-action-center" style={{ marginTop: '24px' }}>
          <Skeleton width="140px" height="42px" borderRadius="8px" />
        </div>
      </div>
    </div>
  )
}
