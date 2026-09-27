import { useEffect, useState } from 'react'
import AdminLayout from '../components/AdminLayout'
import { getAdminUsers } from '../api'
import { Search, UserCheck, Phone, MapPin, ShieldCheck, ChevronDown, MoreHorizontal, Mail } from 'lucide-react'

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

  // Generate a subtle background color for avatar based on name
  const getAvatarStyle = (name) => {
    const colors = ['#f1f5f9', '#f3f4f6', '#f8fafc', '#e2e8f0', '#e5e7eb'];
    const index = name ? name.length % colors.length : 0;
    return { background: colors[index], color: '#475569' };
  }

  return (
    <AdminLayout activePath="/admin/users" title="Registered Farmers & Staff" showTimeframe={false}>
      <div className="admin-page-container">
        
        {/* Modern Toolbar */}
        <div className="premium-toolbar">
          <div className="premium-search">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search by farmer name, ID, phone, or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="premium-stats">
            <div className="stat-label">Total Users</div>
            <div className="stat-value">{users.length}</div>
          </div>
        </div>

        {/* Premium Table Container */}
        <div className="premium-table-container">
          <div className="premium-table-wrapper">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>User Details</th>
                  <th>ID Number</th>
                  <th>Contact Info</th>
                  <th>Location</th>
                  <th>Role</th>
                  <th>Bookings</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className="skeleton-row">
                      <td>
                        <div className="skeleton-user">
                          <div className="skeleton-avatar"></div>
                          <div className="skeleton-lines">
                            <div className="skeleton-line w-24"></div>
                            <div className="skeleton-line w-16"></div>
                          </div>
                        </div>
                      </td>
                      <td><div className="skeleton-line w-20"></div></td>
                      <td><div className="skeleton-line w-24"></div></td>
                      <td><div className="skeleton-line w-32"></div></td>
                      <td><div className="skeleton-pill"></div></td>
                      <td><div className="skeleton-line w-16"></div></td>
                      <td><div className="skeleton-pill"></div></td>
                    </tr>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="empty-state-cell">
                      <div className="premium-empty-state">
                        <div className="empty-icon-wrap">
                          <UserCheck size={32} />
                        </div>
                        <h3>No Users Found</h3>
                        <p>{search ? "No users match your search criteria." : "There are currently no registered users."}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const initials = (user.name || '').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';
                    const isFarmer = !user.role || user.role.toLowerCase() === 'farmer';
                    
                    return (
                      <tr key={user.id} className="premium-row">
                        <td>
                          <div className="premium-user-cell">
                            <div className="premium-avatar" style={getAvatarStyle(user.name)}>
                              {initials}
                            </div>
                            <div className="premium-user-info">
                              <span className="premium-user-name">{user.name}</span>
                              <span className="premium-user-sub">{user.mobile || 'No phone'}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="premium-id-badge">{user.farmer_id || '—'}</span>
                        </td>
                        <td>
                          <div className="premium-contact">
                            <span>{user.mobile || '—'}</span>
                          </div>
                        </td>
                        <td>
                          <div className="premium-location">
                            <span>{user.location || '—'}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`premium-role-pill ${isFarmer ? 'role-farmer' : 'role-staff'}`}>
                            {user.role || 'Farmer'}
                          </span>
                        </td>
                        <td>
                          <span className="premium-count-badge">
                            {user.total_bookings ?? 0}
                          </span>
                        </td>
                        <td>
                          <div className="premium-status-wrapper">
                            {user.status === 'Verified' || user.status === 'Active' ? (
                              <><div className="status-dot active"></div> Verified</>
                            ) : (
                              <><div className="status-dot pending"></div> Pending</>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Accordion List */}
          <div className="premium-mobile-list">
            {loading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="premium-mobile-card skeleton-mobile-card">
                   <div className="skeleton-avatar"></div>
                   <div className="skeleton-lines">
                     <div className="skeleton-line w-32"></div>
                     <div className="skeleton-line w-24"></div>
                   </div>
                </div>
              ))
            ) : filteredUsers.length === 0 ? (
              <div className="premium-empty-state">
                <UserCheck size={32} className="empty-icon" />
                <h3>No Users Found</h3>
              </div>
            ) : (
              filteredUsers.map((user) => {
                const isExpanded = expandedUserId === user.id;
                const initials = (user.name || '').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';
                const isFarmer = !user.role || user.role.toLowerCase() === 'farmer';

                return (
                  <div key={user.id} className={`premium-mobile-card ${isExpanded ? 'expanded' : ''}`}>
                    <div className="mobile-card-header" onClick={() => toggleExpand(user.id)}>
                      <div className="mobile-card-identity">
                        <div className="premium-avatar" style={getAvatarStyle(user.name)}>
                          {initials}
                        </div>
                        <div className="mobile-user-info">
                          <span className="mobile-name">{user.name}</span>
                          <span className="mobile-sub">{user.role || 'Farmer'}</span>
                        </div>
                      </div>
                      <ChevronDown size={16} className={`mobile-chevron ${isExpanded ? 'rotate' : ''}`} />
                    </div>

                    {isExpanded && (
                      <div className="mobile-card-details">
                        <div className="mobile-detail-item">
                          <span className="detail-label">Farmer ID</span>
                          <span className="premium-id-badge">{user.farmer_id || 'N/A'}</span>
                        </div>
                        <div className="mobile-detail-item">
                          <span className="detail-label">Contact</span>
                          <span className="premium-contact"><Phone size={14} className="contact-icon"/> {user.mobile || 'N/A'}</span>
                        </div>
                        <div className="mobile-detail-item">
                          <span className="detail-label">Location</span>
                          <span className="premium-location"><MapPin size={14} className="loc-icon"/> {user.location || 'N/A'}</span>
                        </div>
                        <div className="mobile-detail-item">
                          <span className="detail-label">Bookings</span>
                          <span className="premium-count-badge">{user.total_bookings ?? 0} slots</span>
                        </div>
                        <div className="mobile-detail-item">
                          <span className="detail-label">Status</span>
                          <span className={`premium-status-pill status-active`}>
                             <ShieldCheck size={14} /> {user.status || 'Verified'}
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
