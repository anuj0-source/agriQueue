import { useEffect, useRef, useState } from 'react'
import { ArrowRight, SkipForward, RefreshCw, CheckCircle2, Clock, Loader2, Wifi, WifiOff, PackageCheck, X, Check, Users } from 'lucide-react'
import StaffLayout from '../components/StaffLayout'
import CropIcon from '../components/CropIcon'
import { useStaffQueueSSE } from '../hooks/useStaffQueueSSE'
import { useNotifications } from '../context/NotificationContext'
import { callNextFarmer, skipToken, updateStaffProcurement, getStaffProcurement } from '../api'

const GRADE_OPTIONS = ['Standard Grade', 'Premium Grade', 'Grade A', 'Grade B']

export default function StaffQueuePage() {
  const { queueData, connected, error } = useStaffQueueSSE()
  const { addNotification } = useNotifications()
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const prevTokenRef = useRef(null)
  const prevWaitingRef = useRef(null)

  const [showCompletePanel, setShowCompletePanel] = useState(false)
  const [procurementForm, setProcurementForm] = useState({ quantity_kg: '', produce_type: 'Standard Grade', total_price: '', status: 'Completed' })
  const [completing, setCompleting] = useState(false)
  const [currentBookingDetails, setCurrentBookingDetails] = useState(null)

  useEffect(() => {
    const currentUser = (() => {
      try { return JSON.parse(localStorage.getItem('currentUser') || 'null') } catch { return null }
    })()
    if (!currentUser || currentUser.role !== 'staff') window.location.href = '/login'
  }, [])

  useEffect(() => {
    if (!queueData) return
    const { current_token, waiting_count } = queueData
    if (prevTokenRef.current !== null && prevTokenRef.current !== current_token && current_token !== '-') {
      addNotification(`Now serving: ${current_token}`, 'info', 'Queue Updated')
    }
    if (prevWaitingRef.current !== null && prevWaitingRef.current > 0 && waiting_count === 0) {
      addNotification('Queue is now empty — all farmers have been processed.', 'success', 'Queue Complete')
    }
    prevTokenRef.current = current_token
    prevWaitingRef.current = waiting_count
  }, [queueData, addNotification])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const handleCallNext = async () => {
    setActionLoading(true)
    try {
      const res = await callNextFarmer()
      if (res.success) {
        showToast(res.message || 'Called next farmer!')
        if (res.now_serving && res.now_serving !== '-') {
          addNotification(`Called: ${res.now_serving}`, 'info', 'Next Token Called')
        }
      } else {
        showToast(res.message || 'No active tokens', 'warn')
        if (!queueData?.waiting_count) addNotification('Queue is empty — no more farmers to call.', 'warning', 'Queue Empty')
      }
    } catch (e) { showToast(e.message, 'error') }
    finally { setActionLoading(false) }
  }

  const handleSkip = async () => {
    const bid = queueData?.current_booking_id
    const tok = queueData?.current_token
    if (!bid) { showToast('No active token to skip', 'warn'); return }
    setActionLoading(true)
    try {
      await skipToken(bid)
      showToast('Token skipped')
      addNotification(`Skipped token: ${tok || bid}`, 'info', 'Token Skipped')
    } catch (e) { showToast(e.message, 'error') }
    finally { setActionLoading(false) }
  }

  const handleOpenCompletePanel = async () => {
    const bid = queueData?.current_booking_id
    if (!bid) { showToast('No active token to complete', 'warn'); return }
    try {
      const records = await getStaffProcurement()
      const rec = records.find(r => r.id === bid)
      if (rec) {
        setCurrentBookingDetails(rec)
        setProcurementForm({ quantity_kg: rec.quantity_kg || '', produce_type: rec.produce_type || 'Standard Grade', total_price: rec.total_price || '', status: 'Completed' })
      } else {
        setProcurementForm({ quantity_kg: '', produce_type: 'Standard Grade', total_price: '', status: 'Completed' })
        setCurrentBookingDetails(null)
      }
    } catch {
      setProcurementForm({ quantity_kg: '', produce_type: 'Standard Grade', total_price: '', status: 'Completed' })
      setCurrentBookingDetails(null)
    }
    setShowCompletePanel(true)
  }

  const handleCompleteProcurement = async () => {
    const bid = queueData?.current_booking_id
    const tok = queueData?.current_token
    if (!bid) return
    setCompleting(true)
    try {
      await updateStaffProcurement(bid, procurementForm)
      showToast(`✓ Procurement for ${tok} completed!`, 'success')
      addNotification(`Procurement completed for token ${tok}`, 'success', 'Procurement Done')
      setShowCompletePanel(false)
    } catch (e) { showToast(e.message, 'error') }
    finally { setCompleting(false) }
  }

  if (!queueData && !error) return (
    <StaffLayout activePath="/staff/queue" title="Queue Management">
      <div className="staff-loading"><div className="staff-spinner" /><p>Connecting to live queue…</p></div>
    </StaffLayout>
  )

  const q = queueData || {}
  const queue = q.queue || []
  const hasActiveToken = !!q.current_booking_id && q.current_token && q.current_token !== '-'

  // Split queue into visual lanes
  const completed = queue.filter(b => b.status === 'Completed')
  const serving   = queue.filter(b => b.status === 'Serving')
  const waiting   = queue.filter(b => b.status === 'Confirmed' || b.status === 'Waiting')
  const skipped   = queue.filter(b => b.status === 'Cancelled')

  return (
    <StaffLayout activePath="/staff/queue" title="Queue Management">
      {toast && <div className={`staff-toast staff-toast-${toast.type}`}>{toast.msg}</div>}

      <div className="qm-page">

        {/* ── Top Stats Bar ── */}
        <div className="qm-stats-bar">
          <div className="qm-stat qm-stat-waiting">
            <Clock size={16} />
            <span className="qm-stat-num">{q.waiting_count ?? 0}</span>
            <span className="qm-stat-label">Waiting</span>
          </div>
          <div className="qm-stat qm-stat-serving">
            <Users size={16} />
            <span className="qm-stat-num">{serving.length}</span>
            <span className="qm-stat-label">Serving</span>
          </div>
          <div className="qm-stat qm-stat-done">
            <CheckCircle2 size={16} />
            <span className="qm-stat-num">{completed.length}</span>
            <span className="qm-stat-label">Done</span>
          </div>
          <div className="qm-stat qm-stat-total">
            <span className="qm-stat-num">{q.total_today ?? 0}</span>
            <span className="qm-stat-label">Total Today</span>
          </div>
          <div className="qm-stat-connection">
            <div className={`sse-status-pill ${connected ? 'sse-live' : 'sse-reconnecting'}`}>
              {connected ? <><Wifi size={12}/><span>Live</span></> : <><Loader2 size={12} className="spin-icon"/><span>Reconnecting…</span></>}
            </div>
          </div>
        </div>

        {/* ── Now Serving Banner ── */}
        <div className={`qm-now-serving ${hasActiveToken ? 'qm-now-serving-active' : ''}`}>
          <div className="qm-now-serving-left">
            <span className="qm-ns-eyebrow">NOW SERVING</span>
            <span className="qm-ns-token">{q.current_token || '—'}</span>
            {serving[0] && <span className="qm-ns-produce"><CropIcon name={serving[0].produce} size={20}/>{serving[0].produce}</span>}
          </div>
          <div className="qm-now-serving-right">
            <div className="qm-ns-next">
              <span className="qm-ns-next-label">Up Next</span>
              <span className="qm-ns-next-token">{q.next_token || '—'}</span>
            </div>
          </div>
        </div>

        {/* ── Visual Queue Lane ── */}
        <div className="qm-lane-wrapper">
          <div className="qm-lane-label-row">
            <span className="qm-lane-label qm-lane-label-done">✓ Done</span>
            <span className="qm-lane-label qm-lane-label-serving">⬤ At Counter</span>
            <span className="qm-lane-label qm-lane-label-waiting">⟳ Waiting</span>
          </div>

          <div className="qm-lane">
            {/* Completed section */}
            <div className="qm-lane-section qm-section-done">
              {completed.length === 0 ? (
                <div className="qm-lane-empty-hint">No completed yet</div>
              ) : completed.slice(-3).map((item, i) => (
                <div key={item.id} className="qm-card qm-card-done">
                  <span className="qm-card-token">{item.token}</span>
                  <div className="qm-card-crop"><CropIcon name={item.produce} size={22}/></div>
                  <span className="qm-card-produce">{item.produce}</span>
                  <span className="qm-card-done-tick">✓</span>
                </div>
              ))}
            </div>

            {/* Arrow */}
            <div className="qm-lane-arrow"><ArrowRight size={22}/></div>

            {/* Counter / Serving */}
            <div className="qm-counter">
              <div className="qm-counter-screen">
                <span className="qm-counter-label">COUNTER</span>
                <span className="qm-counter-token">{q.current_token || '—'}</span>
              </div>
              {serving[0] && (
                <div className="qm-counter-card">
                  <div className="qm-card-crop"><CropIcon name={serving[0].produce} size={28}/></div>
                  <span className="qm-card-produce">{serving[0].produce}</span>
                </div>
              )}
            </div>

            {/* Arrow */}
            <div className="qm-lane-arrow"><ArrowRight size={22}/></div>

            {/* Waiting section */}
            <div className="qm-lane-section qm-section-waiting">
              {waiting.length === 0 ? (
                <div className="qm-lane-empty-hint">Queue empty</div>
              ) : waiting.map((item, idx) => (
                <div key={item.id} className={`qm-card qm-card-waiting ${idx === 0 ? 'qm-card-next' : ''}`}>
                  <span className="qm-card-pos">#{idx + 1}</span>
                  <span className="qm-card-token">{item.token}</span>
                  <div className="qm-card-crop"><CropIcon name={item.produce} size={22}/></div>
                  <span className="qm-card-produce">{item.produce}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Action Controls ── */}
        <div className="qm-controls">
          {hasActiveToken && (
            <button id="staff-complete-procurement-btn" className="qm-btn qm-btn-complete"
              onClick={handleOpenCompletePanel} disabled={actionLoading || completing}>
              <PackageCheck size={18}/>
              Complete Procurement
            </button>
          )}
          <button id="staff-call-next-btn" className="qm-btn qm-btn-call"
            onClick={handleCallNext} disabled={actionLoading}>
            {actionLoading ? <Loader2 size={18} className="spin-icon"/> : <ArrowRight size={18}/>}
            {actionLoading ? 'Processing…' : 'Call Next Farmer'}
            {q.next_token && q.next_token !== '-' && <span className="qm-btn-badge">{q.next_token}</span>}
          </button>
          <button id="staff-skip-btn" className="qm-btn qm-btn-skip"
            onClick={handleSkip} disabled={actionLoading || !q.current_booking_id}>
            <SkipForward size={18}/>
            Skip Token
          </button>
          <button id="staff-refresh-btn" className="qm-btn qm-btn-refresh"
            disabled={actionLoading} onClick={() => window.location.reload()}>
            <RefreshCw size={16}/>
            Refresh
          </button>
        </div>

        {error && <p className="staff-error-text" style={{textAlign:'center', marginTop: 12}}>⚠️ {error}</p>}
      </div>

      {/* ── Quick Complete Procurement Modal ── */}
      {showCompletePanel && (
        <div className="qcp-overlay" onClick={() => setShowCompletePanel(false)}>
          <div className="qcp-panel" onClick={e => e.stopPropagation()}>
            <div className="qcp-header">
              <div className="qcp-header-left">
                <PackageCheck size={20} className="qcp-icon"/>
                <div>
                  <h3 className="qcp-title">Complete Procurement</h3>
                  <p className="qcp-subtitle">
                    Token: <strong>{q.current_token}</strong>
                    {currentBookingDetails?.farmer_name && <> &mdash; {currentBookingDetails.farmer_name}</>}
                    {currentBookingDetails?.produce && <> &mdash; {currentBookingDetails.produce}</>}
                  </p>
                </div>
              </div>
              <button className="qcp-close" onClick={() => setShowCompletePanel(false)}><X size={18}/></button>
            </div>
            <div className="qcp-body">
              <div className="qcp-field-row">
                <div className="qcp-field">
                  <label className="qcp-label">Weight (kg)</label>
                  <input type="number" className="qcp-input" placeholder="e.g. 500"
                    value={procurementForm.quantity_kg}
                    onChange={e => setProcurementForm(p => ({ ...p, quantity_kg: e.target.value }))}/>
                </div>
                <div className="qcp-field">
                  <label className="qcp-label">Grade</label>
                  <select className="qcp-input" value={procurementForm.produce_type}
                    onChange={e => setProcurementForm(p => ({ ...p, produce_type: e.target.value }))}>
                    {GRADE_OPTIONS.map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div className="qcp-field">
                  <label className="qcp-label">Total Amount (₹)</label>
                  <input type="number" className="qcp-input" placeholder="e.g. 15000"
                    value={procurementForm.total_price}
                    onChange={e => setProcurementForm(p => ({ ...p, total_price: e.target.value }))}/>
                </div>
              </div>
            </div>
            <div className="qcp-footer">
              <button className="qcp-cancel" onClick={() => setShowCompletePanel(false)}>Cancel</button>
              <button className="qcp-confirm" onClick={handleCompleteProcurement}
                disabled={completing || !procurementForm.quantity_kg || !procurementForm.total_price}>
                {completing ? <Loader2 size={16} className="spin-icon"/> : <Check size={16}/>}
                {completing ? 'Saving…' : 'Mark Complete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </StaffLayout>
  )
}
