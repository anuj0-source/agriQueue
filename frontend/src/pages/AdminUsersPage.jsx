import { useEffect, useState } from 'react'
import AdminLayout from '../components/AdminLayout'
import { getAdminUsers } from '../api'
import { Search, UserCheck, Phone, MapPin, Calendar, ShieldCheck } from 'lucide-react'

export default function AdminUsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

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
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.farmer_id.toLowerCase().includes(search.toLowerCase()) ||
    u.mobile.includes(search) ||
    u.location.toLowerCase().includes(search.toLowerCase())
  )

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

        {/* Users Table */}
        <div className="admin-panel-card table-panel-card">
          <div className="admin-table-responsive">
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
                            {user.name.split(' ').map((n) => n[0]).join('')}
                          </div>
                          <span className="user-full-name">{user.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className="id-code-badge">{user.farmer_id}</span>
                      </td>
                      <td>
                        <div className="contact-cell">
                          <Phone size={13} className="cell-sub-icon" />
                          <span>{user.mobile}</span>
                        </div>
                      </td>
                      <td>
                        <span className="loc-text">{user.location}</span>
                      </td>
                      <td>
                        <span className="role-tag">{user.role}</span>
                      </td>
                      <td>
                        <span className="count-pill">{user.total_bookings} slots</span>
                      </td>
                      <td>
                        <span className="verify-badge verified">
                          <ShieldCheck size={14} />
                          <span>{user.status}</span>
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
