import { useEffect, useState } from 'react'
import AdminLayout from '../components/AdminLayout'
import { getAdminCenters } from '../api'
import {
  Building2, Search, Plus, MapPin, Clock, Hash,
  TrendingUp, Zap, CheckCircle, XCircle, ChevronRight,
  LayoutGrid, List, Filter,
} from 'lucide-react'

export default function AdminCentersPage() {
  const [centers, setCenters]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filterState, setFilterState] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [viewMode, setViewMode]     = useState('grid') // 'grid' | 'list'

  useEffect(() => {
    async function load() {
      try {
        setCenters(await getAdminCenters() || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const uniqueStates = ['All', ...new Set(centers.map(c => c.state).filter(Boolean))]

  const filtered = centers.filter((c) => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      c.name.toLowerCase().includes(q) ||
      c.district?.toLowerCase().includes(q) ||
      c.village?.toLowerCase().includes(q) ||
      String(c.id).includes(q)
    const matchState  = filterState === 'All' || c.state === filterState
    const matchStatus = filterStatus === 'All' || c.status === filterStatus
    return matchSearch && matchState && matchStatus
  })

  const totalCenters = centers.length
  const activeCenters = centers.filter(c => c.status === 'Active').length
  const avgUtil = centers.length
    ? Math.round(centers.reduce((s, c) => s + (c.utilization || 0), 0) / centers.length)
    : 0

  const goToDetails = (id) => { window.location.href = `/admin/centers/details?id=${id}` }

  const utilColor = (pct) =>
    pct >= 80 ? '#ef4444' : pct >= 50 ? '#f59e0b' : '#22c55e'

  return (
    <AdminLayout activePath="/admin/centers" title="Procurement Centers" showTimeframe={false}>
      <div className="pc-page">

        {/* ── Summary Stats Bar ── */}
        <div className="pc-stats-bar">
          <div className="pc-stats-group">
            <div className="pc-stat">
              <div className="pc-stat-icon" style={{ background: '#eff6ff' }}>
                <Building2 size={17} style={{ color: '#3b82f6' }}/>
              </div>
              <div>
                <div className="pc-stat-val">{totalCenters}</div>
                <div className="pc-stat-label">Total Centers</div>
              </div>
            </div>
            <div className="pc-stat-divider"/>
            <div className="pc-stat">
              <div className="pc-stat-icon" style={{ background: '#f0fdf4' }}>
                <CheckCircle size={17} style={{ color: '#22c55e' }}/>
              </div>
              <div>
                <div className="pc-stat-val">{activeCenters}</div>
                <div className="pc-stat-label">Active</div>
              </div>
            </div>
            <div className="pc-stat-divider"/>
            <div className="pc-stat">
              <div className="pc-stat-icon" style={{ background: '#fff7ed' }}>
                <XCircle size={17} style={{ color: '#f97316' }}/>
              </div>
              <div>
                <div className="pc-stat-val">{totalCenters - activeCenters}</div>
                <div className="pc-stat-label">Inactive</div>
              </div>
            </div>
            <div className="pc-stat-divider"/>
            <div className="pc-stat">
              <div className="pc-stat-icon" style={{ background: '#fdf4ff' }}>
                <TrendingUp size={17} style={{ color: '#a855f7' }}/>
              </div>
              <div>
                <div className="pc-stat-val">{avgUtil}%</div>
                <div className="pc-stat-label">Avg. Utilization</div>
              </div>
            </div>
          </div>

          {/* Add Center */}
          <a href="/admin/centers/new" className="pc-add-btn">
            <Plus size={16}/> Add Center
          </a>
        </div>


        {/* ── Toolbar ── */}
        <div className="pc-toolbar">
          <div className="pc-search-box">
            <Search size={15} className="pc-search-icon"/>
            <input
              type="text"
              placeholder="Search by name, village, district or ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="pc-search-clear" onClick={() => setSearch('')}>✕</button>
            )}
          </div>

          <div className="pc-toolbar-right">
            <div className="pc-filter-group">
              <Filter size={13} className="pc-filter-icon"/>
              <select value={filterState} onChange={e => setFilterState(e.target.value)}>
                {uniqueStates.map(s => <option key={s} value={s}>{s === 'All' ? 'All States' : s}</option>)}
              </select>
            </div>

            <div className="pc-filter-group">
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="pc-view-toggle">
              <button
                className={`pc-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid view"
              >
                <LayoutGrid size={15}/>
              </button>
              <button
                className={`pc-view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="List view"
              >
                <List size={15}/>
              </button>
            </div>
          </div>
        </div>

        {/* Results count */}
        {!loading && (
          <div className="pc-result-count">
            Showing <strong>{filtered.length}</strong> of {totalCenters} centers
          </div>
        )}

        {/* ── Content ── */}
        {loading ? (
          <div className={viewMode === 'grid' ? 'pc-grid' : 'pc-list'}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="pc-skeleton-card">
                <div className="pc-skel pc-skel-head"/>
                <div className="pc-skel pc-skel-line"/>
                <div className="pc-skel pc-skel-bar"/>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="pc-empty">
            <div className="pc-empty-icon"><Building2 size={36}/></div>
            <h3>No Centers Found</h3>
            <p>{search || filterState !== 'All' || filterStatus !== 'All'
              ? 'Try adjusting your filters.'
              : 'No procurement centers yet. Add your first one.'}</p>
            {!search && filterState === 'All' && filterStatus === 'All' && (
              <a href="/admin/centers/new" className="pc-add-btn" style={{ marginTop: '8px' }}>
                <Plus size={15}/> Add First Center
              </a>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          /* ── GRID VIEW ── */
          <div className="pc-grid">
            {filtered.map(center => {
              const util = center.utilization ?? 0
              const color = utilColor(util)
              return (
                <div
                  key={center.id}
                  className="pc-card"
                  onClick={() => goToDetails(center.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && goToDetails(center.id)}
                >

                  <div className="pc-card-head">
                    <div className="pc-center-icon">
                      <Building2 size={18}/>
                    </div>
                    <div className="pc-center-head-text">
                      <h3 className="pc-center-name" title={center.name}>{center.name}</h3>
                      <div className="pc-center-loc">
                        <MapPin size={11}/>
                        <span>{center.village}, {center.district} · {center.state}</span>
                      </div>
                    </div>
                    <span className={`pc-status-pill ${center.status === 'Active' ? 'pc-active' : 'pc-inactive'}`}>
                      {center.status === 'Active' && <span className="pc-pulse"/>}
                      {center.status}
                    </span>
                  </div>

                  <div className="pc-card-id-row">
                    <span className="pc-id-chip">
                      <Hash size={11}/> ID: {center.id}
                    </span>
                    <span className="pc-meta-chip">
                      <Clock size={11}/> {center.opening_time} – {center.closing_time}
                    </span>
                    <span className="pc-meta-chip">
                      PIN {center.pincode}
                    </span>
                  </div>

                  <div className="pc-card-util">
                    <div className="pc-util-top">
                      <span className="pc-util-label">Capacity Utilization</span>
                      <span className="pc-util-val" style={{ color }}>
                        {center.current_capacity?.toLocaleString()} / {center.daily_capacity?.toLocaleString()} q
                        <span className="pc-util-pct">({util}%)</span>
                      </span>
                    </div>
                    <div className="pc-util-track">
                      <div className="pc-util-fill" style={{ width: `${Math.min(util, 100)}%`, background: color }}/>
                    </div>
                  </div>

                  <div className="pc-card-footer">
                    <span className="pc-slots-count">
                      <Zap size={12}/> {center.slots_count ?? '—'} slots
                    </span>
                    <button className="pc-view-link">
                      View Details <ChevronRight size={13}/>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* ── LIST VIEW ── */
          <div className="pc-list-wrap">
            <table className="pc-table">
              <thead>
                <tr>
                  <th>Center</th>
                  <th>ID</th>
                  <th>Location</th>
                  <th>Hours</th>
                  <th>Utilization</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(center => {
                  const util = center.utilization ?? 0
                  const color = utilColor(util)
                  return (
                    <tr key={center.id} onClick={() => goToDetails(center.id)} className="pc-table-row">
                      <td>
                        <div className="pc-tbl-name-cell">
                          <div className="pc-tbl-icon"><Building2 size={14}/></div>
                          <span className="pc-tbl-name">{center.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className="pc-tbl-id">#{center.id}</span>
                      </td>
                      <td>
                        <div className="pc-tbl-loc">
                          <MapPin size={11}/>
                          <span>{center.district}, {center.state}</span>
                        </div>
                      </td>
                      <td className="pc-tbl-hours">{center.opening_time} – {center.closing_time}</td>
                      <td>
                        <div className="pc-tbl-util">
                          <div className="pc-tbl-track">
                            <div className="pc-tbl-fill" style={{ width: `${Math.min(util,100)}%`, background: color }}/>
                          </div>
                          <span className="pc-tbl-pct" style={{ color }}>{util}%</span>
                        </div>
                      </td>
                      <td>
                        <span className={`pc-status-pill ${center.status === 'Active' ? 'pc-active' : 'pc-inactive'}`}>
                          {center.status === 'Active' && <span className="pc-pulse"/>}
                          {center.status}
                        </span>
                      </td>
                      <td>
                        <button className="pc-tbl-view-btn">
                          <ChevronRight size={16}/>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
