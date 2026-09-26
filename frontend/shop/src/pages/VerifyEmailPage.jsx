import { Link, useSearchParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { authAPI } from '../services/api'

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setStatus('error')
      setMessage('No verification token provided.')
      return
    }

    authAPI.verifyEmail(token)
      .then((res) => {
        setStatus('success')
        setMessage(res.data.data?.message || res.data.message || 'Email verified successfully!')
      })
      .catch((err) => {
        setStatus('error')
        setMessage(err.response?.data?.message || 'Verification failed. The link may be expired or invalid.')
      })
  }, [searchParams])

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold text-gray-900">Verifying Email...</h1>
            <p className="text-gray-600 mt-2">Please wait while we verify your email address.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✅</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Email Verified!</h1>
            <p className="text-gray-600 mt-2 mb-6">{message}</p>
            <Link to="/login" className="btn-primary">
              Sign In
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">❌</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Verification Failed</h1>
            <p className="text-gray-600 mt-2 mb-6">{message}</p>
            <Link to="/register" className="btn-primary">
              Register Again
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
