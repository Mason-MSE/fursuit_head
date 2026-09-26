import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../store/authStore'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setErrors({ ...errors, [e.target.name]: '' })
    setError('')
  }

  const validate = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Name is required'
    if (!form.email.trim()) errs.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Email is invalid'
    if (form.password.length < 8) errs.password = 'Password must be at least 8 characters'
    if (form.password !== form.password_confirmation) errs.password_confirmation = 'Passwords do not match'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    setError('')
    try {
      const result = await register({
        name: form.name,
        email: form.email,
        password: form.password,
        password_confirmation: form.password_confirmation,
      })
      if (result.token) {
        navigate('/')
      } else {
        navigate('/login')
      }
    } catch (err) {
      const data = err.response?.data
      if (data?.errors) {
        const fieldErrors = {}
        Object.entries(data.errors).forEach(([key, val]) => {
          fieldErrors[key] = Array.isArray(val) ? val[0] : val
        })
        setErrors(fieldErrors)
      } else {
        setError(data?.message || 'Registration failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-5xl">🐺</span>
          <h1 className="text-2xl font-bold text-gray-900 mt-4">Create Account</h1>
          <p className="text-gray-600 mt-1">Join NZ Fursuit to shop and track orders</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-8">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                className={`input-field min-h-[44px] ${errors.name ? 'border-red-500' : ''}`}
                placeholder="Your name"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
                autoComplete="email"
                className={`input-field min-h-[44px] ${errors.email ? 'border-red-500' : ''}`}
                placeholder="you@example.com"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                required
                autoComplete="new-password"
                className={`input-field min-h-[44px] ${errors.password ? 'border-red-500' : ''}`}
                placeholder="At least 8 characters"
              />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input
                name="password_confirmation"
                type="password"
                value={form.password_confirmation}
                onChange={handleChange}
                required
                autoComplete="new-password"
                className={`input-field min-h-[44px] ${errors.password_confirmation ? 'border-red-500' : ''}`}
                placeholder="Repeat your password"
              />
              {errors.password_confirmation && (
                <p className="text-red-500 text-xs mt-1">{errors.password_confirmation}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary min-h-[48px]"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-600 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:text-primary-dark font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
