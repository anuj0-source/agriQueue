import { useEffect, useState } from 'react'
import AdminLayout from '../components/AdminLayout'
import { getAdminSlots, getAdminCenters } from '../api'
import { Clock, CheckCircle2, AlertCircle, Building2, Filter, ChevronDown } from 'lucide-react'

export default function AdminSlotsPage() {
  const [slots, setSlots] = useState([])
  const [centers, setCenters] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCenterId, setSelectedCenterId] = useState('All')
  const [expandedSlotId, setExpandedSlotId] = useState(null)

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
    return String(s.center_id) === String(selectedCenterId) || (s.center_name && s.center_name.includes(selectedCenterId))
  })

  const toggleExpand = (id) => {
    setExpandedSlotId(prev => prev === id ? null : id)
  }

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

        {/* Slots Table / Content */}
        <div className="admin-panel-card table-panel-card">
          {/* Desktop Table View */}
          <div className="admin-table-responsive admin-desktop-table-wrap">
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
                        <td>{slot.capacity} q</td>
                        <td>
                          <strong style={{ color: '#0a7a4a' }}>{slot.booked_count} q</strong>
                        </td>
                        <td>
                          <span className={`avail-tag ${slot.available === 0 ? 'zero' : ''}`}>
                            {slot.available} q left
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

          {/* Mobile Accordion List (Only Center Name visible initially, click to expand all details) */}
          <div className="admin-mobile-slot-list">
            {loading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="admin-mobile-slot-card" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 10 }} />
                    <div style={{ flex: 1 }}>
                      <div className="skeleton skeleton-text" style={{ width: '55%', marginBottom: 6 }} />
                      <div className="skeleton skeleton-text short" style={{ width: '35%' }} />
                    </div>
                  </div>
                </div>
              ))
            ) : filteredSlots.length === 0 ? (
              <div className="empty-state-wrapper" style={{ padding: '32px 16px', background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <div className="empty-state-icon">
                  <Clock size={28} />
                </div>
                <h3 className="empty-state-title" style={{ fontSize: 16 }}>No Time Slots Configured</h3>
                <p className="empty-state-subtitle" style={{ fontSize: 13 }}>
                  {selectedCenterId !== 'All'
                    ? "This center doesn't have any time slots configured yet."
                    : "There are no time slots configured across any of your procurement centers."}
                </p>
              </div>
            ) : (
              filteredSlots.map((slot) => {
                const isExpanded = expandedSlotId === slot.id
                const pct = Math.round((slot.booked_count / Math.max(slot.capacity, 1)) * 100)

                return (
                  <div key={slot.id} className={`admin-mobile-slot-card ${isExpanded ? 'expanded' : ''}`}>
                    <div
                      className="admin-mobile-slot-header"
                      onClick={() => toggleExpand(slot.id)}
                      role="button"
                      tabIndex={0}
                      aria-expanded={isExpanded}
                    >
                      <div className="admin-mobile-slot-identity">
                        <div className="admin-mobile-slot-icon">
                          <Building2 size={17} />
                        </div>
                        <div className="admin-mobile-slot-info">
                          <span className="admin-mobile-slot-name">{slot.center_name}</span>
                          <span className="admin-mobile-slot-sub">
                            {slot.date} · {slot.time}
                          </span>
                        </div>
                      </div>
                      <div className="admin-mobile-slot-header-right">
                        <span className={`status-pill ${slot.status === 'Active' ? 'active' : 'inactive'}`}>
                          {slot.status}
                        </span>
                        <ChevronDown size={18} className={`chevron-icon ${isExpanded ? 'rotate' : ''}`} />
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="admin-mobile-slot-details">
                        <div className="admin-mobile-detail-row">
                          <span className="detail-label">Center Name</span>
                          <strong>{slot.center_name}</strong>
                        </div>

                        <div className="admin-mobile-detail-row">
                          <span className="detail-label">Scheduled Date</span>
                          <span style={{ fontWeight: 600, color: '#334155' }}>{slot.date}</span>
                        </div>

                        <div className="admin-mobile-detail-row">
                          <span className="detail-label">Time Window</span>
                          <div className="time-badge">
                            <Clock size={13} />
                            <span>{slot.time}</span>
                          </div>
                        </div>

                        <div className="admin-mobile-detail-row">
                          <span className="detail-label">Total Capacity</span>
                          <span style={{ fontWeight: 600 }}>{slot.capacity} quintals</span>
                        </div>

                        <div className="admin-mobile-detail-row">
                          <span className="detail-label">Booked</span>
                          <strong style={{ color: '#0a7a4a' }}>{slot.booked_count} q</strong>
                        </div>

                        <div className="admin-mobile-detail-row">
                          <span className="detail-label">Availability</span>
                          <span className={`avail-tag ${slot.available === 0 ? 'zero' : ''}`}>
                            {slot.available} q left
                          </span>
                        </div>

                        <div className="admin-mobile-detail-row">
                          <span className="detail-label">Utilization</span>
                          <div className="mini-progress-cell" style={{ gap: 8 }}>
                            <div className="perf-progress-track" style={{ height: '6px', width: '80px' }}>
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
                        </div>

                        <div className="admin-mobile-detail-row">
                          <span className="detail-label">Status</span>
                          <span className={`status-pill ${slot.status === 'Active' ? 'active' : 'inactive'}`}>
                            {slot.status}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

