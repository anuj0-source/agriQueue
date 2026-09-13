import { useEffect, useState } from 'react'
import AdminLayout from '../components/AdminLayout'
import { getAdminReports } from '../api'
import { BarChart3, Download, FileText, TrendingUp, Award } from 'lucide-react'

export default function AdminReportsPage() {
  const [reports, setReports] = useState(null)

  useEffect(() => {
    async function load() {
      const data = await getAdminReports()
      setReports(data)
    }
    load()
  }, [])

  const monthly = reports?.monthly_tonnage || [
    { month: 'May', target: 800, achieved: 840 },
    { month: 'Jun', target: 950, achieved: 910 },
    { month: 'Jul', target: 1200, achieved: 1290 },
    { month: 'Aug', target: 1400, achieved: 1460 },
    { month: 'Sep', target: 1600, achieved: 1580 },
  ]

  const cropRevenue = reports?.crop_revenue || [
    { crop: 'Wheat', revenue: '₹94.5 Lakh', volume: '4,108 MT' },
    { crop: 'Rice', revenue: '₹52.8 Lakh', volume: '2,400 MT' },
    { crop: 'Maize', revenue: '₹21.0 Lakh', volume: '1,000 MT' },
    { crop: 'Pulses', revenue: '₹11.7 Lakh', volume: '180 MT' },
  ]

  return (
    <AdminLayout activePath="/admin/reports" title="Analytics & Procurement Reports" showTimeframe={false}>
      <div className="admin-page-container">
        {/* Top Export Bar */}
        <div className="admin-page-toolbar">
          <div className="toolbar-stats-pill">
            <span>Overall Farmer Turnout: <strong>{reports?.turnout_rate || '96.4%'}</strong></span>
          </div>

          <div className="toolbar-actions">
            <button
              type="button"
              className="admin-btn outline"
              onClick={() => alert('Downloading Comprehensive CSV Procurement Report...')}
            >
              <Download size={15} />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              className="admin-btn primary"
              onClick={() => window.print()}
            >
              <FileText size={15} />
              <span>Print PDF Report</span>
            </button>
          </div>
        </div>

        {/* 2-Column Analytics Grid */}
        <div className="admin-charts-grid">
          {/* Target vs Achieved Tonnage */}
          <div className="admin-panel-card">
            <div className="panel-header">
              <h2 className="panel-title">Procurement Target vs Achieved (MT)</h2>
            </div>
            <div className="monthly-bars-list">
              {monthly.map((m) => {
                const maxVal = 1800
                const targetPct = (m.target / maxVal) * 100
                const achievedPct = (m.achieved / maxVal) * 100
                return (
                  <div key={m.month} className="monthly-bar-item">
                    <div className="bar-label-row">
                      <strong>{m.month} 2025</strong>
                      <span style={{ fontSize: '13px', color: '#64748b' }}>
                        Achieved: <strong style={{ color: '#0a7a4a' }}>{m.achieved} MT</strong> / Target: {m.target} MT
                      </span>
                    </div>
                    <div className="perf-progress-track" style={{ height: '10px' }}>
                      <div
                        className="perf-progress-fill"
                        style={{
                          width: `${achievedPct}%`,
                          backgroundColor: m.achieved >= m.target ? '#0a7a4a' : '#f59e0b'
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Crop Revenue & Volume */}
          <div className="admin-panel-card">
            <div className="panel-header">
              <h2 className="panel-title">Crop-Wise Revenue Breakdown</h2>
            </div>
            <div className="crop-revenue-table-wrap">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>Produce</th>
                    <th>Volume Procured</th>
                    <th>Gross Payout</th>
                  </tr>
                </thead>
                <tbody>
                  {cropRevenue.map((c) => (
                    <tr key={c.crop}>
                      <td>
                        <strong>{c.crop}</strong>
                      </td>
                      <td>{c.volume}</td>
                      <td>
                        <strong style={{ color: '#0a7a4a' }}>{c.revenue}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
