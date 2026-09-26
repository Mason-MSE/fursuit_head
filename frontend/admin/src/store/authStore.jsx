import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { authAPI } from '../services/api'
import { getAccessToken, setAccessToken, getStoredRefreshToken, setStoredRefreshToken, clearTokens } from '../store/tokenStore'

const AuthContext = createContext(null)

let refreshTimeout = null

function scheduleRefresh(expiresIn) {
  if (refreshTimeout) clearTimeout(refreshTimeout)
  const ms = Math.max((expiresIn - 60) * 1000, 30000)
  refreshTimeout = setTimeout(async () => {
    const rt = getStoredRefreshToken()
    if (!rt) return
    try {
      const { data } = await authAPI.refresh(rt)
      const newToken = data.data?.access_token || data.data?.token
      const newRefresh = data.data?.refresh_token
      const exp = data.data?.expires_in || 900
      setAccessToken(newToken)
      if (newRefresh) setStoredRefreshToken(newRefresh)
      scheduleRefresh(exp)
    } catch {
      clearTokens()
      window.location.href = '/login'
    }
  }, ms)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const initRef = useRef(false)

  const checkAuth = useCallback(async () => {
    const refreshToken = getStoredRefreshToken()
    if (!refreshToken) {
      setLoading(false)
      return
    }
    try {
      const { data } = await authAPI.me()
      const userData = data.data?.user || data.data
      setUser(userData)
      const newToken = data.data?.access_token || data.data?.token
      const expiresIn = data.data?.expires_in
      if (newToken) {
        setAccessToken(newToken)
        if (expiresIn) scheduleRefresh(expiresIn)
      }
    } catch {
      clearTokens()
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true
      checkAuth()
    }
  }, [checkAuth])

  const login = async (email, password) => {
    const { data } = await authAPI.login({ email, password })
    const token = data.data.token
    const refreshToken = data.data.refresh_token
    const expiresIn = data.data.expires_in || 900
    setAccessToken(token)
    if (refreshToken) setStoredRefreshToken(refreshToken)
    scheduleRefresh(expiresIn)
    setUser(data.data.user)
    return data.data
  }

  const logout = async () => {
    try {
      await authAPI.logout()
    } finally {
      clearTokens()
      if (refreshTimeout) clearTimeout(refreshTimeout)
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
