import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../store/authStore'
import { ordersAPI, commissionsAPI, addressesAPI, paymentsAPI, authAPI } from '../services/api'
import { useToast } from '../components/ui/Toast'
import StatusChip from '../components/StatusChip'
import Timeline from '../components/Timeline'
import Modal from '../components/ui/Modal'

const tabs = [
  { id: 'profile', label: 'Profile', path: '/me' },
  { id: 'orders', label: 'Orders', path: '/me/orders' },
  { id: 'commissions', label: 'Commissions', path: '/me/commissions' },
  { id: 'addresses', label: 'Addresses', path: '/me/addresses' },
  { id: 'payments', label: 'Payments', path: '/me/payments' },
  { id: 'security', label: 'Security', path: '/me/security' },
]

export default function AccountPage() {
  const { user, logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const activeTab = tabs.find((t) => t.path === location.pathname)?.id || 'profile'

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="container-custom py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Account</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <aside className="lg:col-span-1">
          <nav className="bg-white rounded-xl shadow-sm p-4 space-y-1">
            {tabs.map((tab) => (
              <Link
                key={tab.id}
                to={tab.path}
                className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                  activeTab === tab.id
                    ? 'bg-purple-50 text-primary'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </Link>
            ))}
            <hr className="my-2" />
            <button
              onClick={handleLogout}
              className="block w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors min-h-[44px]"
            >
              Sign Out
            </button>
          </nav>
        </aside>

        <div className="lg:col-span-3">
          {activeTab === 'profile' && <ProfileTab user={user} />}
          {activeTab === 'orders' && <OrdersTab />}
          {activeTab === 'commissions' && <CommissionsTab />}
          {activeTab === 'addresses' && <AddressesTab />}
          {activeTab === 'payments' && <PaymentsTab />}
          {activeTab === 'security' && <SecurityTab toast={toast} />}
        </div>
      </div>
    </div>
  )
}

function ProfileTab({ user }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
      <h2 className="text-xl font-semibold mb-6">Profile</h2>
      <div className="space-y-4">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-white text-2xl font-bold">
            {user?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div>
            <h3 className="font-semibold text-lg text-gray-900">{user?.name}</h3>
            <p className="text-gray-500 text-sm">{user?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input defaultValue={user?.name} className="input-field" readOnly />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input defaultValue={user?.email} className="input-field" readOnly />
          </div>
        </div>

        <p className="text-xs text-gray-400 mt-4">
          Profile editing coming soon. Contact support for account changes.
        </p>
      </div>
    </div>
  )
}

function OrdersTab() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedOrder, setExpandedOrder] = useState(null)

  useEffect(() => {
    ordersAPI.list()
      .then((res) => setOrders(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-48" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 md:p-8 text-center py-16">
        <p className="text-6xl mb-4">📦</p>
        <h2 className="text-xl font-semibold mb-2">No orders yet</h2>
        <p className="text-gray-500 mb-6">When you place an order, it will appear here.</p>
        <Link to="/products" className="btn-primary">Start Shopping</Link>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
      <h2 className="text-xl font-semibold mb-6">Order History</h2>
      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
              className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-gray-50 transition-colors text-left min-h-[44px]"
            >
              <div>
                <p className="font-medium text-gray-900">Order #{order.order_number || order.id}</p>
                <p className="text-sm text-gray-500">
                  {new Date(order.created_at).toLocaleDateString('en-NZ', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusChip status={order.status} />
                <span className="font-semibold text-primary">
                  ${(order.total / 100).toFixed(2)} NZD
                </span>
                <svg className={`h-5 w-5 text-gray-400 transition-transform ${expandedOrder === order.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {expandedOrder === order.id && (
              <div className="border-t border-gray-100 p-4 space-y-4">
                {order.items && order.items.length > 0 && (
                  <div className="space-y-2">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
                        <div className="w-10 h-10 bg-gray-200 rounded overflow-hidden shrink-0">
                          <img
                            src={item.product?.image_url || item.product?.images?.[0] || '/placeholder.png'}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.product?.name || 'Product'}</p>
                          {item.variant && <p className="text-xs text-gray-500">{item.variant.name}</p>}
                        </div>
                        <p className="text-sm font-medium shrink-0">×{item.quantity}</p>
                      </div>
                    ))}
                  </div>
                )}

                {order.history && order.history.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Status Timeline</h4>
                    <Timeline
                      events={order.history.map((h) => ({
                        status: h.status,
                        note: h.note || h.description,
                        timestamp: h.created_at || h.timestamp,
                      }))}
                    />
                  </div>
                )}

                {order.shipping_address && (
                  <div className="text-sm">
                    <p className="font-medium text-gray-700 mb-1">Shipping Address</p>
                    <p className="text-gray-600">
                      {order.shipping_address.line1}{order.shipping_address.line2 ? `, ${order.shipping_address.line2}` : ''}
                      , {order.shipping_address.city} {order.shipping_address.postcode}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function CommissionsTab() {
  const [commissions, setCommissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedCommission, setExpandedCommission] = useState(null)

  useEffect(() => {
    commissionsAPI.list()
      .then((res) => setCommissions(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-48" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (commissions.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 md:p-8 text-center py-16">
        <p className="text-6xl mb-4">🎨</p>
        <h2 className="text-xl font-semibold mb-2">No commissions yet</h2>
        <p className="text-gray-500 mb-6">Start a custom commission to bring your fursona to life!</p>
        <Link to="/me/commissions/new" className="btn-accent">Start a Commission</Link>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
      <h2 className="text-xl font-semibold mb-6">Commission History</h2>
      <div className="space-y-4">
        {commissions.map((commission) => (
          <div key={commission.id} className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setExpandedCommission(expandedCommission === commission.id ? null : commission.id)}
              className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-gray-50 transition-colors text-left min-h-[44px]"
            >
              <div>
                <p className="font-medium text-gray-900">{commission.character_name || 'Commission'}</p>
                <p className="text-sm text-gray-500">
                  Submitted {new Date(commission.created_at).toLocaleDateString('en-NZ', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </p>
                {commission.style && (
                  <p className="text-sm text-gray-600 mt-1">Style: {commission.style}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <StatusChip status={commission.status} />
                {commission.budget && (
                  <span className="text-sm text-gray-500">
                    ${(commission.budget / 100).toFixed(2)} NZD
                  </span>
                )}
                <svg className={`h-5 w-5 text-gray-400 transition-transform ${expandedCommission === commission.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {expandedCommission === commission.id && (
              <div className="border-t border-gray-100 p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Species:</span>
                    <p className="font-medium">{commission.species || '-'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Size:</span>
                    <p className="font-medium">{commission.size || '-'}</p>
                  </div>
                  {commission.description && (
                    <div className="col-span-2">
                      <span className="text-gray-500">Description:</span>
                      <p className="font-medium">{commission.description}</p>
                    </div>
                  )}
                </div>

                {commission.history && commission.history.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Status Timeline</h4>
                    <Timeline
                      events={commission.history.map((h) => ({
                        status: h.status,
                        note: h.note || h.description,
                        timestamp: h.created_at || h.timestamp,
                      }))}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function AddressesTab() {
  const [addresses, setAddresses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingAddress, setEditingAddress] = useState(null)
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  const emptyForm = {
    name: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    region: '',
    postcode: '',
    country: 'New Zealand',
    is_default: false,
  }
  const [form, setForm] = useState(emptyForm)

  const loadAddresses = () => {
    setLoading(true)
    addressesAPI.list()
      .then((res) => setAddresses(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadAddresses() }, [])

  const handleEdit = (addr) => {
    setEditingAddress(addr.id)
    setForm({
      name: addr.name || '',
      phone: addr.phone || '',
      line1: addr.line1 || '',
      line2: addr.line2 || '',
      city: addr.city || '',
      region: addr.region || '',
      postcode: addr.postcode || '',
      country: addr.country || 'New Zealand',
      is_default: addr.is_default || false,
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this address?')) return
    try {
      await addressesAPI.delete(id)
      toast.success('Address deleted')
      loadAddresses()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete')
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editingAddress) {
        await addressesAPI.update(editingAddress, form)
        toast.success('Address updated')
      } else {
        await addressesAPI.create(form)
        toast.success('Address added')
      }
      setShowForm(false)
      setEditingAddress(null)
      setForm(emptyForm)
      loadAddresses()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save address')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Saved Addresses</h2>
        <button
          onClick={() => { setShowForm(true); setEditingAddress(null); setForm(emptyForm) }}
          className="btn-primary btn-sm"
        >
          + Add Address
        </button>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl" />
          ))}
        </div>
      ) : addresses.length === 0 && !showForm ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-4xl mb-2">📍</p>
          <p className="mb-4">No saved addresses yet.</p>
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          {addresses.map((addr) => (
            <div key={addr.id} className={`border rounded-xl p-4 ${addr.is_default ? 'border-primary bg-purple-50' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm">
                  <p className="font-medium text-gray-900">{addr.name || 'Address'} {addr.is_default && <span className="badge badge-primary ml-2">Default</span>}</p>
                  <p className="text-gray-600">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</p>
                  <p className="text-gray-600">{addr.city}, {addr.region} {addr.postcode}</p>
                  <p className="text-gray-600">{addr.country}</p>
                  {addr.phone && <p className="text-gray-500 mt-1">Ph: {addr.phone}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => handleEdit(addr)} className="text-primary hover:text-primary-dark text-sm min-h-[44px] min-w-[44px] flex items-center justify-center">Edit</button>
                  <button onClick={() => handleDelete(addr.id)} className="text-red-500 hover:text-red-700 text-sm min-h-[44px] min-w-[44px] flex items-center justify-center">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <Modal
          open={showForm}
          onClose={() => { setShowForm(false); setEditingAddress(null) }}
          title={editingAddress ? 'Edit Address' : 'Add Address'}
        >
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field min-h-[44px]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field min-h-[44px]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1 *</label>
              <input value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} required className="input-field min-h-[44px]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
              <input value={form.line2} onChange={(e) => setForm({ ...form, line2: e.target.value })} className="input-field min-h-[44px]" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required className="input-field min-h-[44px]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Postcode *</label>
                <input value={form.postcode} onChange={(e) => setForm({ ...form, postcode: e.target.value })} required className="input-field min-h-[44px]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                <input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} className="input-field min-h-[44px]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="input-field min-h-[44px]" />
              </div>
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm text-gray-700">Set as default address</span>
            </label>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="btn-primary btn-sm">
                {saving ? 'Saving...' : 'Save Address'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditingAddress(null) }} className="btn-outline btn-sm">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function PaymentsTab() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    paymentsAPI.list()
      .then((res) => setPayments(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-48" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (payments.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 md:p-8 text-center py-16">
        <p className="text-6xl mb-4">💳</p>
        <h2 className="text-xl font-semibold mb-2">No payment history</h2>
        <p className="text-gray-500">Your payment history will appear here.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
      <h2 className="text-xl font-semibold mb-6">Payment History</h2>
      <div className="space-y-3">
        {payments.map((payment) => (
          <div key={payment.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                payment.status === 'confirmed' ? 'bg-green-100' : payment.status === 'pending' ? 'bg-yellow-100' : 'bg-red-100'
              }`}>
                <svg className={`h-5 w-5 ${
                  payment.status === 'confirmed' ? 'text-green-600' : payment.status === 'pending' ? 'text-yellow-600' : 'text-red-600'
                }`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {payment.order_id ? `Order #${payment.order_id}` : 'Payment'}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(payment.created_at).toLocaleDateString('en-NZ', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold text-primary">${((payment.amount || 0) / 100).toFixed(2)} NZD</p>
              <StatusChip status={payment.status} size="xs" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SecurityTab({ toast }) {
  const [form, setForm] = useState({
    current_password: '',
    new_password: '',
    new_password_confirmation: '',
  })
  const [saving, setSaving] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.new_password !== form.new_password_confirmation) {
      toast.error('New passwords do not match')
      return
    }
    if (form.new_password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setSaving(true)
    try {
      await authAPI.changePassword({
        current_password: form.current_password,
        new_password: form.new_password,
        new_password_confirmation: form.new_password_confirmation,
      })
      toast.success('Password changed successfully')
      setForm({ current_password: '', new_password: '', new_password_confirmation: '' })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
      <h2 className="text-xl font-semibold mb-6">Change Password</h2>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
          <input
            name="current_password"
            type="password"
            value={form.current_password}
            onChange={handleChange}
            required
            className="input-field min-h-[44px]"
            autoComplete="current-password"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
          <input
            name="new_password"
            type="password"
            value={form.new_password}
            onChange={handleChange}
            required
            className="input-field min-h-[44px]"
            autoComplete="new-password"
            placeholder="At least 8 characters"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
          <input
            name="new_password_confirmation"
            type="password"
            value={form.new_password_confirmation}
            onChange={handleChange}
            required
            className="input-field min-h-[44px]"
            autoComplete="new-password"
            placeholder="Repeat new password"
          />
        </div>
        <button type="submit" disabled={saving} className="btn-primary btn-sm">
          {saving ? 'Changing...' : 'Change Password'}
        </button>
      </form>
    </div>
  )
}
