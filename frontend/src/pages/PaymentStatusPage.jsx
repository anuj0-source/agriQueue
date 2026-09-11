import { useState, useEffect } from 'react'
import FarmerLayout from '../components/FarmerLayout'
import { TableRowsSkeleton } from '../components/Skeletons'
import { PAYMENT_RECORDS } from '../data/farmer-data'
import { getPaymentRecords } from '../api'

export default function PaymentStatusPage() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPayments() {
      try {
        const data = await getPaymentRecords()
        if (Array.isArray(data) && data.length > 0) {
          setPayments(data)
        }
      } catch (err) {
        console.error('Failed to load payment records:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchPayments()
  }, [])
  return (
    <FarmerLayout activePath="/payments">
      <div className="payment-status-container">
        <h1 className="page-main-heading">Payment Status</h1>

        {/* Payment Data Table */}
        <div className="portal-card data-table-card">
          <div className="table-responsive">
            <table className="portal-data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Produce</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Transaction ID</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableRowsSkeleton rows={5} columns={5} />
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: 'var(--muted)' }}>
                      No payment records found.
                    </td>
                  </tr>
                ) : (
                  payments.map((row) => (
                    <tr key={row.id}>
                      <td className="cell-date">{row.date}</td>
                      <td className="cell-produce">{row.produce}</td>
                      <td className="cell-amount">{row.amount}</td>
                      <td>
                        <span
                          className={`status-pill ${
                            row.status === 'Paid' ? 'completed' : 'pending'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="cell-txid">{row.transactionId}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </FarmerLayout>
  )
}
