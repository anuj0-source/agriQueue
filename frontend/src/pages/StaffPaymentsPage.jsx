import { useEffect, useState } from 'react'
import {
  CreditCard, TrendingUp, Clock, CheckCircle2, AlertCircle, Edit3,
  Loader2, Save, X, Zap, Download, CheckSquare, Layers
} from 'lucide-react'
import StaffLayout from '../components/StaffLayout'
import { getStaffPayments, updateStaffPayment, batchSettleStaffPayments } from '../api'

const STATUS_CFG = {
  Credited:   { cls: 'spay-credited',   label: 'Credited'   },
  Scheduled:  { cls: 'spay-transit', label: 'Scheduled' },
  Processing: { cls: 'spay-transit', label: 'Processing' },
  'On Hold':  { cls: 'spay-hold', label: 'On Hold' },
  Failed:     { cls: 'spay-cancelled', label: 'Failed' },
}

export default function StaffPaymentsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('All')
  const [error, setError] = useState(null)
  const [successToast, setSuccessToast] = useState(null)

  // Single settlement modal
  const [editingPayment, setEditingPayment] = useState(null)
  const [settlementForm, setSettlementForm] = useState({})
  const [saving, setSaving] = useState(false)

  // Batch selection & modal
  const [selectedIds, setSelectedIds] = useState([])
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [batchTargetPayments, setBatchTargetPayments] = useState([])
  const [batchForm, setBatchForm] = useState({
    payment_batch: '',
    transaction_reference: '',
    status: 'Credited',
  })
  const [batchSettling, setBatchSettling] = useState(false)

  useEffect(() => {
    fetchPayments()
  }, [])

  async function fetchPayments() {
    setLoading(true)
    try {
      const res = await getStaffPayments()
      setData(res)
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const showToast = (msg) => {
    setSuccessToast(msg)
    setTimeout(() => setSuccessToast(null), 4000)
  }

  const summary = data?.summary || {}
  const transactions = data?.transactions || []
  const filtered = filterStatus === 'All' ? transactions
    : transactions.filter(t => t.status === filterStatus)

  // Non-credited payments (eligible for auto/batch settlement)
  const pendingPayments = transactions.filter(t => t.status !== 'Credited')

  const summaryCards = [
    { label: 'Total Disbursed', value: summary.total_disbursed || '₹0', icon: TrendingUp, color: '#22c55e' },
    { label: 'Pending Amount', value: summary.pending_total || '₹0', icon: Clock, color: '#f59e0b' },
    { label: 'Credited', value: summary.completed_count ?? 0, icon: CheckCircle2, color: '#3b82f6' },
    { label: 'Awaiting Settlement', value: summary.pending_count ?? 0, icon: AlertCircle, color: '#8b5cf6' },
  ]

  // Multi-selection handlers
  const isAllSelected = filtered.length > 0 && filtered.every(t => selectedIds.includes(t.id))

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      // Unselect all currently filtered
      setSelectedIds(prev => prev.filter(id => !filtered.some(t => t.id === id)))
    } else {
      // Select all currently filtered
      const newIds = new Set([...selectedIds, ...filtered.map(t => t.id)])
      setSelectedIds(Array.from(newIds))
    }
  }

  const handleToggleSelectOne = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  // Batch modal open
  const openBatchModal = (targetList) => {
    if (!targetList || targetList.length === 0) return
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    setBatchTargetPayments(targetList)
    setBatchForm({
      payment_batch: `DBT-${todayStr}-B1`,
      transaction_reference: `SBI-DBT-${todayStr}`,
      status: 'Credited',
    })
    setShowBatchModal(true)
  }

  // Execute Batch Settlement
  const handleConfirmBatchSettle = async (e) => {
    e.preventDefault()
    if (!batchTargetPayments.length) return
    setBatchSettling(true)
    setError(null)
    try {
      const payload = {
        payment_ids: batchTargetPayments.map(p => p.payment_id || p.id),
        payment_batch: batchForm.payment_batch,
        transaction_reference: batchForm.transaction_reference,
        status: batchForm.status,
      }
      const res = await batchSettleStaffPayments(payload)
      setShowBatchModal(false)
      setSelectedIds([])
      showToast(res.message || `Successfully disbursed ${batchTargetPayments.length} payments!`)
      await fetchPayments()
    } catch (err) {
      setError(err.message || 'Failed to process batch disbursement')
    } finally {
      setBatchSettling(false)
    }
  }

  // Export CSV for Bank / SBI Processing
  const handleExportCSV = () => {
    const listToExport = selectedIds.length > 0
      ? transactions.filter(t => selectedIds.includes(t.id))
      : filtered

    if (listToExport.length === 0) {
      alert('No payment records to export.')
      return
    }

    const headers = [
      'Payment ID',
      'Farmer Name',
      'Farmer ID',
      'Produce',
      'Quantity (kg)',
      'Amount (INR)',
      'Payment Destination',
      'Status',
      'Receipt Number',
      'Batch ID',
      'Transaction Reference',
      'Settlement Due Date',
      'Date Procured'
    ]

    const csvRows = [headers.join(',')]

    for (const t of listToExport) {
      const row = [
        `"${t.id}"`,
        `"${(t.farmer_name || '').replace(/"/g, '""')}"`,
        `"${(t.farmer_id || '').replace(/"/g, '""')}"`,
        `"${(t.produce || '').replace(/"/g, '""')}"`,
        t.quantity_kg ?? 0,
        t.amount ?? 0,
        `"${(t.payment_destination || '').replace(/"/g, '""')}"`,
        `"${t.status}"`,
        `"${(t.receipt_number || '').replace(/"/g, '""')}"`,
        `"${(t.payment_batch || '').replace(/"/g, '""')}"`,
        `"${(t.transaction_reference || '').replace(/"/g, '""')}"`,
        `"${t.expected_settlement_date || ''}"`,
        `"${t.date || ''}"`
      ]
      csvRows.push(row.join(','))
    }

    const csvString = csvRows.join('\n')
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `agriqueue_bank_disbursement_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Single payment settlement handlers
  const openSettlement = (transaction) => {
    setEditingPayment(transaction)
    setSettlementForm({
      status: transaction.status === 'On Hold' ? 'Scheduled' : transaction.status,
      payment_batch: transaction.payment_batch || '',
      transaction_reference: transaction.transaction_reference || '',
      expected_settlement_date: transaction.expected_settlement_iso || '',
      dispute_resolution: transaction.dispute_status === 'Open' ? '' : transaction.dispute_resolution || '',
    })
  }

  const saveSettlement = async (event) => {
    event.preventDefault()
    if (!editingPayment) return
    setSaving(true)
    try {
      await updateStaffPayment(editingPayment.payment_id, settlementForm)
      setEditingPayment(null)
      showToast(`Payment for ${editingPayment.farmer_name} updated successfully!`)
      await fetchPayments()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const batchTotalAmount = batchTargetPayments.reduce((acc, curr) => acc + (curr.amount || 0), 0)

  return (
    <StaffLayout activePath="/staff/payments" title="Payments">
      {/* Header */}
      <div className="sp-header-row">
        <div className="sp-title-group">
          <CreditCard size={22} className="sp-title-icon" />
          <div>
            <h2 className="sp-title">DBT Payment Status</h2>
            <p className="sp-subtitle">Center payment disbursement records & batch settlement</p>
          </div>
        </div>
        <div className="sp-header-actions">
          <button onClick={fetchPayments} className="staff-refresh-btn">↻ Refresh</button>
        </div>
      </div>

      {/* Success Banner */}
      {successToast && (
        <div className="sp-success-toast">
          <CheckCircle2 size={18} />
          <span>{successToast}</span>
        </div>
      )}

      {/* Summary cards */}
      <div className="staff-metrics-grid">
        {summaryCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="staff-metric-card">
            <div className="staff-metric-icon-wrap" style={{ background: `${color}18` }}>
              <Icon size={22} style={{ color }} />
            </div>
            <div>
              <div className="staff-metric-value" style={{ color }}>{value}</div>
              <div className="staff-metric-label">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Batch Action Toolbar */}
      <div className="sp-batch-bar">
        <div className="sp-batch-left">
          <button
            id="staff-settle-all-btn"
            className="sp-batch-btn sp-batch-btn-primary"
            onClick={() => openBatchModal(pendingPayments)}
            disabled={pendingPayments.length === 0}
            title={pendingPayments.length ? `Disburse all ${pendingPayments.length} pending payments` : 'No pending payments'}
          >
            <Zap size={16} />
            <span>Settle All Pending ({pendingPayments.length})</span>
          </button>

          {selectedIds.length > 0 && (
            <button
              id="staff-settle-selected-btn"
              className="sp-batch-btn sp-batch-btn-accent"
              onClick={() => openBatchModal(transactions.filter(t => selectedIds.includes(t.id)))}
            >
              <CheckSquare size={16} />
              <span>Disburse Selected ({selectedIds.length})</span>
            </button>
          )}

          <button
            id="staff-export-csv-btn"
            className="sp-batch-btn sp-batch-btn-secondary"
            onClick={handleExportCSV}
            title="Download formatted CSV sheet for bank DBT payout"
          >
            <Download size={16} />
            <span>Export Bank Sheet (CSV)</span>
          </button>
        </div>

        {selectedIds.length > 0 && (
          <div className="sp-selection-pill">
            <span>{selectedIds.length} row(s) selected</span>
            <button className="sp-clear-selection-btn" onClick={() => setSelectedIds([])}>Clear</button>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="sp-filter-tabs">
        {['All', 'Scheduled', 'Processing', 'Credited', 'On Hold', 'Failed'].map(s => (
          <button
            key={s}
            className={`sp-filter-tab ${filterStatus === s ? 'active' : ''}`}
            onClick={() => setFilterStatus(s)}
          >
            {s}
            {s !== 'All' && (
              <span className="sp-filter-count">
                {transactions.filter(t => t.status === s).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="staff-loading">
          <div className="staff-spinner" />
          <p>Loading payments…</p>
        </div>
      ) : error ? (
        <div className="staff-error-card">
          <p>⚠️ {error}</p>
          <button onClick={fetchPayments} className="staff-btn-primary">Retry</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="sp-empty">
          <CreditCard size={40} />
          <p>No payment records found</p>
        </div>
      ) : (
        <div className="sp-table-wrap">
          <table className="sp-table">
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    className="sp-row-checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    title="Select all visible"
                    aria-label="Select all visible payments"
                  />
                </th>
                <th>Transaction ID</th>
                <th>Farmer</th>
                <th>Produce</th>
                <th>Qty</th>
                <th>Amount</th>
                <th>Settlement due</th>
                <th>Batch / Reference</th>
                <th>Destination</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const cfg = STATUS_CFG[t.status] || { cls: 'spay-transit', label: t.status }
                const isSelected = selectedIds.includes(t.id)
                return (
                  <tr key={t.id} className={isSelected ? 'sp-row-selected' : ''}>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        className="sp-row-checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectOne(t.id)}
                        aria-label={`Select payment ${t.id}`}
                      />
                    </td>
                    <td><span className="sp-token spay-txn-id">{t.id}</span></td>
                    <td>
                      <div className="sp-farmer-name">{t.farmer_name}</div>
                      <div className="sp-farmer-id">{t.farmer_id}</div>
                    </td>
                    <td>{t.produce}</td>
                    <td>{t.quantity_kg?.toLocaleString()} kg</td>
                    <td className="spay-amount">₹{t.amount?.toLocaleString()}</td>
                    <td><strong>{t.expected_settlement_date}</strong><div className="sp-farmer-id">Procured {t.date}</div></td>
                    <td><span className="spay-txn-id">{t.transaction_reference || 'Pending reference'}</span><div className="sp-farmer-id">{t.payment_batch ? `Batch ${t.payment_batch}` : t.receipt_number}</div></td>
                    <td><span className="sp-farmer-id">{t.payment_destination}</span></td>
                    <td>
                      <span className={`sp-badge ${cfg.cls}`}>{cfg.label}</span>
                      {t.dispute_status === 'Open' && <div className="sp-payment-dispute">Dispute: {t.dispute_reason}</div>}
                    </td>
                    <td>
                      <button className="sp-edit-btn" onClick={() => openSettlement(t)} aria-label={`Update payment ${t.id}`}>
                        <Edit3 size={15} /> Settle
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── 1-Click Batch Settlement Modal ── */}
      {showBatchModal && (
        <div className="payment-modal-overlay" onClick={() => !batchSettling && setShowBatchModal(false)}>
          <form className="payment-modal sp-batch-modal" onSubmit={handleConfirmBatchSettle} onClick={e => e.stopPropagation()}>
            <div className="payment-modal-header">
              <div>
                <h2>⚡ Batch DBT Disbursement</h2>
                <p>
                  Disbursing <strong>{batchTargetPayments.length}</strong> payment(s) totaling{' '}
                  <strong style={{ color: '#16a34a' }}>₹{batchTotalAmount.toLocaleString()}</strong>
                </p>
              </div>
              <button type="button" onClick={() => !batchSettling && setShowBatchModal(false)}><X size={18} /></button>
            </div>

            <div className="sp-batch-modal-notice">
              <Zap size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
              <div>
                <strong>Instant Auto-Notification</strong>
                <p>Every farmer in this batch will immediately receive a DBT Payment Credited push notification on their device.</p>
              </div>
            </div>

            <label>
              Target Status
              <select
                value={batchForm.status}
                onChange={e => setBatchForm(f => ({ ...f, status: e.target.value }))}
              >
                <option value="Credited">Credited (Funds Transferred)</option>
                <option value="Processing">Processing (Bank Clearing)</option>
                <option value="Scheduled">Scheduled</option>
              </select>
            </label>

            <label>
              Payment Batch Identifier
              <input
                required
                placeholder="e.g. DBT-20260921-B1"
                value={batchForm.payment_batch}
                onChange={e => setBatchForm(f => ({ ...f, payment_batch: e.target.value }))}
              />
            </label>

            <label>
              Bank / UTR Reference Prefix
              <input
                required
                placeholder="e.g. SBI-DBT-20260921"
                value={batchForm.transaction_reference}
                onChange={e => setBatchForm(f => ({ ...f, transaction_reference: e.target.value }))}
              />
            </label>

            <div className="payment-modal-footer">
              <button
                type="button"
                className="payment-cancel-btn"
                disabled={batchSettling}
                onClick={() => setShowBatchModal(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                id="staff-confirm-batch-btn"
                className="payment-save-btn sp-batch-confirm-btn"
                disabled={batchSettling}
              >
                {batchSettling ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                {batchSettling ? 'Disbursing Payments…' : `Confirm & Disburse (₹${batchTotalAmount.toLocaleString()})`}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Single Payment Settlement Modal ── */}
      {editingPayment && (
        <div className="payment-modal-overlay" onClick={() => setEditingPayment(null)}>
          <form className="payment-modal" onSubmit={saveSettlement} onClick={(event) => event.stopPropagation()}>
            <div className="payment-modal-header">
              <div>
                <h2>Update Settlement</h2>
                <p>{editingPayment.id} · {editingPayment.farmer_name} · ₹{editingPayment.amount?.toLocaleString()}</p>
              </div>
              <button type="button" onClick={() => setEditingPayment(null)}><X size={18} /></button>
            </div>
            <label>
              Status
              <select value={settlementForm.status} onChange={(event) => setSettlementForm((form) => ({ ...form, status: event.target.value }))}>
                <option>Scheduled</option>
                <option>Processing</option>
                <option>Credited</option>
                <option>On Hold</option>
                <option>Failed</option>
              </select>
            </label>
            <label>
              Expected settlement date
              <input required type="date" value={settlementForm.expected_settlement_date} onChange={(event) => setSettlementForm((form) => ({ ...form, expected_settlement_date: event.target.value }))} />
            </label>
            <label>
              Payment batch
              <input placeholder="e.g. DBT-SEP-04" value={settlementForm.payment_batch} onChange={(event) => setSettlementForm((form) => ({ ...form, payment_batch: event.target.value }))} />
            </label>
            <label>
              Transaction reference
              <input placeholder="Bank / UPI reference" value={settlementForm.transaction_reference} onChange={(event) => setSettlementForm((form) => ({ ...form, transaction_reference: event.target.value }))} />
            </label>
            {editingPayment.dispute_status === 'Open' && (
              <label>
                Dispute resolution
                <textarea required rows="3" placeholder="Record the resolution before crediting this payment." value={settlementForm.dispute_resolution} onChange={(event) => setSettlementForm((form) => ({ ...form, dispute_resolution: event.target.value }))} />
              </label>
            )}
            <div className="payment-modal-footer">
              <button type="button" className="payment-cancel-btn" onClick={() => setEditingPayment(null)}>Cancel</button>
              <button className="payment-save-btn" disabled={saving}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Saving…' : 'Save settlement'}
              </button>
            </div>
          </form>
        </div>
      )}
    </StaffLayout>
  )
}
