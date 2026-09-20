import { useEffect, useState } from 'react'
import { PackageCheck, Edit3, Check, X, Filter } from 'lucide-react'
import StaffLayout from '../components/StaffLayout'
import { getStaffProcurement, updateStaffProcurement } from '../api'

const STATUS_OPTIONS = ['All', 'Confirmed', 'Waiting', 'Serving', 'Completed', 'Cancelled']

const STATUS_BADGE = {
  Completed: 'sp-badge-completed',
  Confirmed: 'sp-badge-confirmed',
  Waiting:   'sp-badge-waiting',
  Serving:   'sp-badge-serving',
  Cancelled: 'sp-badge-cancelled',
}

export default function StaffProcurementPage() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [editId, setEditId] = useState(null)
  const [editData, setEditData] = useState({})
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    const currentUser = (() => {
      try { return JSON.parse(localStorage.getItem('currentUser') || 'null') } catch { return null }
    })()
    if (!currentUser || currentUser.role !== 'staff') {
      window.location.href = '/login'
      return
    }
    fetchProcurement()
  }, [])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function fetchProcurement() {
    setLoading(true)
    try {
      const data = await getStaffProcurement()
      setRecords(data || [])
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const filtered = filter === 'All' ? records : records.filter(r => r.status === filter)

  const startEdit = (rec) => {
    setEditId(rec.id)
    setEditData({
      quantity_kg: rec.quantity_kg,
      produce_type: rec.produce_type,
      total_price: rec.total_price,
      status: rec.status,
    })
  }

  const cancelEdit = () => { setEditId(null); setEditData({}) }

  const saveEdit = async (id) => {
    setSaving(true)
    try {
      await updateStaffProcurement(id, editData)
      showToast('Procurement updated successfully')
      setEditId(null)
      await fetchProcurement()
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <StaffLayout activePath="/staff/procurement" title="Procurement">
      {toast && (
        <div className={`staff-toast staff-toast-${toast.type}`}>{toast.msg}</div>
      )}

      <div className="sp-header-row">
        <div className="sp-title-group">
          <PackageCheck size={22} className="sp-title-icon" />
          <div>
            <h2 className="sp-title">Today's Procurements</h2>
            <p className="sp-subtitle">{records.length} bookings at your center</p>
          </div>
        </div>
        <button onClick={fetchProcurement} className="staff-refresh-btn">↻ Refresh</button>
      </div>

      {/* Filter tabs */}
      <div className="sp-filter-tabs">
        <Filter size={15} className="sp-filter-icon" />
        {STATUS_OPTIONS.map(s => (
          <button
            key={s}
            className={`sp-filter-tab ${filter === s ? 'active' : ''}`}
            onClick={() => setFilter(s)}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="staff-loading">
          <div className="staff-spinner" />
          <p>Loading procurements…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="sp-empty">
          <PackageCheck size={40} />
          <p>No procurement records {filter !== 'All' ? `with status "${filter}"` : 'today'}</p>
        </div>
      ) : (
        <div className="sp-table-wrap">
          <table className="sp-table">
            <thead>
              <tr>
                <th>Token</th>
                <th>Farmer</th>
                <th>Produce</th>
                <th>Grade</th>
                <th>Qty (kg)</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((rec) => {
                const isEditing = editId === rec.id
                return (
                  <tr key={rec.id} className={isEditing ? 'sp-row-editing' : ''}>
                    <td><span className="sp-token">{rec.token}</span></td>
                    <td>
                      <div className="sp-farmer-name">{rec.farmer_name}</div>
                      <div className="sp-farmer-id">{rec.farmer_id}</div>
                    </td>
                    <td>{rec.produce}</td>
                    <td>
                      {isEditing ? (
                        <select
                          className="sp-input"
                          value={editData.produce_type}
                          onChange={e => setEditData(d => ({ ...d, produce_type: e.target.value }))}
                        >
                          <option>Standard Grade</option>
                          <option>Premium Grade</option>
                          <option>Grade A</option>
                          <option>Grade B</option>
                        </select>
                      ) : (
                        rec.produce_type
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          type="number"
                          className="sp-input sp-input-sm"
                          value={editData.quantity_kg}
                          onChange={e => setEditData(d => ({ ...d, quantity_kg: e.target.value }))}
                        />
                      ) : (
                        `${rec.quantity_kg?.toLocaleString()} kg`
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          type="number"
                          className="sp-input sp-input-sm"
                          value={editData.total_price}
                          onChange={e => setEditData(d => ({ ...d, total_price: e.target.value }))}
                        />
                      ) : (
                        `₹${rec.total_price?.toLocaleString()}`
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <select
                          className="sp-input"
                          value={editData.status}
                          onChange={e => setEditData(d => ({ ...d, status: e.target.value }))}
                        >
                          <option>Confirmed</option>
                          <option>Serving</option>
                          <option>Completed</option>
                          <option>Cancelled</option>
                        </select>
                      ) : (
                        <span className={`sp-badge ${STATUS_BADGE[rec.status] || 'sp-badge-waiting'}`}>
                          {rec.status}
                        </span>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <div className="sp-edit-actions">
                          <button
                            className="sp-save-btn"
                            onClick={() => saveEdit(rec.id)}
                            disabled={saving}
                            aria-label="Save changes"
                          >
                            <Check size={15} />
                          </button>
                          <button
                            className="sp-cancel-btn"
                            onClick={cancelEdit}
                            aria-label="Cancel editing"
                          >
                            <X size={15} />
                          </button>
                        </div>
                      ) : (
                        <button
                          className="sp-edit-btn"
                          onClick={() => startEdit(rec)}
                          aria-label={`Edit booking ${rec.token}`}
                        >
                          <Edit3 size={15} />
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </StaffLayout>
  )
}
