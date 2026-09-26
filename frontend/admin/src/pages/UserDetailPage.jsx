import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usersAPI, rolesAPI } from '../services/api'
import StatusBadge from '../components/StatusBadge'

export default function UserDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [roles, setRoles] = useState([])
  const [orders, setOrders] = useState([])
  const [audit, setAudit] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('info')

  useEffect(() => {
    Promise.all([
      usersAPI.get(id),
      rolesAPI.list({ per_page: 100 }),
    ]).then(([u, r]) => {
      setUser(u.data?.data)
      setRoles(r.data?.data || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (tab === 'orders') {
      usersAPI.orders(id, { per_page: 20 }).then(({ data }) => {
        setOrders(data.data || [])
      }).catch(() => setOrders([]))
    }
    if (tab === 'audit') {
      usersAPI.auditTrail(id, { per_page: 20 }).then(({ data }) => {
        setAudit(data.data || [])
      }).catch(() => setAudit([]))
    }
  }, [tab, id])

  const handleAssignRole = async (roleId) => {
    try {
      await usersAPI.assignRole(id, roleId)
      const { data } = await usersAPI.get(id)
      setUser(data.data)
    } catch {}
  }

  const handleRemoveRole = async (roleId) => {
    try {
      await usersAPI.removeRole(id, roleId)
      const { data } = await usersAPI.get(id)
      setUser(data.data)
    } catch {}
  }

  if (loading) return <div className="py-20 text-center text-gray-400">Loading...</div>
  if (!user) return <div className="py-20 text-center text-red-400">User not found</div>

  const tabs = [
    { key: 'info', label: 'Info' },
    { key: 'roles', label: 'Roles' },
    { key: 'orders', label: 'Orders' },
    { key: 'audit', label: 'Audit Trail' },
  ]

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <button onClick={() => navigate('/users')} className="text-gray-400 hover:text-gray-600">&larr; Back</button>
        <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
        <StatusBadge status={user.status} />
      </div>

      <div className="mb-6 flex gap-1 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              tab === t.key ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <div className="rounded-xl bg-white p-6 shadow">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div><p className="text-sm text-gray-500">Name</p><p className="font-medium">{user.name}</p></div>
            <div><p className="text-sm text-gray-500">Email</p><p className="font-medium">{user.email}</p></div>
            <div><p className="text-sm text-gray-500">Status</p><StatusBadge status={user.status} /></div>
            <div><p className="text-sm text-gray-500">Joined</p><p className="font-medium">{user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}</p></div>
            <div><p className="text-sm text-gray-500">Last Login</p><p className="font-medium">{user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}</p></div>
          </div>
        </div>
      )}

      {tab === 'roles' && (
        <div className="rounded-xl bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold">Current Roles</h3>
          <div className="mb-4 flex flex-wrap gap-2">
            {(user.roles || []).map((r) => {
              const role = typeof r === 'string' ? { name: r, id: r } : r
              return (
                <span key={role.id} className="flex items-center gap-1 rounded-full bg-primary-100 px-3 py-1 text-sm text-primary-700">
                  {role.name}
                  <button onClick={() => handleRemoveRole(role.id)} className="ml-1 text-primary-400 hover:text-primary-700">&times;</button>
                </span>
              )
            })}
            {(!user.roles || user.roles.length === 0) && <p className="text-sm text-gray-400">No roles assigned</p>}
          </div>
          <h3 className="mb-3 text-sm font-semibold text-gray-500">Assign Role</h3>
          <div className="flex flex-wrap gap-2">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => handleAssignRole(role.id)}
                className="rounded-lg border px-3 py-1.5 text-sm hover:bg-primary-50 hover:text-primary-700"
              >
                + {role.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === 'orders' && (
        <div className="rounded-xl bg-white p-6 shadow">
          {orders.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No orders</p>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => (
                <div key={o.id} className="flex items-center justify-between rounded-lg border p-4 hover:bg-gray-50">
                  <div>
                    <p className="font-medium text-gray-900">#{o.order_number || o.id}</p>
                    <p className="text-sm text-gray-500">{o.created_at ? new Date(o.created_at).toLocaleDateString() : ''}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <StatusBadge status={o.status} />
                    <span className="font-medium">${o.total || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'audit' && (
        <div className="rounded-xl bg-white p-6 shadow">
          {audit.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No audit records</p>
          ) : (
            <div className="space-y-3">
              {audit.map((entry, i) => (
                <div key={entry.id || i} className="flex items-start gap-3 rounded-lg border p-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">
                    {entry.action?.[0]?.toUpperCase() || 'A'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{entry.action}</p>
                    <p className="text-sm text-gray-500">{entry.description || entry.resource || ''}</p>
                    <p className="text-xs text-gray-400">{entry.created_at ? new Date(entry.created_at).toLocaleString() : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
