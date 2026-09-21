import { useEffect, useState } from 'react'
import AdminLayout from '../components/AdminLayout'
import { getAdminPayments } from '../api'
import { CreditCard, CheckCircle2, Clock, AlertCircle, ArrowUpRight, ShieldCheck } from 'lucide-react'

export default function AdminPaymentsPage() {
  const [paymentData, setPaymentData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await getAdminPayments()
        setPaymentData(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const summary = paymentData?.summary || {
    total_disbursed: '₹1.8 Cr',
    pending_approvals: '₹4.2 Lakh',
    successful_transactions: 5420,
    processing: 38,
  }

  const transactions = paymentData?.transactions || []

  return (
    <AdminLayout activePath="/admin/payments" title="Direct Benefit Transfer (DBT) Payments" showTimeframe={false}>
      <div className="admin-page-container">
        {/* Payment KPI Cards */}
        {loading ? (
          <section className="admin-kpi-grid">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="admin-kpi-card skeleton-card skeleton" style={{ gap: '12px', padding: '24px' }}>
                <div className="skeleton-text skeleton" style={{ height: '36px', width: '50%' }}></div>
                <div className="skeleton-text skeleton short"></div>
              </div>
            ))}
          </section>
        ) : (
          <section className="admin-kpi-grid">
            <div className="admin-kpi-card">
              <div className="kpi-value" style={{ color: '#0a7a4a' }}>{summary.total_disbursed}</div>
              <div className="kpi-label">Total Disbursed</div>
            </div>
            <div className="admin-kpi-card">
              <div className="kpi-value" style={{ color: '#f59e0b' }}>{summary.pending_approvals}</div>
              <div className="kpi-label">Pending Approval</div>
            </div>
            <div className="admin-kpi-card">
              <div className="kpi-value">{summary.successful_transactions.toLocaleString()}</div>
              <div className="kpi-label">Successful Credits</div>
            </div>
            <div className="admin-kpi-card">
              <div className="kpi-value" style={{ color: '#3b82f6' }}>{summary.processing}</div>
              <div className="kpi-label">In-Transit Batches</div>
            </div>
          </section>
        )}

        {/* Transaction Ledger Table */}
        <div className="admin-panel-card table-panel-card">
          <div className="panel-header">
            <h2 className="panel-title">Recent DBT Disbursements</h2>
          </div>

          <div className="admin-table-responsive">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Beneficiary Farmer</th>
                  <th>Crop &amp; Volume</th>
                  <th>Amount Disbursed</th>
                  <th>Destination Account</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className="skeleton-table-row">
                      <td><div className="skeleton-badge skeleton"></div></td>
                      <td>
                        <div className="skeleton-text skeleton medium" style={{ marginBottom: '4px' }}></div>
                        <div className="skeleton-text skeleton short"></div>
                      </td>
                      <td><div className="skeleton-text skeleton medium"></div></td>
                      <td><div className="skeleton-text skeleton short"></div></td>
                      <td><div className="skeleton-text skeleton medium"></div></td>
                      <td><div className="skeleton-text skeleton short"></div></td>
                      <td><div className="skeleton-badge skeleton"></div></td>
                    </tr>
                  ))
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: 0, border: 'none' }}>
                      <div className="empty-state-wrapper" style={{ margin: '24px' }}>
                        <div className="empty-state-icon">
                          <CreditCard size={32} />
                        </div>
                        <h3 className="empty-state-title">No DBT Payments Found</h3>
                        <p className="empty-state-subtitle">
                          There are currently no Direct Benefit Transfer payment records matching this criteria.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td>
                        <span className="id-code-badge">{tx.id}</span>
                      </td>
                      <td>
                        <div>
                          <strong>{tx.farmer_name}</strong>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{tx.farmer_id}</div>
                        </div>
                      </td>
                      <td>
                        <span>{tx.produce} • {tx.quantity_kg?.toLocaleString()} kg</span>
                      </td>
                      <td>
                        <strong style={{ color: '#0a7a4a', fontSize: '15px' }}>
                          ₹{tx.amount?.toLocaleString()}
                        </strong>
                      </td>
                      <td>
                        <span className="bank-acc-text">{tx.bank_account}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>{tx.date}</span>
                      </td>
                      <td>
                        <span className={`status-pill ${tx.status === 'Credited' ? 'active' : 'pending'}`}>
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
