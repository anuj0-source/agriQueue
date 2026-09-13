import { useEffect, useState } from 'react'
import AdminLayout from '../components/AdminLayout'
import { getAdminProcurements } from '../api'
import { Search, Sprout, Building2, CheckCircle2, Clock } from 'lucide-react'

export default function AdminProcurementsPage() {
  const [procurements, setProcurements] = useState([])
  const [search, setSearch] = useState('')
  const [cropFilter, setCropFilter] = useState('All')

  useEffect(() => {
    async function load() {
      const data = await getAdminProcurements()
      setProcurements(data)
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
                {filtered.map((item) => (
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
