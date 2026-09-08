import FarmerLayout from '../components/FarmerLayout'
import { PAYMENT_RECORDS } from '../data/farmer-data'

export default function PaymentStatusPage() {
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
                {PAYMENT_RECORDS.map((row) => (
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </FarmerLayout>
  )
}
