import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../store/authStore'

export default function ProtectedRoute() {
  const { user, loading } = useAuth()
  const { pathname } = useLocation()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  const section = pathname.split('/')[1]
  const required = { users: ['users.read'], roles: ['roles.read'], products: ['products.read'], orders: ['orders.read'], commissions: ['commissions.read', 'commissions.read_assigned'], payments: ['payments.read'], tickets: ['tickets.read'], content: ['pages.read'], audit: ['audit.read'] }[section]
  if (!user.permissions?.includes('auth.admin_login') || (required && !required.some(p => user.permissions?.includes(p)))) {
    return <main className="p-8"><h1>Access denied</h1><p>Your account does not have permission to view this page.</p><a href="/">Return to overview</a></main>
  }
  return <Outlet />
}
