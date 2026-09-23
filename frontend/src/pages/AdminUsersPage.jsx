import { useEffect, useState } from 'react'
import AdminLayout from '../components/AdminLayout'
import { getAdminUsers } from '../api'
import { Search, UserCheck, Phone, MapPin, Calendar, ShieldCheck, ChevronDown } from 'lucide-react'

export default function AdminUsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedUserId, setExpandedUserId] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const data = await getAdminUsers()
        setUsers(data || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filteredUsers = users.filter((u) =>
    (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.farmer_id || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.mobile || '').includes(search) ||
    (u.location || '').toLowerCase().includes(search.toLowerCase())
  )

  const toggleExpand = (id) => {
    setExpandedUserId(prev => prev === id ? null : id)
  }

  return (
    <AdminLayout activePath="/admin/users" title="Registered Farmers & Staff" showTimeframe={false}>
      <div className="admin-page-container">
        {/* Controls */}
        <div className="admin-page-toolbar">
          <div className="toolbar-search-box">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search by farmer name, ID, phone, or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="toolbar-stats-pill">
            <span>Total Registered: <strong>{users.length}</strong></span>
          </div>
        </div>

        {/* Users Table / Content */}
        <div className="admin-panel-card table-panel-card">
          {/* Desktop Table View */}
          <div className="admin-table-responsive admin-desktop-table-wrap">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Farmer</th>
                  <th>Farmer ID</th>
                  <th>Contact Number</th>
                  <th>Village &amp; District</th>
                  <th>Role</th>
                  <th>Total Bookings</th>
                  <th>Verification</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className="skeleton-table-row">
                      <td><div className="skeleton-text skeleton"></div></td>
                      <td><div className="skeleton-text skeleton short"></div></td>
                      <td><div className="skeleton-text skeleton"></div></td>
                      <td><div className="skeleton-text skeleton medium"></div></td>
                      <td><div className="skeleton-badge skeleton"></div></td>
                      <td><div className="skeleton-text skeleton short"></div></td>
                      <td><div className="skeleton-badge skeleton"></div></td>
                    </tr>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: 0, border: 'none' }}>
                      <div className="empty-state-wrapper" style={{ margin: '24px' }}>
                        <div className="empty-state-icon">
                          <UserCheck size={32} />
                        </div>
                        <h3 className="empty-state-title">No Farmers or Staff Found</h3>
                        <p className="empty-state-subtitle">
                          {search ? "No users match your current search criteria." : "There are currently no registered users in the system."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="user-name-cell">
                          <div className="user-avatar-small">
                            {(user.name || '').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                          </div>
                          <span className="user-full-name">{user.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className="id-code-badge">{user.farmer_id || 'N/A'}</span>
                      </td>
                      <td>
                        <div className="contact-cell">
                          <Phone size={13} className="cell-sub-icon" />
                          <span>{user.mobile || 'N/A'}</span>
                        </div>
                      </td>
                      <td>
                        <span className="loc-text">{user.location || 'N/A'}</span>
                      </td>
                      <td>
                        <span className="role-tag">{user.role || 'Farmer'}</span>
                      </td>
                      <td>
                        <span className="count-pill">{user.total_bookings ?? 0} slots</span>
                      </td>
                      <td>
                        <span className="verify-badge verified">
                          <ShieldCheck size={14} />
                          <span>{user.status || 'Verified'}</span>
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Accordion List (Only name visible, click to reveal all details) */}
          <div className="admin-mobile-user-list">
            {loading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="admin-mobile-user-card" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="skeleton" style={{ width: 36, height: 36, borderRadius: '50%' }} />
                    <div style={{ flex: 1 }}>
                      <div className="skeleton skeleton-text" style={{ width: '50%', marginBottom: 6 }} />
                      <div className="skeleton skeleton-text short" style={{ width: '30%' }} />
                    </div>
                  </div>
                </div>
              ))
            ) : filteredUsers.length === 0 ? (
              <div className="empty-state-wrapper" style={{ padding: '32px 16px', background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <div className="empty-state-icon">
                  <UserCheck size={28} />
                </div>
                <h3 className="empty-state-title" style={{ fontSize: 16 }}>No Farmers or Staff Found</h3>
                <p className="empty-state-subtitle" style={{ fontSize: 13 }}>
                  {search ? "No users match your current search criteria." : "There are currently no registered users in the system."}
                </p>
              </div>
            ) : (
              filteredUsers.map((user) => {
                const isExpanded = expandedUserId === user.id
                const initials = (user.name || '')
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase() || 'U'

                return (
                  <div key={user.id} className={`admin-mobile-user-card ${isExpanded ? 'expanded' : ''}`}>
                    <div
                      className="admin-mobile-user-header"
                      onClick={() => toggleExpand(user.id)}
                      role="button"
                      tabIndex={0}
                      aria-expanded={isExpanded}
                    >
                      <div className="admin-mobile-user-identity">
                        <div className="user-avatar-small">
                          {initials}
                        </div>
                        <div className="admin-mobile-user-info">
                          <span className="admin-mobile-user-name">{user.name}</span>
                          <span className="admin-mobile-user-sub">
                            {user.role || 'Farmer'} · Tap for details
                          </span>
                        </div>
                      </div>
                      <div className="admin-mobile-user-chevron">
                        <ChevronDown size={18} className={`chevron-icon ${isExpanded ? 'rotate' : ''}`} />
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="admin-mobile-user-details">
                        <div className="admin-mobile-detail-row">
                          <span className="detail-label">Farmer ID</span>
                          <span className="id-code-badge">{user.farmer_id || 'N/A'}</span>
                        </div>

                        <div className="admin-mobile-detail-row">
                          <span className="detail-label">Contact Number</span>
                          <a
                            href={user.mobile ? `tel:${user.mobile}` : undefined}
                            className="contact-link"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Phone size={13} className="cell-sub-icon" />
                            <span>{user.mobile || 'N/A'}</span>
                          </a>
                        </div>

                        <div className="admin-mobile-detail-row">
                          <span className="detail-label">Village &amp; District</span>
                          <span className="loc-text">
                            <MapPin size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle', color: '#64748b' }} />
                            {user.location || 'N/A'}
                          </span>
                        </div>

                        <div className="admin-mobile-detail-row">
                          <span className="detail-label">Role</span>
                          <span className="role-tag">{user.role || 'Farmer'}</span>
                        </div>

                        <div className="admin-mobile-detail-row">
                          <span className="detail-label">Total Bookings</span>
                          <span className="count-pill">{user.total_bookings ?? 0} slots</span>
                        </div>

                        <div className="admin-mobile-detail-row">
                          <span className="detail-label">Verification</span>
                          <span className={`verify-badge ${user.status === 'Verified' || user.status === 'Active' ? 'verified' : ''}`}>
                            <ShieldCheck size={14} />
                            <span>{user.status || 'Verified'}</span>
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

