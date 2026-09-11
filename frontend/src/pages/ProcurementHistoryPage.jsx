import { useState, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import FarmerLayout from '../components/FarmerLayout'
import { TableRowsSkeleton } from '../components/Skeletons'
import { PROCUREMENT_HISTORY } from '../data/farmer-data'
import { getProcurementHistory } from '../api'

export default function ProcurementHistoryPage() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [cropFilter, setCropFilter] = useState('All Crops')
  const [yearFilter, setYearFilter] = useState('All Years')

  useEffect(() => {
    async function fetchHistory() {
      try {
        const data = await getProcurementHistory()
        if (Array.isArray(data) && data.length > 0) {
          setHistory(data)
        }
      } catch (err) {
        console.error('Failed to load procurement history:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [])

  const filteredHistory = history.filter((item) => {
    const matchesCrop = cropFilter === 'All Crops' || item.produce === cropFilter
    const matchesYear = yearFilter === 'All Years' || (item.date && item.date.includes(yearFilter))
    return matchesCrop && matchesYear
  })

  return (
    <FarmerLayout activePath="/procurement-history">
      <div className="procurement-history-container">
        <h1 className="page-main-heading">Procurement History</h1>

        {/* Filter Controls Row */}
        <div className="filters-control-row">
          <div className="filter-select-wrap">
            <select
              value={cropFilter}
              onChange={(e) => setCropFilter(e.target.value)}
              className="filter-dropdown"
            >
              <option value="All Crops">All Crops</option>
              <option value="Wheat">Wheat</option>
              <option value="Rice">Rice</option>
              <option value="Maize">Maize</option>
            </select>
            <ChevronDown size={14} className="filter-arrow" />
          </div>

          <div className="filter-select-wrap">
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="filter-dropdown"
            >
              <option value="All Years">All Years</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
            <ChevronDown size={14} className="filter-arrow" />
          </div>
        </div>

        {/* Data Table */}
        <div className="portal-card data-table-card">
          <div className="table-responsive">
            <table className="portal-data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Center</th>
                  <th>Produce</th>
                  <th>Quantity</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableRowsSkeleton rows={5} columns={6} />
                ) : filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--muted)' }}>
                      No procurement records found.
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((row) => (
                    <tr key={row.id}>
                      <td className="cell-date">{row.date}</td>
                      <td>{row.center}</td>
                      <td className="cell-produce">{row.produce}</td>
                      <td>{row.quantity}</td>
                      <td className="cell-amount">{row.amount}</td>
                      <td>
                        <span className="status-pill completed">{row.status}</span>
                      </td>
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
