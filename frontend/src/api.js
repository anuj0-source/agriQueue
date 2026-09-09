export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function loginFarmer(mobile_number, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
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
