/**
 * Courseway API client
 * 
 * Single Axios instance for all backend calls.
 * - Automatically attaches JWT from localStorage on every request
 * - Consistent base URL — change once here, updates everywhere
 * - On 401, clears the stale token so the user gets kicked to login
 * 
 * Usage:
 *   import api from '~/lib/api'
 *   const { data } = await api.get('/profile')
 *   const { data } = await api.post('/auth/login', { email, password })
 */

import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  headers: { 'Content-Type': 'application/json' },
})

// Attach token to every outgoing request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// On 401 (expired/invalid token) → clear storage so the user isn't stuck
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken')
      localStorage.removeItem('userEmail')
      window.dispatchEvent(new Event('auth:expired'))
    }
    return Promise.reject(error)
  }
)

export default api
