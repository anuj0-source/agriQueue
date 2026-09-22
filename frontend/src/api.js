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
  } catch {
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

export async function predictWaitTime(payload) {
  try {
    const response = await fetch(`${API_BASE_URL}/queue/predict-wait`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.detail || data.message || 'Failed to predict wait time')
    }
    return data
  } catch (err) {
    console.warn('[AgriQueue] Wait time prediction API failed, using client heuristic:', err)
    // Safe client-side heuristic fallback
    const qty = payload.quantity_kg || 1000
    const est = Math.max(5, Math.round(15 + (qty / 1000) * 3))
    return {
      estimated_wait_minutes: est,
      wait_range: { min: Math.max(3, est - 3), max: est + 4, formatted: `${Math.max(3, est - 3)} - ${est + 4} mins` },
      congestion_level: 'Moderate',
      congestion_color: '#f59e0b',
      factors: ['Standard queue check', `${qty} kg produce volume`],
      active_counters: 2,
      farmers_ahead: 1,
      model_version: 'fallback-heuristic'
    }
  }
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

export async function cancelBooking(bookingId) {
  const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/cancel`, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.detail || data.message || 'Failed to cancel booking')
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

/**
 * Returns the SSE stream URL for a given center (farmer use)
 */
export function getQueueStreamUrl(centerId) {
  return `${API_BASE_URL}/queue/${centerId}/stream`
}

/**
 * Returns the SSE stream URL for staff queue
 */
export function getStaffQueueStreamUrl() {
  return `${API_BASE_URL}/staff/queue/stream`
}

/**
 * Fetches the farmer's active booking center ID from their bookings.
 * Falls back to centerId 1 if none found.
 */
export async function getActiveFarmerCenterId() {
  try {
    const response = await fetch(`${API_BASE_URL}/bookings/my`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
    if (response.ok) {
      const bookings = await response.json()
      if (Array.isArray(bookings) && bookings.length > 0) {
        // Find most recent active booking's center
        const active = bookings.find(b => b.status && !['Cancelled', 'Completed'].includes(b.status))
        const fallback = bookings[0]
        const booking = active || fallback
        if (booking?.procurement_center_id) {
          localStorage.setItem('lastBookingCenterId', String(booking.procurement_center_id))
          return booking.procurement_center_id
        }
      }
    }
  } catch {
    return parseInt(localStorage.getItem('lastBookingCenterId') || '1')
  }
  return parseInt(localStorage.getItem('lastBookingCenterId') || '1')
}

/**
 * Returns all unique centers the farmer has active (non-cancelled, non-completed) bookings at.
 */
export async function getActiveFarmerCenters() {
  try {
    const response = await fetch(`${API_BASE_URL}/bookings/my`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
    if (response.ok) {
      const bookings = await response.json()
      if (Array.isArray(bookings) && bookings.length > 0) {
        const centerMap = new Map()
        for (const b of bookings) {
          const cid = b.procurement_center_id
          const isActiveBooking = b.status && !['Cancelled', 'Completed'].includes(b.status)
          if (!centerMap.has(cid)) {
            centerMap.set(cid, {
              id: cid,
              name: b.center_name || `Center #${cid}`,
              address: b.center_address || '',
              district: b.center_district || '',
              isActive: Boolean(isActiveBooking),
              activeToken: isActiveBooking ? (b.formatted_token || (b.token_number ? `#${b.token_number}` : null)) : null,
              activeStatus: isActiveBooking ? b.status : null,
              bookings: [b],
              activeBookings: isActiveBooking ? [b] : [],
              bookingCount: 1,
              hasBookings: true,
            })
          } else {
            const entry = centerMap.get(cid)
            entry.bookings.push(b)
            entry.bookingCount += 1
            if (isActiveBooking) {
              entry.isActive = true
              entry.activeBookings.push(b)
              if (!entry.activeToken || b.status === 'Serving') {
                entry.activeToken = b.formatted_token || (b.token_number ? `#${b.token_number}` : null)
                entry.activeStatus = b.status
              }
            }
          }
        }
        return Array.from(centerMap.values())
      }
    }
  } catch (err) {
    console.error('Failed to get farmer centers:', err)
  }
  return []
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

export async function getPaymentProfile() {
  const response = await fetch(`${API_BASE_URL}/dashboard/payment-profile`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.detail || 'Failed to load payment destination')
  return data
}

export async function savePaymentProfile(payload) {
  const response = await fetch(`${API_BASE_URL}/dashboard/payment-profile`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.detail || 'Failed to save payment destination')
  return data
}

export async function raisePaymentDispute(paymentId, reason) {
  const response = await fetch(`${API_BASE_URL}/dashboard/payments/${paymentId}/dispute`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.detail || 'Unable to raise payment dispute')
  return data
}

export async function getPaymentReceipt(paymentId) {
  const response = await fetch(`${API_BASE_URL}/dashboard/payments/${paymentId}/receipt`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.detail || 'Unable to load receipt')
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

export async function deleteAdminCenter(centerId) {
  const res = await fetch(`${API_BASE_URL}/admin/delete-center/${centerId}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  if (!res.ok) throw new Error('Failed to delete center')
  return res.json()
}

export async function updateAdminCenter(centerId, payload) {
  const res = await fetch(`${API_BASE_URL}/admin/centers/${centerId}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error('Failed to update center')
  const data = await res.json()
  if (!data.success) throw new Error(data.message)
  return data
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

export async function updateAdminSlot(slotId, payload) {
  const res = await fetch(`${API_BASE_URL}/admin/slots/${slotId}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Failed to update slot')
  const data = await res.json()
  if (!data.success) throw new Error(data.message)
  return data
}

export async function deleteAdminSlot(slotId) {
  const res = await fetch(`${API_BASE_URL}/admin/slots/${slotId}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  if (!res.ok) throw new Error('Failed to delete slot')
  const data = await res.json()
  if (!data.success) throw new Error(data.message)
  return data
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

export async function getCenterStaff(centerId) {
  const res = await fetch(`${API_BASE_URL}/admin/centers/${centerId}/staff`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error('Failed to fetch staff list')
  return await res.json()
}

export async function createCenterStaff(centerId, data) {
  const res = await fetch(`${API_BASE_URL}/admin/centers/${centerId}/staff`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.detail || 'Failed to create staff')
  return json
}

export async function deleteStaffMember(staffId) {
  const res = await fetch(`${API_BASE_URL}/admin/staff/${staffId}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  if (!res.ok) throw new Error('Failed to delete staff')
  return await res.json()
}

/* ──────────────── Staff API ──────────────── */

export async function getStaffMe() {
  const res = await fetch(`${API_BASE_URL}/staff/me`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error('Failed to fetch staff profile')
  return await res.json()
}

export async function getStaffDashboard() {
  const res = await fetch(`${API_BASE_URL}/staff/dashboard`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error('Failed to fetch staff dashboard')
  return await res.json()
}

export async function getStaffQueue() {
  const res = await fetch(`${API_BASE_URL}/staff/queue`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error('Failed to fetch queue')
  return await res.json()
}

export async function getStaffProcurement() {
  const res = await fetch(`${API_BASE_URL}/staff/procurement`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error('Failed to fetch procurement list')
  return await res.json()
}

export async function updateStaffProcurement(bookingId, data) {
  const res = await fetch(`${API_BASE_URL}/staff/procurement/${bookingId}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update procurement')
  return await res.json()
}

export async function getStaffPayments() {
  const res = await fetch(`${API_BASE_URL}/staff/payments`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error('Failed to fetch payments')
  return await res.json()
}

export async function updateStaffPayment(paymentId, payload) {
  const res = await fetch(`${API_BASE_URL}/staff/payments/${paymentId}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to update payment settlement')
  return data
}

export async function batchSettleStaffPayments(payload) {
  const res = await fetch(`${API_BASE_URL}/staff/payments/batch-settle`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to disburse batch payments')
  return data
}

export async function getStaffProfile() {
  const res = await fetch(`${API_BASE_URL}/staff/profile`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error('Failed to fetch staff profile')
  return await res.json()
}

/**
 * Staff: call the next farmer in the queue.
 * Returns { success, now_serving, completed_token, message }
 */
export async function callNextFarmer() {
  const res = await fetch(`${API_BASE_URL}/staff/queue/call-next`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  })
  const data = await res.json()
  if (!res.ok) {
    const err = new Error(data.detail || data.message || 'Failed to call next farmer')
    err.status = res.status
    throw err
  }
  return data
}

/**
 * Staff: skip / cancel a booking token.
 * @param {number} bookingId
 */
export async function skipToken(bookingId) {
  const res = await fetch(`${API_BASE_URL}/staff/queue/skip/${bookingId}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  })
  const data = await res.json()
  if (!res.ok) {
    const err = new Error(data.detail || data.message || 'Failed to skip token')
    err.status = res.status
    throw err
  }
  return data
}

// --- Push Notifications ---
export async function subscribePushNotification(subscription) {
  const res = await fetch(`${API_BASE_URL}/notifications/subscribe`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.detail || 'Failed to subscribe to push notifications')
  }
  return data
}

export function checkNotificationStatus() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported'
  }
  return Notification.permission
}

export async function registerPushNotifications(interactive = false) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { success: false, error: 'Push notifications are not supported in this browser' }
  }
  try {
    let permission = Notification.permission
    if (permission !== 'granted') {
      if (!interactive) {
        return { success: false, error: 'Permission not yet granted', permission }
      }
      permission = await Notification.requestPermission()
    }
    if (permission !== 'granted') {
      console.warn('[Push] Notification permission not granted:', permission)
      return { success: false, error: 'Notification permission was denied or dismissed', permission }
    }

    const registration = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
    if (!publicVapidKey) {
      console.warn('[Push] VITE_VAPID_PUBLIC_KEY is not defined in frontend .env')
      return { success: false, error: 'VAPID public key missing in configuration' }
    }

    const padding = '='.repeat((4 - (publicVapidKey.length % 4)) % 4)
    const base64 = (publicVapidKey + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }

    let subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: outputArray,
        })
      } catch (subErr) {
        console.warn('[Push] Direct subscribe failed, attempting clean subscribe:', subErr)
        const old = await registration.pushManager.getSubscription()
        if (old) {
          try { await old.unsubscribe() } catch {}
        }
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: outputArray,
        })
      }
    }

    if (subscription) {
      const raw = subscription.toJSON ? subscription.toJSON() : JSON.parse(JSON.stringify(subscription))
      
      let p256dh = raw.keys?.p256dh
      let auth = raw.keys?.auth
      if (!p256dh && subscription.getKey) {
        const key = subscription.getKey('p256dh')
        if (key) {
          p256dh = btoa(String.fromCharCode.apply(null, new Uint8Array(key)))
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
        }
      }
      if (!auth && subscription.getKey) {
        const key = subscription.getKey('auth')
        if (key) {
          auth = btoa(String.fromCharCode.apply(null, new Uint8Array(key)))
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
        }
      }

      await subscribePushNotification({
        endpoint: subscription.endpoint,
        p256dh: p256dh || '',
        auth: auth || '',
      })
      console.log('[Push] Notification subscription active & synced with backend')
      return { success: true, subscription }
    }
  } catch (err) {
    console.error('[Push] Setup failed:', err)
    return { success: false, error: err.message || 'Setup failed' }
  }
  return { success: false, error: 'Could not obtain subscription' }
}

export async function sendTestPushNotification() {
  const res = await fetch(`${API_BASE_URL}/notifications/test`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || data.message || 'Failed to send test push')
  return data
}

