import axios from 'axios'
import { getAccessToken, logout } from '../store/authStore'

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      logout()
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  logout: () => api.post('/auth/logout'),
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  verifyEmail: (token) => api.get(`/auth/verify-email?token=${token}`),
  refresh: (refreshToken) => api.post('/auth/refresh-token', { refresh_token: refreshToken }),
  changePassword: (data) => api.post('/auth/change-password', data),
}

export const productsAPI = {
  list: (params) => api.get('/products', { params }),
  get: (id) => api.get(`/products/${id}`),
}

export const categoriesAPI = {
  list: () => api.get('/categories'),
}

export const cartAPI = {
  get: () => api.get('/me/cart'),
  addItem: (data) => api.post('/me/cart/items', data),
  updateItem: (itemId, data) => api.put(`/me/cart/items/${itemId}`, data),
  removeItem: (itemId) => api.delete(`/me/cart/items/${itemId}`),
}

export const addressesAPI = {
  list: () => api.get('/me/addresses'),
  get: (id) => api.get(`/me/addresses/${id}`),
  create: (data) => api.post('/me/addresses', data),
  update: (id, data) => api.put(`/me/addresses/${id}`, data),
  delete: (id) => api.delete(`/me/addresses/${id}`),
}

export const ordersAPI = {
  create: (data) => api.post('/me/orders', data),
  list: () => api.get('/me/orders'),
  get: (id) => api.get(`/me/orders/${id}`),
}

export const commissionsAPI = {
  create: (data) => api.post('/me/commissions', data),
  saveDraft: (data) => api.post('/me/commissions/draft', data),
  list: () => api.get('/me/commissions'),
  get: (id) => api.get(`/me/commissions/${id}`),
  submit: (id, data) => {
    if (data instanceof FormData) {
      return api.post(`/me/commissions/${id}/submit`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    }
    return api.post(`/me/commissions/${id}/submit`, data)
  },
  getQuotes: (id) => api.get(`/me/commissions/${id}/quotes`),
  acceptQuote: (commissionId, quoteId, data) =>
    api.post(`/me/commissions/${commissionId}/quotes/${quoteId}/accept`, data),
}

export const paymentsAPI = {
  uploadReceipt: (data) => {
    if (data instanceof FormData) {
      return api.post('/me/payments/upload', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    }
    return api.post('/me/payments/upload', data)
  },
  list: (params) => api.get('/me/payments', { params }),
}

export const ticketsAPI = {
  create: (data) => api.post('/me/tickets', data),
  list: (params) => api.get('/me/tickets', { params }),
  addMessage: (id, data) => api.post(`/me/tickets/${id}/messages`, data),
}

export default api
