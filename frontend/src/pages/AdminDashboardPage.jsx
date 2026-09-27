import { useEffect, useState } from 'react'
import AdminLayout from '../components/AdminLayout'
import { getAdminDashboard } from '../api'
import {
  Users,
  Building2,
  ShoppingCart,
  Wallet,
  TrendingUp,
  Activity,
  CheckCircle2,
  ArrowUpRight,
  Wheat,
  Sparkles,
} from 'lucide-react'

// ─── KPI Card ───────────────────────────────────────────────────────────────
function KpiCard({ value, label, icon: Icon, gradient, iconBg, change, changePct }) {
  return (
    <div className="dash-kpi-card" style={{ background: gradient }}>
      <div className="dash-kpi-top">
        <div className="dash-kpi-icon-wrap" style={{ background: iconBg }}>
          <Icon size={20} />
        </div>
        {changePct !== undefined && (
          <span className={`dash-kpi-badge ${change >= 0 ? 'up' : 'down'}`}>
            <ArrowUpRight size={12} style={{ transform: change < 0 ? 'rotate(90deg)' : 'none' }} />
            {Math.abs(changePct)}%
          </span>
        )}
      </div>
      <div className="dash-kpi-value">{value}</div>
      <div className="dash-kpi-label">{label}</div>
    </div>
  )
}

export default function AdminDashboardPage() {
  const [timeframe, setTimeframe] = useState('Last 30 Days')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const result = await getAdminDashboard(timeframe)
        setData(result)
      } catch (err) {
        console.error('Failed to load dashboard:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [timeframe])

  const metrics = data?.metrics || {
    total_farmers: '1,240',
    procurement_centers: 8,
    total_procurements: '5,620',
    total_payments: '₹1.8 Cr',
  }

  const trendData = data?.procurements_trend || [
    { month: 'Jul', value: 15 },
    { month: 'Aug', value: 30 },
    { month: 'Sep', value: 22 },
    { month: 'Oct', value: 45 },
    { month: 'Nov', value: 38 },
    { month: 'Dec', value: 58 },
  ]

  const cropDist = data?.crop_distribution || [
    { crop: 'Wheat', percent: 45, color: '#f59e0b' },
    { crop: 'Rice', percent: 25, color: '#10b981' },
    { crop: 'Maize', percent: 18, color: '#6366f1' },
    { crop: 'Pulses', percent: 12, color: '#f97316' },
  ]

  const recentActivities = data?.recent_activities || [
    { id: 1, text: 'New farmer registered — Rajesh Kumar', time: '10:24 AM', type: 'user' },
    { id: 2, text: 'Payment of ₹42,000 processed', time: '09:16 AM', type: 'payment' },
    { id: 3, text: 'Slot booked at Center A (Wheat)', time: '08:45 AM', type: 'slot' },
    { id: 4, text: 'Grain inspection passed — 2000 kg Wheat', time: '08:12 AM', type: 'check' },
    { id: 5, text: 'Procurement center capacity updated', time: 'Yesterday', type: 'update' },
  ]

  const centerPerformance = data?.center_performance || [
    { name: 'Center A', performance: 90 },
    { name: 'Center B', performance: 70 },
    { name: 'Center C', performance: 66 },
    { name: 'Center D', performance: 85 },
  ]

  // ── SVG Line Chart ──────────────────────────────────────────────────────
  const chartWidth = 480
  const chartHeight = 180
  const paddingX = 48
  const paddingY = 24
  const innerWidth = chartWidth - paddingX * 2
  const innerHeight = chartHeight - paddingY * 2

  const len = trendData.length
  const maxVal = Math.max(5, ...trendData.map(d => Number(d.value) || 0))
  const gridTicks = [0, Math.round(maxVal * 0.5), maxVal]

  const points = trendData.map((d, i) => {
    const x = len > 1 ? paddingX + (i / (len - 1)) * innerWidth : chartWidth / 2
    const y = chartHeight - paddingY - ((Number(d.value) || 0) / maxVal) * innerHeight
    return { x, y, ...d }
  })

  const curvePath =
    points.length === 0
      ? ''
      : points.length === 1
        ? `M ${points[0].x - 30},${points[0].y} L ${points[0].x + 30},${points[0].y}`
        : points.reduce((acc, pt, i, arr) => {
            if (i === 0) return `M ${pt.x},${pt.y}`
            const prev = arr[i - 1]
            const cx = (prev.x + pt.x) / 2
            return `${acc} C ${cx},${prev.y} ${cx},${pt.y} ${pt.x},${pt.y}`
          }, '')

  const areaPath =
    points.length <= 1
      ? ''
      : `${curvePath} L ${points[points.length - 1].x},${chartHeight - paddingY} L ${points[0].x},${chartHeight - paddingY} Z`

  // ── Donut Chart ─────────────────────────────────────────────────────────
  const donutSize = 160
  const donutCenter = donutSize / 2
  const strokeWidth = 22
  const radius = (donutSize - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const gap = 4

  let accumulated = 0
  const donutSegments = cropDist.map((crop) => {
    const segLen = ((crop.percent / 100) * circumference) - gap
    const offset = -((accumulated / 100) * circumference)
    accumulated += crop.percent
    return {
      ...crop,
      strokeDasharray: `${segLen} ${circumference}`,
      strokeDashoffset: offset,
    }
  })

  // ── Perf gradient pick ──────────────────────────────────────────────────
  const perfGradient = (pct) => {
    if (pct >= 85) return 'linear-gradient(90deg, #10b981, #059669)'
    if (pct >= 60) return 'linear-gradient(90deg, #f59e0b, #d97706)'
    return 'linear-gradient(90deg, #f97316, #ea580c)'
  }

  const kpiCards = [
    {
      value: metrics.total_farmers,
      label: 'Total Farmers',
      icon: Users,
      gradient: 'linear-gradient(135deg, #0a7a4a 0%, #065f38 100%)',
      iconBg: 'rgba(255,255,255,0.18)',
      changePct: 12,
      change: 1,
    },
    {
      value: metrics.procurement_centers,
      label: 'Procurement Centers',
      icon: Building2,
      gradient: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
      iconBg: 'rgba(255,255,255,0.18)',
      changePct: 8,
      change: 1,
    },
    {
      value: metrics.total_procurements,
      label: 'Total Procurements',
      icon: ShoppingCart,
      gradient: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
      iconBg: 'rgba(255,255,255,0.18)',
      changePct: 20,
      change: 1,
    },
    {
      value: metrics.total_payments,
      label: 'Total Payments',
      icon: Wallet,
      gradient: 'linear-gradient(135deg, #b45309 0%, #92400e 100%)',
      iconBg: 'rgba(255,255,255,0.18)',
      changePct: 15,
      change: 1,
    },
  ]

  return (
    <AdminLayout
      activePath="/admin"
      title="Admin Dashboard"
      timeframe={timeframe}
      onTimeframeChange={setTimeframe}
    >
      <div className="dash-container">
        {loading ? (
          <>
            <section className="dash-kpi-grid">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="dash-kpi-card skeleton" style={{ minHeight: '130px', background: '#e2e8f0', border: 'none' }} />
              ))}
            </section>
            <section className="dash-charts-grid">
              <div className="dash-panel skeleton" style={{ minHeight: '300px', background: '#e2e8f0', border: 'none' }} />
              <div className="dash-panel skeleton" style={{ minHeight: '300px', background: '#e2e8f0', border: 'none' }} />
            </section>
            <section className="dash-lower-grid">
              <div className="dash-panel skeleton" style={{ minHeight: '250px', background: '#e2e8f0', border: 'none' }} />
              <div className="dash-panel skeleton" style={{ minHeight: '250px', background: '#e2e8f0', border: 'none' }} />
            </section>
          </>
        ) : (
          <>
            {/* ─── KPI Cards ─── */}
            <section className="dash-kpi-grid" aria-label="Key Performance Indicators">
              {kpiCards.map((card) => (
                <KpiCard key={card.label} {...card} />
              ))}
            </section>

            {/* ─── Charts Row ─── */}
            <section className="dash-charts-grid">
              {/* Trend Chart */}
              <div className="dash-panel trend-panel">
                <div className="dash-panel-header">
                  <div className="dash-panel-title-group">
                    <div className="dash-panel-icon-wrap trend-icon">
                      <TrendingUp size={16} />
                    </div>
                    <div>
                      <h2 className="dash-panel-title">Procurements Trend</h2>
                      <p className="dash-panel-sub">Monthly procurement activity</p>
                    </div>
                  </div>
                  <span className="dash-panel-badge">
                    <Sparkles size={12} /> Live
                  </span>
                </div>
                <div className="dash-trend-wrapper">
                  <svg
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                    className="dash-trend-svg"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="dashTrendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0a7a4a" stopOpacity="0.30" />
                        <stop offset="100%" stopColor="#0a7a4a" stopOpacity="0.01" />
                      </linearGradient>
                      <linearGradient id="dashLineGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#0a7a4a" />
                      </linearGradient>
                      <filter id="glowFilter">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                        <feMerge>
                          <feMergeNode in="coloredBlur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>

                    {/* Grid lines */}
                    {gridTicks.map((val) => {
                      const y = chartHeight - paddingY - (val / maxVal) * innerHeight
                      return (
                        <g key={val}>
                          <line
                            x1={paddingX}
                            y1={y}
                            x2={chartWidth - paddingX}
                            y2={y}
                            stroke="#e2e8f0"
                            strokeWidth="1"
                            strokeDasharray="4 4"
                          />
                          <text
                            x={paddingX - 12}
                            y={y + 4}
                            textAnchor="end"
                            className="dash-axis-label"
                          >
                            {val}
                          </text>
                        </g>
                      )
                    })}

                    {/* Area fill */}
                    <path d={areaPath} fill="url(#dashTrendGrad)" />

                    {/* Main line */}
                    <path
                      d={curvePath}
                      fill="none"
                      stroke="url(#dashLineGrad)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      filter="url(#glowFilter)"
                    />

                    {/* Data points */}
                    {points.map((pt, idx) => (
                      <g key={idx} className="dash-chart-point">
                        <circle cx={pt.x} cy={pt.y} r="6" fill="#0a7a4a" opacity="0.15" />
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="4"
                          fill="#ffffff"
                          stroke="#0a7a4a"
                          strokeWidth="2.5"
                        />
                        <text
                          x={pt.x}
                          y={chartHeight - 6}
                          textAnchor="middle"
                          className="dash-month-label"
                        >
                          {pt.month}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
              </div>

              {/* Crop Distribution */}
              <div className="dash-panel crop-panel">
                <div className="dash-panel-header">
                  <div className="dash-panel-title-group">
                    <div className="dash-panel-icon-wrap crop-icon">
                      <Wheat size={16} />
                    </div>
                    <div>
                      <h2 className="dash-panel-title">Crop Distribution</h2>
                      <p className="dash-panel-sub">Current season breakdown</p>
                    </div>
                  </div>
                </div>
                <div className="dash-donut-layout">
                  <div className="dash-donut-graphic">
                    <svg
                      width={donutSize}
                      height={donutSize}
                      viewBox={`0 0 ${donutSize} ${donutSize}`}
                    >
                      {/* Track */}
                      <circle
                        cx={donutCenter}
                        cy={donutCenter}
                        r={radius}
                        fill="transparent"
                        stroke="#f1f5f9"
                        strokeWidth={strokeWidth}
                      />
                      {/* Segments */}
                      {donutSegments.map((seg) => (
                        <circle
                          key={seg.crop}
                          cx={donutCenter}
                          cy={donutCenter}
                          r={radius}
                          fill="transparent"
                          stroke={seg.color}
                          strokeWidth={strokeWidth}
                          strokeDasharray={seg.strokeDasharray}
                          strokeDashoffset={seg.strokeDashoffset}
                          strokeLinecap="round"
                          transform={`rotate(-90 ${donutCenter} ${donutCenter})`}
                          style={{ transition: 'stroke-dasharray 0.6s ease, stroke-dashoffset 0.6s ease' }}
                        />
                      ))}
                      {/* Center text */}
                      <text
                        x={donutCenter}
                        y={donutCenter - 6}
                        textAnchor="middle"
                        className="donut-center-val"
                      >
                        {cropDist.reduce((s, c) => s + c.percent, 0)}%
                      </text>
                      <text
                        x={donutCenter}
                        y={donutCenter + 12}
                        textAnchor="middle"
                        className="donut-center-label"
                      >
                        Total
                      </text>
                    </svg>
                  </div>

                  <div className="dash-legend">
                    {cropDist.map((crop) => (
                      <div key={crop.crop} className="dash-legend-row">
                        <span className="dash-legend-dot" style={{ background: crop.color }} />
                        <span className="dash-legend-name">{crop.crop}</span>
                        <div className="dash-legend-bar-track">
                          <div
                            className="dash-legend-bar-fill"
                            style={{ width: `${crop.percent}%`, background: crop.color }}
                          />
                        </div>
                        <span className="dash-legend-pct" style={{ color: crop.color }}>
                          {crop.percent}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* ─── Bottom Row ─── */}
            <section className="dash-lower-grid">
              {/* Recent Activities */}
              <div className="dash-panel activities-panel">
                <div className="dash-panel-header">
                  <div className="dash-panel-title-group">
                    <div className="dash-panel-icon-wrap activity-icon">
                      <Activity size={16} />
                    </div>
                    <div>
                      <h2 className="dash-panel-title">Recent Activities</h2>
                      <p className="dash-panel-sub">Latest system events</p>
                    </div>
                  </div>
                  <span className="dash-panel-count">{recentActivities.length} events</span>
                </div>
                <div className="dash-activity-list">
                  {recentActivities.length === 0 ? (
                    <div className="dash-empty-state">No recent activities recorded yet.</div>
                  ) : (
                    recentActivities.slice(0, 5).map((act, idx) => (
                      <div key={act.id || idx} className="dash-activity-row">
                        <div className="dash-activity-dot-wrap">
                          <span className="dash-activity-dot" />
                          {idx < recentActivities.slice(0, 5).length - 1 && (
                            <span className="dash-activity-line" />
                          )}
                        </div>
                        <div className="dash-activity-icon-bg">
                          <CheckCircle2 size={15} />
                        </div>
                        <div className="dash-activity-body">
                          <span className="dash-activity-text">{act.text}</span>
                          <span className="dash-activity-time">{act.time}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Center Performance */}
              <div className="dash-panel performance-panel">
                <div className="dash-panel-header">
                  <div className="dash-panel-title-group">
                    <div className="dash-panel-icon-wrap perf-icon">
                      <Building2 size={16} />
                    </div>
                    <div>
                      <h2 className="dash-panel-title">Center Performance</h2>
                      <p className="dash-panel-sub">Utilization by center</p>
                    </div>
                  </div>
                </div>
                <div className="dash-perf-list">
                  {centerPerformance.length === 0 ? (
                    <div className="dash-empty-state">No procurement centers active.</div>
                  ) : (
                    centerPerformance.map((center) => (
                      <div key={center.name} className="dash-perf-row">
                        <div className="dash-perf-top">
                          <span className="dash-perf-name">{center.name}</span>
                          <span
                            className="dash-perf-pct"
                            style={{
                              color:
                                center.performance >= 85
                                  ? '#059669'
                                  : center.performance >= 60
                                  ? '#d97706'
                                  : '#ea580c',
                            }}
                          >
                            {center.performance}%
                          </span>
                        </div>
                        <div className="dash-perf-track">
                          <div
                            className="dash-perf-fill"
                            style={{
                              width: `${center.performance}%`,
                              background: perfGradient(center.performance),
                            }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
