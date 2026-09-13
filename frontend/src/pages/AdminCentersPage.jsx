import { useEffect, useState } from 'react'
import AdminLayout from '../components/AdminLayout'
import { getAdminCenters } from '../api'
import { Building2, Search, Plus, MapPin, Clock, Hash } from 'lucide-react'

export default function AdminCentersPage() {
  const [centers, setCenters] = useState([])
  const [search, setSearch] = useState('')
  const [filterState, setFilterState] = useState('All')

  useEffect(() => {
    async function load() {
      const data = await getAdminCenters()
      setCenters(data)
    }
    load()
  }, [])

  const filteredCenters = centers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.district.toLowerCase().includes(search.toLowerCase()) ||
      c.village.toLowerCase().includes(search.toLowerCase())
    const matchesState = filterState === 'All' || c.state === filterState
    return matchesSearch && matchesState
  })

  return (
    <AdminLayout activePath="/admin/centers" title="Procurement Centers" showTimeframe={false}>
      <div className="admin-page-container">
        {/* Controls Bar */}
        <div className="admin-page-toolbar">
          <div className="toolbar-search-box">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search center by name, village or district..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="toolbar-actions">
            <select
              className="toolbar-select"
              value={filterState}
              onChange={(e) => setFilterState(e.target.value)}
            >
              <option value="All">All States</option>
              <option value="Uttar Pradesh">Uttar Pradesh</option>
              <option value="Punjab">Punjab</option>
              <option value="Haryana">Haryana</option>
              <option value="Madhya Pradesh">Madhya Pradesh</option>
              <option value="Rajasthan">Rajasthan</option>
            </select>

            <a href="/admin/centers/new" className="admin-primary-btn">
              <Plus size={16} />
              <span>Add Center</span>
            </a>
          </div>
        </div>

        {/* Centers Grid */}
        <div className="admin-centers-grid">
          {filteredCenters.map((center) => (
            <div 
              key={center.id} 
              className="admin-panel-card center-item-card" 
              onClick={() => window.location.href = `/admin/centers/details?id=${center.id}`}
              style={{ cursor: 'pointer' }}
            >
              <div className="center-card-header">
                <div className="center-icon-badge">
                  <Building2 size={20} />
                </div>
                <div className="center-header-text">
                  <h3 className="center-title">{center.name}</h3>
                  <p className="center-loc">
                    <MapPin size={13} />
                    <span>{center.village}, {center.district} • {center.state}</span>
                  </p>
                </div>
                <span className={`status-pill ${center.status === 'Active' ? 'active' : 'inactive'}`}>
                  {center.status}
                </span>
              </div>

              <div className="center-meta-row">
                <div className="meta-item">
                  <Clock size={13} />
                  <span>{center.opening_time} - {center.closing_time}</span>
                </div>
                <div className="meta-item">
                  <Hash size={12} />
                  <span>PIN {center.pincode}</span>
                </div>
              </div>

              <div className="center-capacity-block">
                <div className="capacity-label-row">
                  <span className="cap-label">Capacity Utilization</span>
                  <span className="cap-val">
                    {center.current_capacity} / {center.daily_capacity} ({center.utilization}%)
                  </span>
                </div>
                <div className="perf-progress-track">
                  <div
                    className="perf-progress-fill"
                    style={{
                      width: `${center.utilization}%`,
                      backgroundColor: center.utilization > 85 ? '#0a7a4a' : '#16a34a',
                    }}
                  />
                </div>
              </div>

              <div className="center-card-footer">
                <a 
                  href={`/admin/centers/details?id=${center.id}`} 
                  className="view-slots-link"
                  onClick={(e) => e.stopPropagation()}
                >
                  View Details →
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  )
}
