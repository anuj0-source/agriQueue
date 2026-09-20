import { useEffect, useState } from 'react'
import { CreditCard, TrendingUp, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import StaffLayout from '../components/StaffLayout'
import { getStaffPayments } from '../api'

const STATUS_CFG = {
  Credited:   { cls: 'spay-credited',   label: 'Credited'   },
  'In Transit': { cls: 'spay-transit',  label: 'In Transit' },
  Cancelled:  { cls: 'spay-cancelled',  label: 'Cancelled'  },
}

export default function StaffPaymentsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('All')
  const [error, setError] = useState(null)

  useEffect(() => {
    const currentUser = (() => {
      try { return JSON.parse(localStorage.getItem('currentUser') || 'null') } catch { return null }
    })()
    if (!currentUser || currentUser.role !== 'staff') {
      window.location.href = '/login'
      return
    }
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

  const summary = data?.summary || {}
  const transactions = data?.transactions || []
  const filtered = filterStatus === 'All' ? transactions
    : transactions.filter(t => t.status === filterStatus)

  const summaryCards = [
    { label: 'Total Disbursed', value: summary.total_disbursed || '₹0', icon: TrendingUp, color: '#22c55e' },
    { label: 'Pending Amount', value: summary.pending_total || '₹0', icon: Clock, color: '#f59e0b' },
    { label: 'Completed', value: summary.completed_count ?? 0, icon: CheckCircle2, color: '#3b82f6' },
    { label: 'Processing', value: summary.pending_count ?? 0, icon: AlertCircle, color: '#8b5cf6' },
  ]

  return (
    <StaffLayout activePath="/staff/payments" title="Payments">
      {/* Header */}
      <div className="sp-header-row">
        <div className="sp-title-group">
          <CreditCard size={22} className="sp-title-icon" />
          <div>
            <h2 className="sp-title">DBT Payment Status</h2>
            <p className="sp-subtitle">Center payment disbursement records</p>
          </div>
        </div>
        <button onClick={fetchPayments} className="staff-refresh-btn">↻ Refresh</button>
      </div>

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

      {/* Filter */}
      <div className="sp-filter-tabs">
        {['All', 'Credited', 'In Transit', 'Cancelled'].map(s => (
          <button
            key={s}
            className={`sp-filter-tab ${filterStatus === s ? 'active' : ''}`}
            onClick={() => setFilterStatus(s)}
          >
            {s}
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
                <th>Transaction ID</th>
                <th>Farmer</th>
                <th>Produce</th>
                <th>Qty</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const cfg = STATUS_CFG[t.status] || { cls: 'spay-transit', label: t.status }
                return (
                  <tr key={t.id}>
                    <td><span className="sp-token spay-txn-id">{t.id}</span></td>
                    <td>
                      <div className="sp-farmer-name">{t.farmer_name}</div>
                      <div className="sp-farmer-id">{t.farmer_id}</div>
                    </td>
                    <td>{t.produce}</td>
                    <td>{t.quantity_kg?.toLocaleString()} kg</td>
                    <td className="spay-amount">₹{t.amount?.toLocaleString()}</td>
                    <td>{t.date}</td>
                    <td>
                      <span className={`sp-badge ${cfg.cls}`}>{cfg.label}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </StaffLayout>
  )
}
