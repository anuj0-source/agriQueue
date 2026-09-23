import { useEffect, useState, useRef } from 'react'
import {
  Users, CheckCircle2, Clock, XCircle,
  Hash, Timer, Package, DollarSign,
  TrendingUp, Sprout,
} from 'lucide-react'
import StaffLayout from '../components/StaffLayout'
import CommandBar from '../components/CommandBar'
import { getStaffDashboard } from '../api'

const BAR_COLORS = ['#22c55e', '#16a34a', '#15803d', '#166534', '#14532d', '#052e16', '#bbf7d0']

export default function StaffDashboardPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const currentUser = (() => {
      try { return JSON.parse(localStorage.getItem('currentUser') || 'null') } catch { return null }
    })()
    if (!currentUser || currentUser.role !== 'staff') {
      window.location.href = '/login'
      return
    }
    loadDashboard()
  }, [])

  async function loadDashboard() {
    try {
      setLoading(true)
      const res = await getStaffDashboard()
      setData(res)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <StaffLayout activePath="/staff" title="Dashboard">
      <div className="staff-loading">
        <div className="staff-spinner" />
        <p>Loading dashboard…</p>
      </div>
    </StaffLayout>
  )

  if (error) return (
    <StaffLayout activePath="/staff" title="Dashboard">
      <div className="staff-error-card">
        <p>⚠️ {error}</p>
        <button onClick={loadDashboard} className="staff-btn-primary">Retry</button>
      </div>
    </StaffLayout>
  )

  const { staff, metrics, top_produce, farmers_chart } = data || {}
  const m = metrics || {}

  const metricCards = [
    { label: "Today's Farmers", value: m.total_farmers ?? 0, icon: Users, color: '#3b82f6' },
    { label: 'Completed', value: m.completed ?? 0, icon: CheckCircle2, color: '#22c55e' },
    { label: 'Waiting', value: m.waiting ?? 0, icon: Clock, color: '#f59e0b' },
    { label: 'Cancelled', value: m.cancelled ?? 0, icon: XCircle, color: '#ef4444' },
  ]

  const statCards = [
    { label: 'Current Token', value: m.current_token ?? '-', icon: Hash, color: '#1a4d2e' },
    { label: 'Average Wait', value: `${m.avg_wait_min ?? 17} min`, icon: Timer, color: '#0891b2' },
    { label: "Today's Quantity", value: `${m.today_qty_tons ?? 0} tons`, icon: Package, color: '#7c3aed' },
    { label: 'Pending Payments', value: m.pending_payments ?? '₹0', icon: DollarSign, color: '#dc2626' },
  ]

  const maxBar = Math.max(...(farmers_chart || []).map(d => d.count), 1)

  return (
    <StaffLayout activePath="/staff" title="Dashboard">
      {/* Welcome */}
      <div className="staff-welcome-row">
        <div>
          <h2 className="staff-welcome-title">
            Welcome, {staff?.full_name || 'Staff Member'}
          </h2>
          <p className="staff-welcome-sub">
            {staff?.staff_id} &bull; {staff?.center_name}
          </p>
        </div>
        <button onClick={loadDashboard} className="staff-refresh-btn">
          ↻ Refresh
        </button>
      </div>

      {/* AI Multilingual Voice & Text Command Bar */}
      <CommandBar role="staff" />

      {/* Top 4 metric cards */}
      <div className="staff-metrics-grid">
        {metricCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="staff-metric-card">
            <div className="staff-metric-icon-wrap" style={{ background: `${color}18` }}>
              <Icon size={22} style={{ color }} />
            </div>
            <div>
              <div className="staff-metric-value" style={{ color }}>{value}</div>
              <div className="staff-metric-label">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Stat cards row */}
      <div className="staff-stats-grid">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="staff-stat-card">
            <div className="staff-stat-header">
              <Icon size={16} style={{ color }} />
              <span className="staff-stat-label">{label}</span>
            </div>
            <div className="staff-stat-value">{value}</div>
          </div>
        ))}
      </div>

      {/* Bottom row: chart + produce */}
      <div className="staff-bottom-row">
        {/* Farmers Today Chart */}
        <div className="staff-chart-card">
          <div className="staff-card-header">
            <TrendingUp size={18} className="staff-card-icon" />
            <h3>Farmers Today</h3>
          </div>
          <div className="staff-bar-chart">
            {(farmers_chart || []).map((d, i) => (
              <div key={d.day} className="staff-bar-col">
                <div className="staff-bar-track">
                  <div
                    className="staff-bar-fill"
                    style={{
                      height: `${Math.round((d.count / maxBar) * 100)}%`,
                      background: BAR_COLORS[i % BAR_COLORS.length],
                    }}
                  />
                </div>
                <span className="staff-bar-label">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Produce */}
        <div className="staff-produce-card">
          <div className="staff-card-header">
            <Sprout size={18} className="staff-card-icon" />
            <h3>Top Produce</h3>
          </div>
          <div className="staff-produce-list">
            {(top_produce || []).length === 0 ? (
              <p className="staff-empty-text">No produce data yet</p>
            ) : (
              top_produce.map((p) => (
                <div key={p.name} className="staff-produce-row">
                  <span className="staff-produce-name">{p.name}</span>
                  <div className="staff-produce-bar-wrap">
                    <div
                      className="staff-produce-bar"
                      style={{ width: `${p.percent}%` }}
                    />
                  </div>
                  <span className="staff-produce-pct">{p.percent}%</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </StaffLayout>
  )
}
