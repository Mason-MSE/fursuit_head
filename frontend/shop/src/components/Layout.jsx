import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../store/authStore'

function CartIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}

export default function Layout({ children }) {
  const { isAuthenticated, user, logout } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    setUserMenuOpen(false)
    navigate('/')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container-custom">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-2xl">🦊</span>
              <span className="text-xl font-bold text-gradient">NZ Fursuit</span>
            </Link>

            <nav className="hidden md:flex items-center gap-8">
              <Link to="/products" className="text-gray-600 hover:text-primary transition-colors font-medium">
                Shop
              </Link>
              <Link to="/me/commissions" className="text-gray-600 hover:text-primary transition-colors font-medium">
                Commissions
              </Link>
            </nav>

            <div className="flex items-center gap-4">
              <Link to="/cart" className="text-gray-600 hover:text-primary transition-colors relative">
                <CartIcon />
              </Link>

              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors"
                  >
                    <UserIcon />
                    <span className="hidden sm:inline text-sm font-medium">{user?.name || 'Account'}</span>
                  </button>
                  {userMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 z-50 py-1">
                        <Link
                          to="/me"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          My Account
                        </Link>
                        <Link
                          to="/me/orders"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          My Orders
                        </Link>
                        <Link
                          to="/me/commissions"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          My Commissions
                        </Link>
                        <hr className="my-1" />
                        <button
                          onClick={handleLogout}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          Sign Out
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="hidden md:flex items-center gap-3">
                  <Link to="/login" className="text-gray-600 hover:text-primary transition-colors font-medium text-sm">
                    Sign In
                  </Link>
                  <Link to="/register" className="btn-primary btn-sm">
                    Register
                  </Link>
                </div>
              )}

              <button
                className="md:hidden text-gray-600"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-100 py-4 space-y-3">
              <Link
                to="/products"
                className="block text-gray-600 hover:text-primary font-medium py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Shop
              </Link>
              <Link
                to="/me/commissions"
                className="block text-gray-600 hover:text-primary font-medium py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Commissions
              </Link>
              {!isAuthenticated && (
                <>
                  <Link
                    to="/login"
                    className="block text-gray-600 hover:text-primary font-medium py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="block text-primary font-medium py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-gray-900 text-gray-300 mt-auto">
        <div className="container-custom py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🦊</span>
                <span className="text-xl font-bold text-white">NZ Fursuit</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed max-w-md">
                Handcrafted custom fursuit heads made with love in New Zealand.
                Each piece is uniquely designed to bring your fursona to life.
              </p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Shop</h3>
              <ul className="space-y-2 text-sm">
                <li><Link to="/products" className="hover:text-white transition-colors">All Products</Link></li>
                <li><Link to="/products?type=ready" className="hover:text-white transition-colors">Ready to Ship</Link></li>
                <li><Link to="/me/commissions/new" className="hover:text-white transition-colors">Custom Commission</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Account</h3>
              <ul className="space-y-2 text-sm">
                <li><Link to="/me" className="hover:text-white transition-colors">My Account</Link></li>
                <li><Link to="/me/orders" className="hover:text-white transition-colors">My Orders</Link></li>
                <li><Link to="/me/commissions" className="hover:text-white transition-colors">My Commissions</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-500">
            <p>&copy; {new Date().getFullYear()} NZ Fursuit. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
