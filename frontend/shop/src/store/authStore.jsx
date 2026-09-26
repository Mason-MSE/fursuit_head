import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext(null)

let accessToken = null
let refreshTokenValue = null
let refreshTimer = null

export function logout() {
  if (refreshTimer) clearTimeout(refreshTimer)
  accessToken = null
  refreshTokenValue = null
  localStorage.removeItem('fursuit_shop_refresh_token')
  localStorage.removeItem('fursuit_shop_user')
}

function scheduleRefresh(expiresIn) {
  if (refreshTimer) clearTimeout(refreshTimer)
  const refreshAt = (expiresIn - 60) * 1000
  if (refreshAt <= 0) return
  refreshTimer = setTimeout(async () => {
    try {
      const res = await authAPI.refresh(refreshTokenValue)
      const data = res.data?.data || res.data
      if (data?.token) {
        accessToken = data.token
        if (data.refresh_token) {
          refreshTokenValue = data.refresh_token
          localStorage.setItem('fursuit_shop_refresh_token', data.refresh_token)
        }
        scheduleRefresh(data.expires_in || 900)
      }
    } catch {
      accessToken = null
      refreshTokenValue = null
      localStorage.removeItem('fursuit_shop_refresh_token')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
  }, Math.max(refreshAt, 30000))
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('fursuit_shop_user')
    return saved ? JSON.parse(saved) : null
  })
  const [loading, setLoading] = useState(true)
  const initRef = useRef(false)

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    refreshTokenValue = localStorage.getItem('fursuit_shop_refresh_token')
    if (refreshTokenValue) {
      authAPI.refresh(refreshTokenValue)
        .then((res) => {
          const data = res.data?.data || res.data
          if (data?.token) {
            accessToken = data.token
            if (data.refresh_token) {
              refreshTokenValue = data.refresh_token
              localStorage.setItem('fursuit_shop_refresh_token', data.refresh_token)
            }
            scheduleRefresh(data.expires_in || 900)
            return authAPI.getMe()
          }
          throw new Error('No token')
        })
        .then((res) => {
          const userData = res.data?.data || res.data
          setUser(userData)
          localStorage.setItem('fursuit_shop_user', JSON.stringify(userData))
        })
        .catch(() => {
          accessToken = null
          refreshTokenValue = null
          localStorage.removeItem('fursuit_shop_refresh_token')
          localStorage.removeItem('fursuit_shop_user')
          setUser(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = useCallback(async (email, password) => {
    const res = await authAPI.login({ email, password })
    const responseData = res.data?.data || res.data
    const newToken = responseData?.token
    const userData = responseData?.user || responseData
    const expiresIn = responseData?.expires_in || 900
    const newRefresh = responseData?.refresh_token

    if (newToken) {
      accessToken = newToken
      if (newRefresh) {
        refreshTokenValue = newRefresh
        localStorage.setItem('fursuit_shop_refresh_token', newRefresh)
      }
      scheduleRefresh(expiresIn)
      localStorage.setItem('fursuit_shop_user', JSON.stringify(userData))
      setUser(userData)
    }
    return userData
  }, [])

  const register = useCallback(async (data) => {
    const res = await authAPI.register(data)
    const responseData = res.data?.data || res.data
    const newToken = responseData?.token
    const userData = responseData?.user || responseData
    const expiresIn = responseData?.expires_in || 900
    const newRefresh = responseData?.refresh_token

    if (newToken) {
      accessToken = newToken
      if (newRefresh) {
        refreshTokenValue = newRefresh
        localStorage.setItem('fursuit_shop_refresh_token', newRefresh)
      }
      scheduleRefresh(expiresIn)
      localStorage.setItem('fursuit_shop_user', JSON.stringify(userData))
      setUser(userData)
    }
    return responseData
  }, [])

  const authLogout = useCallback(async () => {
    try { await authAPI.logout() } finally { logout(); setUser(null) }
  }, [])

  const value = {
    user,
    loading,
    isAuthenticated: !!accessToken && !!user,
    login,
    register,
    logout: authLogout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function getAccessToken() {
  return accessToken
}
