import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { usersAPI, rolesAPI } from '../services/api'
import DataTable from '../components/DataTable'
import StatusBadge from '../components/StatusBadge'
import Modal from '../components/Modal'

export default function UsersPage() {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ search: '', status: '' })
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('desc')
  const [suspendModal, setSuspendModal] = useState({ open: false, user: null })
  const [roleModal, setRoleModal] = useState({ open: false, user: null })
  const [allRoles, setAllRoles] = useState([])

  useEffect(() => {
    rolesAPI.list({ per_page: 100 }).then(({ data }) => {
      setAllRoles(data.data || [])
    }).catch(() => {})
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const { data } = await usersAPI.list({
        page,
        per_page: 10,
        search: filters.search || undefined,
        status: filters.status || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      })
      setUsers(data.data || [])
      setTotal(data.meta?.total || 0)
    } catch {
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [page, filters, sortBy, sortOrder])

  const handleSuspend = async () => {
    if (!suspendModal.user) return
    try {
      if (suspendModal.user.status === 'suspended') {
        await usersAPI.activate(suspendModal.user.id)
      } else {
        await usersAPI.suspend(suspendModal.user.id)
      }
      setSuspendModal({ open: false, user: null })
      fetchUsers()
    } catch {}
  }

  const handleToggleRole = async (userId, roleId, hasRole) => {
    try {
      if (hasRole) {
        await usersAPI.removeRole(userId, roleId)
      } else {
        await usersAPI.assignRole(userId, roleId)
      }
      const { data } = await usersAPI.get(userId)
      setRoleModal({ ...roleModal, user: data.data })
      fetchUsers()
    } catch {}
  }

  const getUserRoleIds = (user) => {
    return new Set((user?.roles || []).map((r) => typeof r === 'string' ? r : r.id))
  }

  const columns = [
    { key: 'name', label: 'Name', sortable: true, render: (_, row) => (
      <span className="font-medium text-gray-900">{row.name}</span>
    )},
    { key: 'email', label: 'Email', sortable: true },
    { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
    { key: 'roles', label: 'Roles', render: (v) => (
      <div className="flex gap-1 flex-wrap">
        {(v || []).map((r, i) => (
          <span key={i} className="rounded bg-primary-50 px-2 py-0.5 text-xs text-primary-700">
            {typeof r === 'string' ? r : r.name}
          </span>
        ))}
      </div>
    )},
    { key: 'orders_count', label: 'Orders', render: (v, row) => (
      <span className="text-gray-700">{v ?? row.orders_count ?? '-'}</span>
    )},
    { key: 'commissions_count', label: 'Commissions', render: (v, row) => (
      <span className="text-gray-700">{v ?? row.commissions_count ?? '-'}</span>
    )},
    { key: 'last_login', label: 'Last Login', sortable: true, render: (v) => (
      <span className="text-gray-500">{v ? new Date(v).toLocaleDateString() : 'Never'}</span>
    )},
    { key: 'created_at', label: 'Joined', sortable: true, render: (v) => (
      <span className="text-gray-500">{v ? new Date(v).toLocaleDateString() : '-'}</span>
    )},
  ]

  const actions = [
    { label: 'View', onClick: (row) => navigate(`/users/${row.id}`) },
    { label: 'Roles', onClick: (row) => setRoleModal({ open: true, user: row }) },
    {
      label: (row) => row.status === 'suspended' ? 'Activate' : 'Suspend',
      onClick: (row) => setSuspendModal({ open: true, user: row }),
      className: (row) => row.status === 'suspended' ? 'text-green-600 hover:bg-green-50' : 'text-red-600 hover:bg-red-50',
    },
  ]

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Users</h1>
      <DataTable
        columns={columns}
        data={users}
        totalItems={total}
        page={page}
        onPageChange={setPage}
        loading={loading}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={(key, order) => { setSortBy(key); setSortOrder(order) }}
        filters={filters}
        onFilterChange={(f) => { setFilters(f); setPage(1) }}
        actions={actions}
      />

      <Modal
        open={suspendModal.open}
        onClose={() => setSuspendModal({ open: false, user: null })}
        title="Confirm Action"
        footer={
          <>
            <button onClick={() => setSuspendModal({ open: false, user: null })} className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">Cancel</button>
            <button onClick={handleSuspend} className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700">
              {suspendModal.user?.status === 'suspended' ? 'Activate' : 'Suspend'}
            </button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Are you sure you want to {suspendModal.user?.status === 'suspended' ? 'activate' : 'suspend'} user{' '}
          <strong>{suspendModal.user?.name}</strong>?
        </p>
      </Modal>

      <Modal
        open={roleModal.open}
        onClose={() => setRoleModal({ open: false, user: null })}
        title={`Manage Roles - ${roleModal.user?.name || ''}`}
        footer={
          <button onClick={() => setRoleModal({ open: false, user: null })} className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">Done</button>
        }
      >
        {roleModal.user && (
          <div className="space-y-3">
            {allRoles.map((role) => {
              const hasRole = getUserRoleIds(roleModal.user).has(role.id)
              return (
                <label key={role.id} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasRole}
                    onChange={() => handleToggleRole(roleModal.user.id, role.id, hasRole)}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{role.name}</p>
                    {role.description && <p className="text-xs text-gray-500">{role.description}</p>}
                  </div>
                  {role.is_system && <span className="text-xs text-gray-400">System</span>}
                </label>
              )
            })}
          </div>
        )}
      </Modal>
    </div>
  )
}
