import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { rolesAPI } from '../services/api'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'

export default function RolesPage() {
  const navigate = useNavigate()
  const [roles, setRoles] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [createModal, setCreateModal] = useState(false)
  const [newRole, setNewRole] = useState({ name: '', description: '' })

  const fetchRoles = async () => {
    setLoading(true)
    try {
      const { data } = await rolesAPI.list({ page, per_page: 10 })
      setRoles(data.data || [])
      setTotal(data.meta?.total || 0)
    } catch {
      setRoles([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRoles() }, [page])

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await rolesAPI.create(newRole)
      setCreateModal(false)
      setNewRole({ name: '', description: '' })
      fetchRoles()
    } catch {}
  }

  const columns = [
    { key: 'name', label: 'Name', sortable: true, render: (v) => <span className="font-medium text-gray-900">{v}</span> },
    { key: 'description', label: 'Description', render: (v) => <span className="text-gray-500">{v || '-'}</span> },
    { key: 'permissions', label: 'Permissions', render: (v) => (
      <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-700">
        {Array.isArray(v) ? v.length : v || 0} permissions
      </span>
    )},
    { key: 'is_system', label: 'Type', render: (v) => (
      v ? <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">System Role</span> : <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">Custom</span>
    )},
  ]

  const actions = [
    { label: 'View', onClick: (row) => navigate(`/roles/${row.id}`) },
  ]

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Roles</h1>
        <button
          onClick={() => setCreateModal(true)}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          + New Role
        </button>
      </div>

      <DataTable
        columns={columns}
        data={roles}
        totalItems={total}
        page={page}
        onPageChange={setPage}
        loading={loading}
        actions={actions}
      />

      <Modal
        open={createModal}
        onClose={() => setCreateModal(false)}
        title="Create Role"
        footer={
          <>
            <button onClick={() => setCreateModal(false)} className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">Cancel</button>
            <button onClick={handleCreate} className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700">Create</button>
          </>
        }
      >
        <form className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
            <input
              value={newRole.name}
              onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={newRole.description}
              onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              rows={3}
            />
          </div>
        </form>
      </Modal>
    </div>
  )
}
