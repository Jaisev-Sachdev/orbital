/**
 * AuthContext
 *
 * Provides auth state to the entire app so every page doesn't need to
 * re-read localStorage and re-fetch the profile independently.
 *
 * What it exposes:
 *   isLoggedIn  — boolean, is there a valid token?
 *   user        — { email, userId } from the stored token payload
 *   profile     — the full backend profile (major, faculty, year, completedMods)
 *   login()     — call after a successful /auth/login response
 *   logout()    — clears everything and redirects to /login
 *   refreshProfile() — re-fetches profile from backend (call after onboarding)
 *
 * ProtectedRoute — wraps any route that needs auth.
 *   Redirects to /login if not authenticated.
 *
 * Usage in routes.ts:
 *   route("dashboard", "routes/dashboard.tsx")   ← wrap with <ProtectedRoute>
 */

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router'
import api from '~/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserProfile {
  major: string
  faculty: string
  yearOfStudy: number
  cohortYear: string
  completedMods: string[]
}

interface AuthContextValue {
  isLoggedIn: boolean
  email: string
  profile: UserProfile | null
  login: (token: string, email: string) => void
  logout: () => void
  refreshProfile: () => Promise<void>
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('authToken'))
  const [email, setEmail] = useState(() => localStorage.getItem('userEmail') ?? '')
  const [profile, setProfile] = useState<UserProfile | null>(null)

  const refreshProfile = useCallback(async () => {
    const token = localStorage.getItem('authToken')
    if (!token) return
    try {
      const { data } = await api.get('/profile')
      setProfile(data.profile)
    } catch {
      // 401 is handled by the interceptor — token is cleared there
      setProfile(null)
    }
  }, [])

  // Load profile once on mount if already logged in
  useEffect(() => {
    if (isLoggedIn) {
      refreshProfile()
    }
  }, [isLoggedIn, refreshProfile])

  const login = useCallback((token: string, userEmail: string) => {
    localStorage.setItem('authToken', token)
    localStorage.setItem('userEmail', userEmail)
    setIsLoggedIn(true)
    setEmail(userEmail)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('userEmail')
    setIsLoggedIn(false)
    setEmail('')
    setProfile(null)
    window.location.href = '/login'
  }, [])

  // If the api client hits a 401, the token is already cleared by the
  // interceptor. React to it immediately instead of waiting for the next
  // route change to notice the token is gone.
  useEffect(() => {
    const handleExpired = () => {
      setIsLoggedIn(false)
      setEmail('')
      setProfile(null)
      window.location.href = '/login'
    }
    window.addEventListener('auth:expired', handleExpired)
    return () => window.removeEventListener('auth:expired', handleExpired)
  }, [])

  return (
    <AuthContext.Provider value={{ isLoggedIn, email, profile, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

// ─── ProtectedRoute ───────────────────────────────────────────────────────────

/**
 * Wrap any route component with this to require authentication.
 *
 * Example usage in a route file:
 *
 *   export default function Dashboard() {
 *     return (
 *       <ProtectedRoute>
 *         <DashboardContent />
 *       </ProtectedRoute>
 *     )
 *   }
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const token = localStorage.getItem('authToken')

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true })
    }
  }, [token, navigate])

  if (!token) return null

  return <>{children}</>
}
