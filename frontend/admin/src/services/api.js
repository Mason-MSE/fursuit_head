import axios from 'axios'
import { getAccessToken, setAccessToken, getStoredRefreshToken, setStoredRefreshToken, clearTokens } from '../store/tokenStore'

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

let isRefreshing = false
let failedQueue = []

function processQueue(error, token = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token)
  })
  failedQueue = []
}

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config
    if (err.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        })
      }
      originalRequest._retry = true
      isRefreshing = true
      try {
        const refreshToken = getStoredRefreshToken()
        if (!refreshToken) throw new Error('No refresh token')
        const { data } = await axios.post('/api/v1/auth/refresh-token', { refresh_token: refreshToken })
        const newToken = data.data?.access_token || data.data?.token
        const newRefresh = data.data?.refresh_token
        if (newToken) {
          setAccessToken(newToken)
          if (newRefresh) setStoredRefreshToken(newRefresh)
          processQueue(null, newToken)
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return api(originalRequest)
        }
        throw new Error('No token in refresh response')
      } catch (refreshErr) {
        processQueue(refreshErr, null)
        clearTokens()
        window.location.href = '/login'
        return Promise.reject(refreshErr)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(err)
  }
)

// Auth
export const authAPI = {
  login: (data) => api.post('/admin/auth/login', data),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  refresh: (refreshToken) => axios.post('/api/v1/auth/refresh-token', { refresh_token: refreshToken }),
}

// Dashboard
export const dashboardAPI = {
  stats: () => api.get('/admin/dashboard/stats'),
  recentActivity: () => api.get('/admin/dashboard/activity'),
}

// Users
export const usersAPI = {
  list: (params) => api.get('/admin/users', { params }),
  get: (id) => api.get(`/admin/users/${id}`),
  update: (id, data) => api.put(`/admin/users/${id}`, data),
  suspend: (id) => api.post(`/admin/users/${id}/suspend`),
  activate: (id) => api.post(`/admin/users/${id}/activate`),
  assignRole: (id, roleId) => api.post(`/admin/users/${id}/roles`, { role_id: roleId }),
  removeRole: (id, roleId) => api.delete(`/admin/users/${id}/roles/${roleId}`),
  orders: (id, params) => api.get(`/admin/users/${id}/orders`, { params }),
  auditTrail: (id, params) => api.get(`/admin/users/${id}/audit`, { params }),
}

// Roles
export const rolesAPI = {
  list: (params) => api.get('/admin/roles', { params }),
  get: (id) => api.get(`/admin/roles/${id}`),
  create: (data) => api.post('/admin/roles', data),
  update: (id, data) => api.put(`/admin/roles/${id}`, data),
  delete: (id) => api.delete(`/admin/roles/${id}`),
  permissions: () => api.get('/admin/permissions'),
}

// Products
export const productsAPI = {
  list: (params) => api.get('/admin/products', { params }),
  get: (id) => api.get(`/admin/products/${id}`),
  create: (data) => api.post('/admin/products', data),
  update: (id, data) => api.put(`/admin/products/${id}`, data),
  delete: (id) => api.delete(`/admin/products/${id}`),
  categories: (params) => api.get('/admin/categories', { params }),
}

// Orders
export const ordersAPI = {
  list: (params) => api.get('/admin/orders', { params }),
  get: (id) => api.get(`/admin/orders/${id}`),
  updateStatus: (id, data) => api.put(`/admin/orders/${id}/status`, data),
  confirmPayment: (id, data) => api.post(`/admin/orders/${id}/confirm-payment`, data),
  ship: (id, data) => api.post(`/admin/orders/${id}/ship`, data),
}

// Commissions
export const commissionsAPI = {
  list: (params) => api.get('/admin/commissions', { params }),
  get: (id) => api.get(`/admin/commissions/${id}`),
  update: (id, data) => api.put(`/admin/commissions/${id}`, data),
  updateStatus: (id, data) => api.put(`/admin/commissions/${id}`, data),
  assignMaker: (id, data) => api.put(`/admin/commissions/${id}/assign`, data),
  createQuote: (id, data) => api.post(`/admin/commissions/${id}/quote`, data),
  timeline: (id) => api.get(`/admin/commissions/${id}/timeline`),
  milestones: (id) => api.get(`/admin/commissions/${id}/milestones`),
  createMilestone: (id, data) => api.post(`/admin/commissions/${id}/milestones`, data),
  updateMilestone: (id, milestoneId, data) => api.put(`/admin/commissions/${id}/milestones/${milestoneId}`, data),
  deleteMilestone: (id, milestoneId) => api.delete(`/admin/commissions/${id}/milestones/${milestoneId}`),
  changeRequests: (id) => api.get(`/admin/commissions/${id}/change-requests`),
  createChangeRequest: (id, data) => api.post(`/admin/commissions/${id}/change-requests`, data),
  updateChangeRequest: (id, crId, data) => api.put(`/admin/commissions/${id}/change-requests/${crId}`, data),
}

// Commission Config
export const commissionConfigAPI = {
  get: () => api.get('/admin/commission-config'),
  update: (data) => api.put('/admin/commission-config', data),
}

// Payments
export const paymentsAPI = {
  list: (params) => api.get('/admin/payments', { params }),
  get: (id) => api.get(`/admin/payments/${id}`),
  confirm: (id, data) => api.put(`/admin/payments/${id}/confirm`, data),
  reject: (id, data) => api.post(`/admin/payments/${id}/reject`, data),
  receipt: (id) => api.get(`/admin/payments/${id}/receipt`, { responseType: 'blob' }),
}

// Tickets
export const ticketsAPI = {
  list: (params) => api.get('/admin/tickets', { params }),
  get: (id) => api.get(`/admin/tickets/${id}`),
  updateStatus: (id, data) => api.put(`/admin/tickets/${id}/status`, data),
  assign: (id, data) => api.post(`/admin/tickets/${id}/assign`, data),
  addMessage: (id, data) => api.post(`/admin/tickets/${id}/messages`, data),
  addInternalNote: (id, data) => api.post(`/admin/tickets/${id}/notes`, data),
}

// Pages / Content
export const pagesAPI = {
  list: (params) => api.get('/admin/pages', { params }),
  get: (id) => api.get(`/admin/pages/${id}`),
  create: (data) => api.post('/admin/pages', data),
  update: (id, data) => api.put(`/admin/pages/${id}`, data),
  versions: (id) => api.get(`/admin/pages/${id}/versions`),
  rollback: (id, versionId) => api.post(`/admin/pages/${id}/rollback`, { version_id: versionId }),
}

// Audit
export const auditAPI = {
  list: (params) => api.get('/admin/audit', { params }),
}

export default api
