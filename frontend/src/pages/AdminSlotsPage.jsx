import { useEffect, useState } from 'react'
import AdminLayout from '../components/AdminLayout'
import { getAdminSlots, getAdminCenters } from '../api'
import { Clock, CheckCircle2, AlertCircle, Building2, Filter } from 'lucide-react'

export default function AdminSlotsPage() {
  const [slots, setSlots] = useState([])
  const [centers, setCenters] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCenterId, setSelectedCenterId] = useState('All')

  useEffect(() => {
    async function load() {
      try {
        const [slotsData, centersData] = await Promise.all([
          getAdminSlots(),
          getAdminCenters(),
        ])
        setSlots(slotsData || [])
        setCenters(centersData || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filteredSlots = slots.filter((s) => {
    if (selectedCenterId === 'All') return true
    return String(s.center_id) === String(selectedCenterId) || s.center_name.includes(selectedCenterId)
  })

  return (
    <AdminLayout activePath="/admin/slots" title="Slot Schedules & Capacity" showTimeframe={false}>
      <div className="admin-page-container">
        {/* Filter Bar */}
        <div className="admin-page-toolbar">
          <div className="toolbar-actions" style={{ marginLeft: 0 }}>
            <div className="select-with-icon">
              <Building2 size={16} className="select-lead-icon" />
              <select
                className="toolbar-select"
                value={selectedCenterId}
                onChange={(e) => setSelectedCenterId(e.target.value)}
              >
                <option value="All">All Procurement Centers</option>
                {centers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="toolbar-stats-pill">
            <span>Showing <strong>{filteredSlots.length}</strong> slot windows</span>
          </div>
        </div>

        {/* Slots Table */}
        <div className="admin-panel-card table-panel-card">
          <div className="admin-table-responsive">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Center</th>
                  <th>Date</th>
                  <th>Time Window</th>
                  <th>Capacity</th>
                  <th>Booked</th>
                  <th>Available</th>
                  <th>Utilization</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className="skeleton-table-row">
                      <td><div className="skeleton-text skeleton medium"></div></td>
                      <td><div className="skeleton-text skeleton medium"></div></td>
                      <td><div className="skeleton-badge skeleton"></div></td>
                      <td><div className="skeleton-text skeleton short"></div></td>
                      <td><div className="skeleton-text skeleton short"></div></td>
                      <td><div className="skeleton-badge skeleton"></div></td>
                      <td><div className="skeleton-text skeleton"></div></td>
                      <td><div className="skeleton-badge skeleton"></div></td>
                    </tr>
                  ))
                ) : filteredSlots.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ padding: 0, border: 'none' }}>
                      <div className="empty-state-wrapper" style={{ margin: '24px' }}>
                        <div className="empty-state-icon">
                          <Clock size={32} />
                        </div>
                        <h3 className="empty-state-title">No Time Slots Configured</h3>
                        <p className="empty-state-subtitle">
                          {selectedCenterId !== 'All'
                            ? "This center doesn't have any time slots configured yet."
                            : "There are no time slots configured across any of your procurement centers."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredSlots.map((slot) => {
                    const pct = Math.round((slot.booked_count / Math.max(slot.capacity, 1)) * 100)
                    return (
                      <tr key={slot.id}>
                        <td>
                          <strong className="center-cell-name">{slot.center_name}</strong>
                        </td>
                        <td>
                          <span style={{ color: '#4b5563', fontSize: '14px' }}>{slot.date}</span>
                        </td>
                        <td>
                          <div className="time-badge">
                            <Clock size={13} />
                            <span>{slot.time}</span>
                          </div>
                        </td>
                        <td>{slot.capacity}</td>
                        <td>
                          <strong style={{ color: '#0a7a4a' }}>{slot.booked_count}</strong>
                        </td>
                        <td>
                          <span className={`avail-tag ${slot.available === 0 ? 'zero' : ''}`}>
                            {slot.available} left
                          </span>
                        </td>
                        <td>
                          <div className="mini-progress-cell">
                            <div className="perf-progress-track" style={{ height: '6px', width: '90px' }}>
                              <div
                                className="perf-progress-fill"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: pct > 85 ? '#0a7a4a' : '#16a34a',
                                }}
                              />
                            </div>
                            <span className="pct-text">{pct}%</span>
                          </div>
                        </td>
                        <td>
                          <span className={`status-pill ${slot.status === 'Active' ? 'active' : 'inactive'}`}>
                            {slot.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
