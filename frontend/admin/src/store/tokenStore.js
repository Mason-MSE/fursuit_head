let accessToken = null

export function getAccessToken() {
  return accessToken
}

export function setAccessToken(token) {
  accessToken = token
}

export function getStoredRefreshToken() {
  try { return localStorage.getItem('admin_refresh_token') } catch { return null }
}

export function setStoredRefreshToken(token) {
  try {
    if (token) localStorage.setItem('admin_refresh_token', token)
    else localStorage.removeItem('admin_refresh_token')
  } catch {}
}

export function clearTokens() {
  accessToken = null
  try { localStorage.removeItem('admin_refresh_token') } catch {}
}
