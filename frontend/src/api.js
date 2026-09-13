export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function loginFarmer(mobile_number, password, role = 'farmer') {
  const url = role
    ? `${API_BASE_URL}/auth/login?role=${encodeURIComponent(role.toLowerCase())}`
    : `${API_BASE_URL}/auth/login`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      mobile_number,
      password,
    }),
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.message || 'Login failed')
  }
  return data
}

export async function createFarmerAccount(payload) {
  const response = await fetch(`${API_BASE_URL}/auth/create-account`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.message || 'Failed to create account')
  }
  return data
}


export async function getFarmerDashboard() {
  const response = await fetch(`${API_BASE_URL}/dashboard/farmer`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  const data = await response.json()
  if (!response.ok) {
    const error = new Error(data.message || 'Failed to fetch dashboard')
    error.status = response.status
    throw error
  }
  return data
}

export async function logoutFarmer() {
  const response = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  const data = await response.json()
  if (!response.ok) {
    const error = new Error(data.message || 'Logout failed')
    error.status = response.status
    throw error
  }
  return data
}

export async function checkAuthSession() {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    if (response.ok) {
      const data = await response.json()
      if (data.authenticated && data.user) {
        localStorage.setItem('currentUser', JSON.stringify(data.user))
        return data
      }
    }
  } catch (err) {
    // Network or server unreachable
  }
  return null
}

export async function getProcurementCenters(search = '') {
  const url = new URL(`${API_BASE_URL}/centers`)
  if (search) url.searchParams.append('search', search)
  const response = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.detail || 'Failed to fetch procurement centers')
  }
  return data
}

export async function getCenterSlots(centerId, date = '') {
  const url = new URL(`${API_BASE_URL}/centers/${centerId}/slots`)
  if (date) url.searchParams.append('date', date)
  const response = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.detail || 'Failed to fetch slots')
  }
  return data
}

export async function createBooking(payload) {
  const response = await fetch(`${API_BASE_URL}/bookings`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  const data = await response.json()
  if (!response.ok) {
    const error = new Error(data.detail || data.message || 'Failed to create booking')
    error.status = response.status
    throw error
  }
  return data
}

export async function getMyBookings() {
  const response = await fetch(`${API_BASE_URL}/bookings/my`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  const data = await response.json()
  if (!response.ok) {
    const error = new Error(data.detail || data.message || 'Failed to fetch bookings')
    error.status = response.status
    throw error
  }
  return data
}

export async function getLiveQueue(centerId = 1001) {
  const response = await fetch(`${API_BASE_URL}/queue/${centerId}`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.detail || 'Failed to fetch live queue')
  }
  return data
}

export async function getProcurementHistory() {
  const response = await fetch(`${API_BASE_URL}/dashboard/procurement-history`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error('Failed to fetch procurement history')
  }
  return data
}

export async function getPaymentRecords() {
  const response = await fetch(`${API_BASE_URL}/dashboard/payments`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error('Failed to fetch payment records')
  }
  return data
}

/* ──────────────── Admin API ──────────────── */

export async function getAdminDashboard(timeframe = 'Last 30 Days') {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/dashboard?timeframe=${encodeURIComponent(timeframe)}`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) throw new Error('Failed to fetch admin dashboard')
    return await res.json()
  } catch (err) {
    window.location.href = '/login'
    console.warn('Fallback to local admin dashboard data:', err)
    const { ADMIN_METRICS, ADMIN_TREND_DATA, ADMIN_CROP_DISTRIBUTION, ADMIN_RECENT_ACTIVITIES, ADMIN_CENTER_PERFORMANCE } = await import('./data/admin-data.js')
    return {
      metrics: {
        total_farmers: ADMIN_METRICS.totalFarmers,
        procurement_centers: ADMIN_METRICS.procurementCenters,
        total_procurements: ADMIN_METRICS.totalProcurements,
        total_payments: ADMIN_METRICS.totalPayments,
      },
      procurements_trend: ADMIN_TREND_DATA,
      crop_distribution: ADMIN_CROP_DISTRIBUTION,
      recent_activities: ADMIN_RECENT_ACTIVITIES,
      center_performance: ADMIN_CENTER_PERFORMANCE,
    }
  }
}

export async function getAdminCenters() {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/centers`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) throw new Error('Failed to fetch centers')
    return await res.json()
  } catch (err) {
    console.warn('Fallback to local admin centers:', err)
    const { ADMIN_CENTERS } = await import('./data/admin-data.js')
    return ADMIN_CENTERS
  }
}

export async function getAdminCenterDetails(centerId) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/centers/${centerId}`, {
      credentials: 'include',
    })
    if (!res.ok) throw new Error('Failed to fetch center details')
    return await res.json()
  } catch (err) {
    console.error(err)
    return null
  }
}

export async function createAdminCenter(payload) {
  const res = await fetch(`${API_BASE_URL}/admin/centers`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Failed to create center')
  return await res.json()
}

export async function createAdminSlot(payload) {
  const res = await fetch(`${API_BASE_URL}/admin/slots`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Failed to create slot')
  return await res.json()
}

export async function getAdminUsers() {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/users`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) throw new Error('Failed to fetch users')
    return await res.json()
  } catch (err) {
    console.warn('Fallback to local admin users:', err)
    const { ADMIN_USERS } = await import('./data/admin-data.js')
    return ADMIN_USERS
  }
}

export async function getAdminSlots(centerId = null) {
  try {
    const url = centerId ? `${API_BASE_URL}/admin/slots?center_id=${centerId}` : `${API_BASE_URL}/admin/slots`
    const res = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) throw new Error('Failed to fetch slots')
    return await res.json()
  } catch (err) {
    console.warn('Fallback to local admin slots:', err)
    const { ADMIN_SLOTS } = await import('./data/admin-data.js')
    return ADMIN_SLOTS
  }
}

export async function getAdminProcurements() {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/procurements`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) throw new Error('Failed to fetch procurements')
    return await res.json()
  } catch (err) {
    console.warn('Fallback to local admin procurements:', err)
    const { ADMIN_PROCUREMENTS } = await import('./data/admin-data.js')
    return ADMIN_PROCUREMENTS
  }
}

export async function getAdminPayments() {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/payments`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) throw new Error('Failed to fetch payments')
    return await res.json()
  } catch (err) {
    console.warn('Fallback to local admin payments:', err)
    const { ADMIN_PAYMENTS } = await import('./data/admin-data.js')
    return ADMIN_PAYMENTS
  }
}

export async function getAdminReports() {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/reports`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) throw new Error('Failed to fetch reports')
    return await res.json()
  } catch (err) {
    console.warn('Fallback to local admin reports:', err)
    const { ADMIN_REPORTS } = await import('./data/admin-data.js')
    return ADMIN_REPORTS
  }
}

export async function getAdminSettings() {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/settings`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) throw new Error('Failed to fetch settings')
    return await res.json()
  } catch (err) {
    console.warn('Fallback to local admin settings:', err)
    const { ADMIN_SETTINGS } = await import('./data/admin-data.js')
    return ADMIN_SETTINGS
  }
}

export async function triggerAdminSeed() {
  const res = await fetch(`${API_BASE_URL}/admin/seed`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error('Failed to seed database')
  return await res.json()
}

