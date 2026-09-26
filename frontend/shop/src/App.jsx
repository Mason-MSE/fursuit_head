import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import HomePage from './pages/HomePage'
import ProductsPage from './pages/ProductsPage'
import ProductDetailPage from './pages/ProductDetailPage'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import MyOrdersPage from './pages/MyOrdersPage'
import MyCommissionsPage from './pages/MyCommissionsPage'
import CommissionWizardPage from './pages/CommissionWizardPage'
import AccountPage from './pages/AccountPage'
import PasswordRecoveryPage from './pages/PasswordRecoveryPage'
import VerifyEmailPage from './pages/VerifyEmailPage'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/:id" element={<ProductDetailPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route
          path="/checkout"
          element={
            <ProtectedRoute>
              <CheckoutPage />
            </ProtectedRoute>
          }
        />
        <Route path="/forgot-password" element={<PasswordRecoveryPage />} />
<Route path="/reset-password" element={<PasswordRecoveryPage reset />} />
<Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route
          path="/me/orders"
          element={
            <ProtectedRoute>
              <MyOrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/me/commissions"
          element={
            <ProtectedRoute>
              <MyCommissionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/me/commissions/new"
          element={
            <ProtectedRoute>
              <CommissionWizardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/me/*"
          element={
            <ProtectedRoute>
              <AccountPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Layout>
  )
}
