import { useEffect, useState } from 'react'
import { AlertTriangle, Bell, Landmark, Loader2, Pencil, ReceiptText, Save, X } from 'lucide-react'
import FarmerLayout from '../components/FarmerLayout'
import { TableRowsSkeleton } from '../components/Skeletons'
import {
  getPaymentProfile, getPaymentReceipt, getPaymentRecords, raisePaymentDispute, savePaymentProfile,
  checkNotificationStatus, registerPushNotifications,
} from '../api'

const STATUS_CLASS = {
  Credited: 'completed', Scheduled: 'pending', Processing: 'pending',
  'On Hold': 'cancelled', Failed: 'cancelled',
}

const escapeReceiptText = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
}[char]))

export default function PaymentStatusPage() {
  const [payments, setPayments] = useState([])
  const [paymentProfile, setPaymentProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [showDestinationForm, setShowDestinationForm] = useState(false)
  const [destinationForm, setDestinationForm] = useState({ method: 'UPI', account_holder: '', upi_id: '', account_number: '', ifsc: '' })
  const [destinationError, setDestinationError] = useState('')
  const [savingDestination, setSavingDestination] = useState(false)
  const [disputePayment, setDisputePayment] = useState(null)
  const [disputeReason, setDisputeReason] = useState('')
  const [disputeError, setDisputeError] = useState('')
  const [submittingDispute, setSubmittingDispute] = useState(false)
  const [pushStatus, setPushStatus] = useState(() => checkNotificationStatus())
  const [enablingPush, setEnablingPush] = useState(false)
  const [pushFeedback, setPushFeedback] = useState('')

  const loadPayments = async () => {
    setLoading(true)
    try {
      const [records, profile] = await Promise.all([getPaymentRecords(), getPaymentProfile()])
      setPayments(Array.isArray(records) ? records : [])
      setPaymentProfile(profile)
      setPageError('')
    } catch (err) {
      setPageError(err.message || 'Unable to load payment details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const loadTimer = window.setTimeout(() => { loadPayments() }, 0)
    // When page loads and permission is granted, ensure backend has the subscription registered
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      registerPushNotifications(false).then((res) => {
        if (res?.success) {
          console.log('[PaymentStatusPage] Push subscription synced on load')
        }
      }).catch(() => {})
    }
    return () => window.clearTimeout(loadTimer)
  }, [])

  const openDestinationForm = () => {
    setDestinationError('')
    setDestinationForm({ method: paymentProfile?.method || 'UPI', account_holder: paymentProfile?.account_holder || '', upi_id: '', account_number: '', ifsc: '' })
    setShowDestinationForm(true)
  }

  const saveDestination = async (event) => {
    event.preventDefault()
    setSavingDestination(true)
    setDestinationError('')
    try {
      const profile = await savePaymentProfile(destinationForm)
      setPaymentProfile({ ...profile, is_configured: true })
      setShowDestinationForm(false)
    } catch (err) {
      setDestinationError(err.message || 'Unable to save payment destination.')
    } finally {
      setSavingDestination(false)
    }
  }

  const submitDispute = async (event) => {
    event.preventDefault()
    if (!disputePayment) return
    setSubmittingDispute(true)
    setDisputeError('')
    try {
      await raisePaymentDispute(disputePayment.id, disputeReason)
      setDisputePayment(null)
      setDisputeReason('')
      await loadPayments()
    } catch (err) {
      setDisputeError(err.message || 'Unable to raise dispute.')
    } finally {
      setSubmittingDispute(false)
    }
  }

  const printReceipt = async (paymentId) => {
    const receiptWindow = window.open('', '_blank')
    if (!receiptWindow) {
      setPageError('Allow pop-ups to view or print this receipt.')
      return
    }
    try {
      const receipt = await getPaymentReceipt(paymentId)
      const value = (item) => escapeReceiptText(item)
      receiptWindow.document.write(`<!doctype html><html><head><title>${value(receipt.receipt_number)}</title><style>body{font-family:Arial,sans-serif;color:#172033;margin:40px;max-width:720px}.brand{color:#177245;font-size:22px;font-weight:700}.muted{color:#64748b}.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:24px 0}.box{border:1px solid #dbe4df;border-radius:10px;padding:14px}.total{background:#edf9f0;border-color:#9ed7ad;font-size:18px;font-weight:700}table{border-collapse:collapse;width:100%;margin-top:18px}td{padding:10px 0;border-bottom:1px solid #e5e7eb}td:last-child{text-align:right;font-weight:600}@media print{body{margin:20px}}</style></head><body><div class="brand">AgriQueue</div><p class="muted">Procurement settlement receipt · ${value(receipt.receipt_number)}</p><div class="grid"><div class="box"><strong>${value(receipt.farmer_name)}</strong><br><span class="muted">Farmer ID: ${value(receipt.farmer_id)}</span></div><div class="box"><strong>${value(receipt.center_name)}</strong><br><span class="muted">${value(receipt.center_address)}</span></div></div><table><tr><td>Produce / grade</td><td>${value(receipt.produce)} · ${value(receipt.quality_grade)}</td></tr><tr><td>Actual weight</td><td>${value(receipt.actual_weight_kg)} kg</td></tr><tr><td>Deductions</td><td>${value(receipt.deductions_kg)} kg</td></tr><tr><td>Accepted weight</td><td>${value(receipt.net_weight_kg)} kg</td></tr><tr><td>Final rate</td><td>₹${value(receipt.rate_per_kg)}/kg</td></tr><tr><td>Settlement status</td><td>${value(receipt.status)}</td></tr><tr><td>Expected settlement</td><td>${value(receipt.expected_settlement_date)}</td></tr><tr><td>Transaction reference</td><td>${value(receipt.transaction_reference || 'Pending')}</td></tr><tr class="total"><td>Net payable</td><td>₹${Number(receipt.amount || 0).toLocaleString('en-IN')}</td></tr></table><p class="muted">Generated ${value(receipt.generated_at)}. This receipt reflects the verified procurement record.</p><script>window.onload=()=>window.print()</script></body></html>`)
      receiptWindow.document.close()
    } catch (err) {
      receiptWindow.close()
      setPageError(err.message || 'Unable to generate receipt.')
    }
  }

  const handleEnablePush = async () => {
    setEnablingPush(true)
    setPushFeedback('Requesting browser permission…')
    try {
      const res = await registerPushNotifications(true)
      const current = checkNotificationStatus()
      setPushStatus(current)
      if (res?.success) {
        setPushFeedback('✓ Push notifications active! Device synced with backend.')
      } else {
        setPushFeedback(res?.error || 'Could not enable notifications.')
      }
    } catch (e) {
      setPushFeedback(e.message || 'Error enabling notifications.')
    } finally {
      setEnablingPush(false)
    }
  }

  return (
    <FarmerLayout activePath="/payments">
      <div className="payment-status-container">
        <div className="payment-page-heading">
          <div>
            <h1 className="page-main-heading">Payment Status</h1>
            <p>Track verified procurement settlements and keep your payout destination current.</p>
          </div>
          <button type="button" className="payment-refresh-btn" onClick={loadPayments} disabled={loading}>Refresh</button>
        </div>

        <section className="payment-destination-card">
          <div className="payment-destination-icon"><Landmark size={22} /></div>
          <div className="payment-destination-copy">
            <span className="payment-card-eyebrow">Payout destination</span>
            {paymentProfile?.is_configured ? (
              <><strong>{paymentProfile.masked_destination}</strong><span>{paymentProfile.account_holder} · Updated {paymentProfile.updated_at || 'today'}</span></>
            ) : (
              <><strong>Not configured</strong><span>Add a UPI ID or bank account before settlement is processed.</span></>
            )}
          </div>
          <button type="button" className="payment-destination-btn" onClick={openDestinationForm}>
            <Pencil size={15} /> {paymentProfile?.is_configured ? 'Change' : 'Add destination'}
          </button>
        </section>

        {/* Push Notification Enable Prompt when disabled */}
        {pushStatus !== 'granted' && (
          <section className="payment-alert-banner">
            <div className="payment-alert-copy">
              <span className="payment-alert-badge inactive">○ Instant Payment Alerts Off</span>
              <p>Turn on notifications so you receive an instant alert on your device as soon as your payment is credited by staff.</p>
            </div>
            <div className="payment-alert-actions">
              <button
                type="button"
                className="payment-alert-btn enable"
                onClick={handleEnablePush}
                disabled={enablingPush}
              >
                {enablingPush ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
                {enablingPush ? 'Enabling…' : 'Enable Notifications'}
              </button>
            </div>
          </section>
        )}
        {pushFeedback && (
          <div className={`payment-alert-feedback ${pushFeedback.includes('✓') ? 'success' : 'info'}`}>
            {pushFeedback}
          </div>
        )}

        {pageError && <div className="payment-inline-error"><AlertTriangle size={17} /> {pageError}</div>}

        <div className="portal-card data-table-card">
          <div className="table-responsive">
            <table className="portal-data-table payment-table">
              <thead><tr><th>Procurement</th><th>Amount</th><th>Settlement</th><th>Reference / Batch</th><th>Status</th><th>Receipt</th><th>Support</th></tr></thead>
              <tbody>
                {loading ? <TableRowsSkeleton rows={5} columns={7} /> : payments.length === 0 ? (
                  <tr><td colSpan={7} className="payment-empty-state">No verified procurement payments yet.</td></tr>
                ) : payments.map((row) => (
                  <tr key={row.id}>
                    <td><strong className="cell-produce">{row.produce}</strong><small>{row.center_name} · {row.net_weight_kg?.toLocaleString()} kg · {row.quality_grade}</small></td>
                    <td className="cell-amount">{row.amount}</td>
                    <td><strong>{row.settled_at || row.expected_settlement_date}</strong><small>{row.settled_at ? 'Credited on' : 'Expected by'}</small></td>
                    <td><span className="cell-txid">{row.transactionId}</span><small>{row.payment_batch ? `Batch ${row.payment_batch}` : row.receipt_number}</small></td>
                    <td><span className={`status-pill ${STATUS_CLASS[row.status] || 'pending'}`}>{row.status}</span>{row.dispute_status === 'Open' && <small className="payment-dispute-note">Dispute open</small>}</td>
                    <td><button type="button" className="payment-table-action" onClick={() => printReceipt(row.id)}><ReceiptText size={15} /> Receipt</button></td>
                    <td>{row.dispute_status === 'Open' ? <span className="payment-dispute-note">Under review</span> : <button type="button" className="payment-table-action payment-dispute-btn" onClick={() => { setDisputePayment(row); setDisputeReason(''); setDisputeError('') }}><AlertTriangle size={15} /> Raise dispute</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showDestinationForm && (
        <div className="payment-modal-overlay" onClick={() => setShowDestinationForm(false)}>
          <form className="payment-modal" onSubmit={saveDestination} onClick={(event) => event.stopPropagation()}>
            <div className="payment-modal-header"><div><h2>Payment destination</h2><p>Your details are encrypted and only a masked version is shown in the app.</p></div><button type="button" onClick={() => setShowDestinationForm(false)}><X size={18} /></button></div>
            <label>Payment method<select value={destinationForm.method} onChange={(event) => setDestinationForm((form) => ({ ...form, method: event.target.value }))}><option value="UPI">UPI</option><option value="Bank Account">Bank account</option></select></label>
            <label>Account holder name<input required value={destinationForm.account_holder} onChange={(event) => setDestinationForm((form) => ({ ...form, account_holder: event.target.value }))} /></label>
            {destinationForm.method === 'UPI' ? (
              <label>UPI ID<input required placeholder="name@bank" value={destinationForm.upi_id} onChange={(event) => setDestinationForm((form) => ({ ...form, upi_id: event.target.value }))} /></label>
            ) : (<><label>Account number<input required inputMode="numeric" value={destinationForm.account_number} onChange={(event) => setDestinationForm((form) => ({ ...form, account_number: event.target.value }))} /></label><label>IFSC code<input required value={destinationForm.ifsc} onChange={(event) => setDestinationForm((form) => ({ ...form, ifsc: event.target.value.toUpperCase() }))} /></label></>)}
            {destinationError && <p className="payment-form-error">{destinationError}</p>}
            <div className="payment-modal-footer"><button type="button" className="payment-cancel-btn" onClick={() => setShowDestinationForm(false)}>Cancel</button><button className="payment-save-btn" disabled={savingDestination}>{savingDestination ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{savingDestination ? 'Saving…' : 'Save destination'}</button></div>
          </form>
        </div>
      )}

      {disputePayment && (
        <div className="payment-modal-overlay" onClick={() => setDisputePayment(null)}>
          <form className="payment-modal" onSubmit={submitDispute} onClick={(event) => event.stopPropagation()}>
            <div className="payment-modal-header"><div><h2>Raise a payment dispute</h2><p>{disputePayment.produce} · {disputePayment.amount} · {disputePayment.receipt_number}</p></div><button type="button" onClick={() => setDisputePayment(null)}><X size={18} /></button></div>
            <label>Describe the issue<textarea required minLength="10" maxLength="500" rows="5" placeholder="For example, the accepted weight or credited amount is incorrect." value={disputeReason} onChange={(event) => setDisputeReason(event.target.value)} /></label>
            {disputeError && <p className="payment-form-error">{disputeError}</p>}
            <div className="payment-modal-footer"><button type="button" className="payment-cancel-btn" onClick={() => setDisputePayment(null)}>Cancel</button><button className="payment-save-btn payment-dispute-save" disabled={submittingDispute}>{submittingDispute ? <Loader2 size={16} className="animate-spin" /> : <AlertTriangle size={16} />}{submittingDispute ? 'Submitting…' : 'Submit dispute'}</button></div>
          </form>
        </div>
      )}
    </FarmerLayout>
  )
}
