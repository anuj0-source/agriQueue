import { useState, useEffect, useRef } from 'react'
import { Ticket, Wifi, WifiOff, Loader2, ClipboardList, Building2, MapPin, ArrowLeft, ArrowRight, Radio } from 'lucide-react'
import FarmerLayout from '../components/FarmerLayout'
import { LiveQueueSkeleton } from '../components/Skeletons'
import { useQueueSSE } from '../hooks/useQueueSSE'
import { useNotifications } from '../context/NotificationContext'
import { getActiveFarmerCenters } from '../api'

export default function LiveQueuePage() {
  const [bookedCenters, setBookedCenters] = useState([])
  const [selectedCenterId, setSelectedCenterId] = useState(null)
  const [loadingCenters, setLoadingCenters] = useState(true)
  const { addNotification } = useNotifications()

  useEffect(() => {
    getActiveFarmerCenters().then(list => {
      const booked = Array.isArray(list) ? list : []
      setBookedCenters(booked)

      // Only auto-open if ?center_id=... is explicitly in URL (e.g. from Track Live Queue button)
      const searchParams = new URLSearchParams(window.location.search)
      const queryId = searchParams.get('center_id') ? parseInt(searchParams.get('center_id')) : null

      if (queryId && booked.some(c => c.id === queryId)) {
        setSelectedCenterId(queryId)
      } else {
        setSelectedCenterId(null)
      }
      setLoadingCenters(false)
    }).catch(err => {
      console.error('Failed to load centers:', err)
      setLoadingCenters(false)
    })
  }, [])

  // Sync browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const searchParams = new URLSearchParams(window.location.search)
      const queryId = searchParams.get('center_id') ? parseInt(searchParams.get('center_id')) : null
      setSelectedCenterId(queryId)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const handleSelectCenter = (id) => {
    setSelectedCenterId(id)
    const url = new URL(window.location)
    url.searchParams.set('center_id', id)
    window.history.pushState(null, '', url.toString())
  }

  const handleBackToCenters = () => {
    setSelectedCenterId(null)
    const url = new URL(window.location)
    url.searchParams.delete('center_id')
    window.history.pushState(null, '', url.pathname)
  }

  if (loadingCenters) {
    return (
      <FarmerLayout activePath="/live-queue">
        <LiveQueueSkeleton />
      </FarmerLayout>
    )
  }

  // 1. NO BOOKINGS AT ANY CENTER
  if (bookedCenters.length === 0) {
    return (
      <FarmerLayout activePath="/live-queue">
        <div style={{
          padding: '64px 24px',
          textAlign: 'center',
          maxWidth: '560px',
          margin: '40px auto',
          background: '#ffffff',
          borderRadius: '16px',
          border: '1.5px dashed #cbd5e1',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
        }}>
          <div style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            background: '#f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            color: '#64748b',
          }}>
            <ClipboardList size={34} />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
            No Bookings, No Active Queue
          </h2>
          <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.6, marginBottom: '24px' }}>
            You do not have any active or scheduled bookings at any procurement center. Once you book a slot, you can track your token and queue progress here in real time.
          </p>
          <a
            href="/book-slot"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              borderRadius: '8px',
              background: '#075533',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '14px',
              textDecoration: 'none',
              boxShadow: '0 2px 6px rgba(7, 85, 51, 0.25)',
              transition: 'background 0.15s ease',
            }}
          >
            <span>Book a Slot Now</span>
            <ArrowRight size={16} />
          </a>
        </div>
      </FarmerLayout>
    )
  }

  // 2. USER HAS BOOKINGS BUT HAS NOT CLICKED A CENTER YET -> SHOW LIST OF CENTERS
  if (selectedCenterId === null) {
    return (
      <FarmerLayout activePath="/live-queue">
        <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '32px' }}>
          {/* Header */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h1 className="page-main-heading" style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                  <Radio size={24} color="#075533" />
                  <span>Live Queue</span>
                </h1>
                <p className="page-sub-heading" style={{ marginTop: '4px' }}>
                  Select a procurement center below to track its real-time queue and token status.
                </p>
              </div>
              <div style={{
                padding: '6px 14px',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#065f46',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <Building2 size={15} />
                <span>{bookedCenters.length} {bookedCenters.length === 1 ? 'Center' : 'Centers'} with Bookings</span>
              </div>
            </div>
          </div>

          {/* Centers Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: '20px',
          }}>
            {bookedCenters.map((center) => {
              return (
                <div
                  key={center.id}
                  onClick={() => handleSelectCenter(center.id)}
                  className="booked-center-card"
                  style={{
                    background: '#ffffff',
                    borderRadius: '16px',
                    border: center.isActive ? '1.5px solid #a7f3d0' : '1.5px solid #e2e8f0',
                    padding: '22px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    {/* Top: Icon + Name + Location + Status */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '12px',
                          background: center.isActive ? '#ecfdf5' : '#f1f5f9',
                          color: center.isActive ? '#075533' : '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <Building2 size={22} />
                        </div>
                        <div>
                          <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#1e293b', margin: 0, lineHeight: 1.3 }}>
                            {center.name}
                          </h3>
                          {center.address && (
                            <p style={{ fontSize: '13px', color: '#64748b', margin: '3px 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <MapPin size={13} style={{ flexShrink: 0 }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }}>
                                {center.address}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Status Pill */}
                      {center.isActive ? (
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: center.activeStatus === 'Serving' ? '#fef3c7' : '#dcfce7',
                          color: center.activeStatus === 'Serving' ? '#92400e' : '#166534',
                          border: center.activeStatus === 'Serving' ? '1px solid #fde68a' : '1px solid #bbf7d0',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}>
                          <span style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: center.activeStatus === 'Serving' ? '#f59e0b' : '#22c55e',
                          }} />
                          {center.activeStatus === 'Serving' ? 'Serving Now' : 'Active Today'}
                        </span>
                      ) : (
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: '#f1f5f9',
                          color: '#64748b',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}>
                          Past Booking
                        </span>
                      )}
                    </div>

                    {/* Bookings / Tokens List in this Center */}
                    <div style={{
                      background: '#f8fafc',
                      borderRadius: '12px',
                      padding: '12px',
                      margin: '14px 0',
                      border: '1px solid #f1f5f9',
                    }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', marginBottom: '8px' }}>
                        Your Bookings ({center.bookings?.length || 1})
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(center.bookings || []).map((b, idx) => (
                          <div key={b.id || idx} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '7px 10px',
                            background: '#ffffff',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            fontSize: '12px',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Ticket size={14} color="#075533" />
                              <span style={{ fontWeight: 700, color: '#075533' }}>
                                {b.formatted_token || (b.token_number ? `#${b.token_number}` : 'Token')}
                              </span>
                              {b.produce && (
                                <span style={{ color: '#475569', fontWeight: 500 }}>
                                  • {b.produce.charAt(0).toUpperCase() + b.produce.slice(1)} {b.quantity_kg ? `(${b.quantity_kg} kg)` : ''}
                                </span>
                              )}
                            </div>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontSize: '11px',
                              fontWeight: 600,
                              background: b.status === 'Serving' ? '#fef3c7' : b.status === 'Confirmed' ? '#ecfdf5' : '#f1f5f9',
                              color: b.status === 'Serving' ? '#b45309' : b.status === 'Confirmed' ? '#047857' : '#64748b',
                            }}>
                              {b.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Button */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '12px',
                    borderTop: '1px solid #f1f5f9',
                  }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#075533' }}>
                      Track Live Queue
                    </span>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: '#075533',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <ArrowRight size={15} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </FarmerLayout>
    )
  }

  // 3. A SPECIFIC CENTER IS SELECTED -> SHOW LIVE QUEUE DATA
  const currentCenter = bookedCenters.find(c => c.id === selectedCenterId)
  const currentCenterName = currentCenter?.name || 'Procurement Center'

  return (
    <FarmerLayout activePath="/live-queue">
      {/* Top Controls: Back button and other booked centers */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '16px',
      }}>
        <button
          onClick={handleBackToCenters}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '8px',
            border: '1.5px solid #cbd5e1',
            background: '#ffffff',
            color: '#334155',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <ArrowLeft size={16} />
          <span>← Back to Centers List</span>
        </button>

        {bookedCenters.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Switch Center:</span>
            {bookedCenters.map(c => (
              <button
                key={c.id}
                onClick={() => handleSelectCenter(c.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  border: selectedCenterId === c.id ? '2px solid #075533' : '1.5px solid #cbd5e1',
                  background: selectedCenterId === c.id ? '#075533' : '#ffffff',
                  color: selectedCenterId === c.id ? '#ffffff' : '#334155',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Building2 size={13} />
                <span>{c.name}</span>
                {c.activeToken && (
                  <span style={{
                    padding: '1px 6px',
                    borderRadius: '8px',
                    fontSize: '10px',
                    fontWeight: 700,
                    background: selectedCenterId === c.id ? 'rgba(255,255,255,0.25)' : '#dcfce7',
                    color: selectedCenterId === c.id ? '#ffffff' : '#166534',
                  }}>
                    {c.activeToken}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <LiveQueueContent
        key={selectedCenterId}
        centerId={selectedCenterId}
        centerName={currentCenterName}
        addNotification={addNotification}
      />
    </FarmerLayout>
  )
}

function LiveQueueContent({ centerId, centerName, addNotification }) {
  const { queueData, connected, error } = useQueueSSE(centerId)

  // Track previous state for change detection
  const prevAheadRef = useRef(null)
  const prevStatusRef = useRef(null)
  const prevServingRef = useRef(null)
  const hasNotifiedTurnRef = useRef(false)
  const hasNotifiedNextRef = useRef(false)

  useEffect(() => {
    if (!queueData) return

    const { farmersAhead, yourStatus, nowServing, yourToken } = queueData
    const hasToken = yourToken && yourToken !== 'No Active Token'

    if (!hasToken) {
      prevAheadRef.current = null
      prevStatusRef.current = null
      hasNotifiedTurnRef.current = false
      hasNotifiedNextRef.current = false
      return
    }

    // Detect "your turn" — status became Serving
    if (yourStatus === 'Serving' && prevStatusRef.current !== 'Serving' && !hasNotifiedTurnRef.current) {
      addNotification(`🎉 It's your turn! Token ${yourToken} — please proceed to the counter.`, 'success', "It's Your Turn!")
      hasNotifiedTurnRef.current = true
    }

    // Detect "you're next" — exactly 1 farmer ahead
    if (
      farmersAhead === 1 &&
      prevAheadRef.current !== 1 &&
      yourStatus !== 'Serving' &&
      !hasNotifiedNextRef.current
    ) {
      addNotification(`⚡ You're next! Get ready — one farmer ahead of you.`, 'warning', "You're Next!")
      hasNotifiedNextRef.current = true
    }

    if (farmersAhead > 1) hasNotifiedNextRef.current = false

    prevAheadRef.current = farmersAhead
    prevStatusRef.current = yourStatus
    prevServingRef.current = nowServing
  }, [queueData, addNotification])

  const loading = !queueData && !error

  if (loading) {
    return <LiveQueueSkeleton />
  }

  const q = queueData || {}
  const hasToken = q.yourToken && q.yourToken !== 'No Active Token'
  const isServing = q.yourStatus === 'Serving'

  return (
    <div className="live-queue-container">
      {/* Header */}
      <div className="live-queue-header">
        <div>
          <h1 className="page-main-heading">Live Queue — {centerName || q.center || 'Procurement Center'}</h1>
          <p className="page-sub-heading">Last updated: {q.lastUpdated || '—'}</p>
        </div>
        <div className="lq-header-right" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          {/* SSE connection status */}
          <div className={`sse-status-pill ${connected ? 'sse-live' : 'sse-reconnecting'}`}>
            {connected ? (
              <><Wifi size={13} /><span>Live</span></>
            ) : (
              <><Loader2 size={13} className="spin-icon" /><span>Reconnecting…</span></>
            )}
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="lq-error-banner">
          <WifiOff size={16} />
          <span>Connection issue — retrying automatically</span>
        </div>
      )}

      {/* Dual Cards: Now Serving & Your Token */}
      <div className="queue-status-grid">
        {/* Now Serving Card */}
        <div className="queue-card now-serving-card">
          <span className="queue-card-label">Now Serving</span>
          <div className="serving-token-display">{q.nowServing || '—'}</div>
        </div>

        {/* Your Token Card */}
        <div className={`queue-card your-token-card ${isServing ? 'your-token-serving' : ''}`}>
          <span className="queue-card-label">Your Token</span>
          {hasToken ? (
            <>
              <div className="your-token-row">
                <Ticket size={24} className="ticket-icon" />
                <span className="your-token-number">{q.yourToken}</span>
                {isServing && <span className="serving-now-badge">Serving Now!</span>}
              </div>
              <p className="queue-ahead-text">
                {isServing ? (
                  <span className="ahead-highlight serving-text">🎉 Please proceed to the counter</span>
                ) : q.farmersAhead === 0 ? (
                  <span className="ahead-highlight next-text">⚡ You're next!</span>
                ) : (
                  <span className="ahead-highlight">{q.farmersAhead} {q.farmersAhead === 1 ? 'farmer' : 'farmers'} ahead</span>
                )}
              </p>
              <p className="estimated-wait-text">Estimated wait: {q.estimatedWait}</p>
            </>
          ) : (
            <div className="no-token-state">
              <ClipboardList size={28} className="no-token-icon" />
              <p className="no-token-text">No active booking</p>
              <a href="/book-slot" className="no-token-link">Book a slot →</a>
            </div>
          )}
        </div>
      </div>

      {/* Queue Status Table */}
      <div className="portal-card upcoming-tokens-card">
        <h2 className="card-section-title">Queue Status</h2>
        {q.queue && q.queue.length > 0 ? (
          <div className="tokens-table-wrap">
            <table className="tokens-table">
              <tbody>
                {q.queue.map((item) => (
                  <tr
                    key={item.token}
                    className={`token-row ${item.isCurrent ? 'current-user-row' : ''}`}
                  >
                    <td className="token-code-cell">{item.token}</td>
                    <td className="token-status-cell">
                      <span
                        className={`status-pill ${
                          item.status === 'Completed'
                            ? 'completed'
                            : item.status === 'Serving'
                            ? 'serving'
                            : item.status === 'You'
                            ? 'you'
                            : 'waiting'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="lq-empty-queue">
            <ClipboardList size={36} />
            <p>No tokens in queue today</p>
          </div>
        )}
      </div>
    </div>
  )
}
