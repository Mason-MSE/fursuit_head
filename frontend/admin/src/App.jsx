import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import AdminLayout from './components/AdminLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import UsersPage from './pages/UsersPage'
import UserDetailPage from './pages/UserDetailPage'
import RolesPage from './pages/RolesPage'
import RoleDetailPage from './pages/RoleDetailPage'
import ProductsPage from './pages/ProductsPage'
import ProductEditPage from './pages/ProductEditPage'
import OrdersPage from './pages/OrdersPage'
import OrderDetailPage from './pages/OrderDetailPage'
import CommissionsPage from './pages/CommissionsPage'
import CommissionDetailPage from './pages/CommissionDetailPage'
import CommissionConfigPage from './pages/CommissionConfigPage'
import PaymentsPage from './pages/PaymentsPage'
import TicketsPage from './pages/TicketsPage'
import TicketDetailPage from './pages/TicketDetailPage'
import ContentPage from './pages/ContentPage'
import AuditPage from './pages/AuditPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="users/:id" element={<UserDetailPage />} />
          <Route path="roles" element={<RolesPage />} />
          <Route path="roles/:id" element={<RoleDetailPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/new" element={<ProductEditPage />} />
          <Route path="products/:id" element={<ProductEditPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />
          <Route path="commissions" element={<CommissionsPage />} />
          <Route path="commissions/config" element={<CommissionConfigPage />} />
          <Route path="commissions/:id" element={<CommissionDetailPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="tickets" element={<TicketsPage />} />
          <Route path="tickets/:id" element={<TicketDetailPage />} />
          <Route path="content" element={<ContentPage />} />
          <Route path="audit" element={<AuditPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
