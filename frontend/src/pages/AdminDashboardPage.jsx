import { useEffect, useState } from 'react'
import AdminLayout from '../components/AdminLayout'
import { getAdminDashboard } from '../api'
import { CheckCircle2, TrendingUp, Sparkles } from 'lucide-react'

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
  ]

  const cropDist = data?.crop_distribution || [
    { crop: 'Wheat', percent: 60, color: '#3b82f6' },
    { crop: 'Rice', percent: 20, color: '#f59e0b' },
    { crop: 'Maize', percent: 10, color: '#ca8a04' },
    { crop: 'Pulses', percent: 10, color: '#10b981' },
  ]

  const recentActivities = data?.recent_activities || [
    { id: 1, text: 'New farmer registered', time: '10:24 AM' },
    { id: 2, text: 'Payment processed', time: '09:16 AM' },
    { id: 3, text: 'Slot booked at Center A', time: '08:45 AM' },
    { id: 4, text: 'Grain inspection passed (Wheat 2000kg)', time: '08:12 AM' },
    { id: 5, text: 'Procurement center capacity updated', time: 'Yesterday' },
  ]

  const centerPerformance = data?.center_performance || [
    { name: 'Center A', performance: 90 },
    { name: 'Center B', performance: 70 },
    { name: 'Center C', performance: 66 },
    { name: 'Center D', performance: 85 },
  ]

  // SVG Line Chart coordinates calculation for 4 months (Jul, Aug, Sep, Oct)
  // ViewBox: 0 0 400 180
  const chartWidth = 400
  const chartHeight = 160
  const paddingX = 45
  const paddingY = 20
  const innerWidth = chartWidth - paddingX * 2
  const innerHeight = chartHeight - paddingY * 2

  const points = trendData.map((d, i) => {
    const x = paddingX + (i / (trendData.length - 1)) * innerWidth
    const y = chartHeight - paddingY - (d.value / 50) * innerHeight
    return { x, y, ...d }
  })

  // Generate smooth SVG curve path
  const curvePath = points.reduce((acc, pt, i, arr) => {
    if (i === 0) return `M ${pt.x},${pt.y}`
    const prev = arr[i - 1]
    const cx = (prev.x + pt.x) / 2
    return `${acc} C ${cx},${prev.y} ${cx},${pt.y} ${pt.x},${pt.y}`
  }, '')

  const areaPath = `${curvePath} L ${points[points.length - 1].x},${chartHeight - paddingY} L ${points[0].x},${chartHeight - paddingY} Z`

  // SVG Donut Chart calculation
  const donutSize = 170
  const donutCenter = donutSize / 2
  const strokeWidth = 26
  const radius = (donutSize - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  let accumulatedPercent = 0
  const donutSegments = cropDist.map((crop) => {
    const strokeDasharray = `${(crop.percent / 100) * circumference} ${circumference}`
    const strokeDashoffset = -((accumulatedPercent / 100) * circumference)
    accumulatedPercent += crop.percent
    return {
      ...crop,
      strokeDasharray,
      strokeDashoffset,
    }
  })

  return (
    <AdminLayout
      activePath="/admin"
      title="Admin Dashboard"
      timeframe={timeframe}
      onTimeframeChange={setTimeframe}
    >
      <div className="admin-dashboard-container">
        {loading ? (
          <>
            {/* ─── Top 4 Metric Cards Skeletons ─── */}
            <section className="admin-kpi-grid">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="admin-kpi-card skeleton-card skeleton" style={{ gap: '12px', padding: '24px' }}>
                  <div className="skeleton-text skeleton" style={{ height: '36px', width: '50%' }}></div>
                  <div className="skeleton-text skeleton short"></div>
                </div>
              ))}
            </section>
            
            {/* ─── Middle Visual Grid Skeletons ─── */}
            <section className="admin-charts-grid">
              <div className="admin-panel-card skeleton-card skeleton" style={{ minHeight: '280px' }}></div>
              <div className="admin-panel-card skeleton-card skeleton" style={{ minHeight: '280px' }}></div>
            </section>
            
            {/* ─── Bottom Grid Skeletons ─── */}
            <section className="admin-lower-grid">
              <div className="admin-panel-card skeleton-card skeleton" style={{ minHeight: '240px' }}></div>
              <div className="admin-panel-card skeleton-card skeleton" style={{ minHeight: '240px' }}></div>
            </section>
          </>
        ) : (
          <>
            {/* ─── Top 4 Metric Cards ─── */}
            <section className="admin-kpi-grid" aria-label="Key Performance Indicators">
          <div className="admin-kpi-card">
            <div className="kpi-value">{metrics.total_farmers}</div>
            <div className="kpi-label">Total Farmers</div>
          </div>

          <div className="admin-kpi-card">
            <div className="kpi-value">{metrics.procurement_centers}</div>
            <div className="kpi-label">Procurement Centers</div>
          </div>

          <div className="admin-kpi-card">
            <div className="kpi-value">{metrics.total_procurements}</div>
            <div className="kpi-label">Total Procurements</div>
          </div>

          <div className="admin-kpi-card">
            <div className="kpi-value">{metrics.total_payments}</div>
            <div className="kpi-label">Total Payments</div>
          </div>
        </section>

        {/* ─── Middle Visual Grid: Trend & Crop Distribution ─── */}
        <section className="admin-charts-grid">
          {/* Procurements Trend Line Chart */}
          <div className="admin-panel-card trend-card">
            <div className="panel-header">
              <h2 className="panel-title">Procurements Trend</h2>
            </div>
            <div className="trend-chart-container">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="trend-svg"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid lines */}
                {[0, 10, 20, 30, 40, 50].map((val) => {
                  const y = chartHeight - paddingY - (val / 50) * innerHeight
                  return (
                    <g key={val} className="trend-grid-row">
                      <line
                        x1={paddingX - 10}
                        y1={y}
                        x2={chartWidth - paddingX + 10}
                        y2={y}
                        stroke="#f1f5f9"
                        strokeWidth="1"
                      />
                      <text
                        x={paddingX - 16}
                        y={y + 4}
                        textAnchor="end"
                        className="trend-axis-label"
                      >
                        {val}
                      </text>
                    </g>
                  )
                })}

                {/* Shaded Area */}
                <path d={areaPath} fill="url(#trendGradient)" />

                {/* Curved Line */}
                <path
                  d={curvePath}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />

                {/* Data Points */}
                {points.map((pt, idx) => (
                  <g key={idx}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="4.5"
                      fill="#ffffff"
                      stroke="#0284c7"
                      strokeWidth="2.5"
                    />
                    <text
                      x={pt.x}
                      y={chartHeight - 4}
                      textAnchor="middle"
                      className="trend-month-label"
                    >
                      {pt.month}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>

          {/* Crop Distribution Donut Chart */}
          <div className="admin-panel-card crop-card">
            <div className="panel-header">
              <h2 className="panel-title">Crop Distribution</h2>
            </div>
            <div className="donut-content-layout">
              <div className="donut-graphic-wrapper">
                <svg
                  width={donutSize}
                  height={donutSize}
                  viewBox={`0 0 ${donutSize} ${donutSize}`}
                  className="donut-svg"
                >
                  <circle
                    cx={donutCenter}
                    cy={donutCenter}
                    r={radius}
                    fill="transparent"
                    stroke="#f1f5f9"
                    strokeWidth={strokeWidth}
                  />
                  {donutSegments.map((segment) => (
                    <circle
                      key={segment.crop}
                      cx={donutCenter}
                      cy={donutCenter}
                      r={radius}
                      fill="transparent"
                      stroke={segment.color}
                      strokeWidth={strokeWidth}
                      strokeDasharray={segment.strokeDasharray}
                      strokeDashoffset={segment.strokeDashoffset}
                      strokeLinecap="round"
                      transform={`rotate(-90 ${donutCenter} ${donutCenter})`}
                    />
                  ))}
                </svg>
              </div>

              {/* Legend List */}
              <div className="donut-legend-list">
                {cropDist.map((crop) => (
                  <div key={crop.crop} className="donut-legend-row">
                    <span
                      className="legend-bullet"
                      style={{ backgroundColor: crop.color }}
                    />
                    <span className="legend-crop-name">{crop.crop}</span>
                    <span className="legend-crop-pct">{crop.percent}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ─── Bottom Visual Grid: Recent Activities & Center Performance ─── */}
        <section className="admin-lower-grid">
          {/* Recent Activities */}
          <div className="admin-panel-card activities-card">
            <div className="panel-header">
              <h2 className="panel-title">Recent Activities</h2>
            </div>
            <div className="activities-list">
              {recentActivities.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                  No recent activities recorded yet.
                </div>
              ) : (
                recentActivities.slice(0, 5).map((act, idx) => (
                  <div key={act.id || idx} className="activity-row">
                    <div className="activity-icon-wrap">
                      <CheckCircle2 size={18} className="activity-check-icon" />
                    </div>
                    <div className="activity-body">
                      <span className="activity-text">{act.text}</span>
                    </div>
                    <span className="activity-time">{act.time}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Center Performance */}
          <div className="admin-panel-card performance-card">
            <div className="panel-header">
              <h2 className="panel-title">Center Performance</h2>
            </div>
            <div className="performance-list">
              {centerPerformance.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                  No procurement centers active.
                </div>
              ) : (
                centerPerformance.map((center) => (
                  <div key={center.name} className="center-perf-row">
                    <span className="center-perf-name">{center.name}</span>
                    <div className="perf-progress-track">
                      <div
                        className="perf-progress-fill"
                        style={{ width: `${center.performance}%` }}
                      />
                    </div>
                    <span className="center-perf-pct">{center.performance}%</span>
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
