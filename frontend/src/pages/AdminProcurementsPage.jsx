import { useEffect, useState } from 'react'
import AdminLayout from '../components/AdminLayout'
import { getAdminProcurements } from '../api'
import { Search, Sprout, Building2, CheckCircle2, Clock } from 'lucide-react'

export default function AdminProcurementsPage() {
  const [procurements, setProcurements] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [cropFilter, setCropFilter] = useState('All')

  useEffect(() => {
    async function load() {
      try {
        const data = await getAdminProcurements()
        setProcurements(data || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = procurements.filter((p) => {
    const matchesSearch =
      p.token.toLowerCase().includes(search.toLowerCase()) ||
      p.farmer_name.toLowerCase().includes(search.toLowerCase()) ||
      p.center_name.toLowerCase().includes(search.toLowerCase())
    const matchesCrop = cropFilter === 'All' || p.produce === cropFilter
    return matchesSearch && matchesCrop
  })

  return (
    <AdminLayout activePath="/admin/procurements" title="Procurement Batches & Queue" showTimeframe={false}>
      <div className="admin-page-container">
        {/* Toolbar */}
        <div className="admin-page-toolbar">
          <div className="toolbar-search-box">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search by token, farmer, or center..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="toolbar-actions">
            <select
              className="toolbar-select"
              value={cropFilter}
              onChange={(e) => setCropFilter(e.target.value)}
            >
              <option value="All">All Crops</option>
              <option value="Wheat">Wheat</option>
              <option value="Rice">Rice</option>
              <option value="Maize">Maize</option>
              <option value="Pulses">Pulses</option>
            </select>
          </div>
        </div>

        {/* Procurements Table */}
        <div className="admin-panel-card table-panel-card">
          <div className="admin-table-responsive">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Farmer</th>
                  <th>Center</th>
                  <th>Produce &amp; Grade</th>
                  <th>Weight (kg)</th>
                  <th>Total Value</th>
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
                      <td><div className="skeleton-badge skeleton" style={{ width: '80px' }}></div></td>
                      <td><div className="skeleton-text skeleton short"></div></td>
                      <td><div className="skeleton-text skeleton medium"></div></td>
                      <td><div className="skeleton-text skeleton short"></div></td>
                      <td><div className="skeleton-badge skeleton"></div></td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ padding: 0, border: 'none' }}>
                      <div className="empty-state-wrapper" style={{ margin: '24px' }}>
                        <div className="empty-state-icon">
                          <Sprout size={32} />
                        </div>
                        <h3 className="empty-state-title">No Procurements Found</h3>
                        <p className="empty-state-subtitle">
                          {search || cropFilter !== 'All'
                            ? "No procurement records match your current filters."
                            : "There are no procurement batches recorded in the system yet."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <span className="token-tag">{item.token}</span>
                      </td>
                      <td>
                        <div>
                          <strong>{item.farmer_name}</strong>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{item.farmer_id}</div>
                        </div>
                      </td>
                      <td>
                        <span className="loc-text">{item.center_name}</span>
                      </td>
                      <td>
                        <div className="crop-cell">
                          <span className="crop-pill">{item.produce}</span>
                          <span className="grade-sub">{item.produce_type}</span>
                        </div>
                      </td>
                      <td>
                        <strong>{item.quantity_kg?.toLocaleString()} kg</strong>
                      </td>
                      <td>
                        <strong style={{ color: '#0a7a4a' }}>
                          ₹{item.total_price?.toLocaleString()}
                        </strong>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>{item.date}</span>
                      </td>
                      <td>
                        <span className={`status-pill ${item.status === 'Completed' ? 'active' : 'pending'}`}>
                          {item.status}
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
