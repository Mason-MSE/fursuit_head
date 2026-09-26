import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { authAPI } from '../services/api'

export default function PasswordRecoveryPage({ reset = false }) {
  const [params] = useSearchParams()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  async function submit(event) {
    event.preventDefault(); setError(''); setBusy(true)
    const form = new FormData(event.currentTarget)
    try {
      if (reset) {
        await authAPI.resetPassword({ token: params.get('token'), password: form.get('password'), password_confirm: form.get('password_confirm') })
        setMessage('Your password has been changed. Please sign in again.')
      } else {
        await authAPI.forgotPassword(form.get('email'))
        setMessage('If this email is registered, a reset link has been sent. Please check your inbox.')
      }
    } catch (err) { setError(err.response?.data?.error?.message || 'Unable to complete your request. Please try again.') }
    finally { setBusy(false) }
  }
  return <section className="container-custom max-w-lg py-16">
    <h1 className="text-3xl font-bold mb-6">{reset ? 'Reset password' : 'Forgot password'}</h1>
    {message ? <div role="status"><p>{message}</p><Link className="underline" to="/login">Sign in</Link></div> :
      <form onSubmit={submit} className="space-y-5">
        {error && <p role="alert" className="text-red-700">{error}</p>}
        {reset ? <>
          <p>Use at least 12 characters, including uppercase, lowercase, a number and a symbol.</p>
          <label className="block">New password<input className="input-field" name="password" type="password" minLength={12} maxLength={72} autoComplete="new-password" required /></label>
          <label className="block">Confirm password<input className="input-field" name="password_confirm" type="password" minLength={12} maxLength={72} autoComplete="new-password" required /></label>
        </> : <label className="block">Email<input className="input-field" name="email" type="email" autoComplete="email" required /></label>}
        <button className="btn-primary" disabled={busy || (reset && !params.get('token'))}>{busy ? 'Submitting…' : reset ? 'Set new password' : 'Send reset link'}</button>
      </form>}
  </section>
}
