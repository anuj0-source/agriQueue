export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function loginFarmer(mobile_number, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
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
