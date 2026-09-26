import { useState, useEffect } from 'react'
import { auditAPI } from '../services/api'
import DataTable from '../components/DataTable'

export default function AuditPage() {
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ search: '', action: '', resource: '' })
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('desc')

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const { data } = await auditAPI.list({
        page,
        per_page: 15,
        search: filters.search || undefined,
        action: filters.action || undefined,
        resource: filters.resource || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      })
      setLogs(data.data || [])
      setTotal(data.meta?.total || 0)
    } catch {
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLogs() }, [page, filters, sortBy, sortOrder])

  const columns = [
    { key: 'actor', label: 'Actor', sortable: true, render: (v, row) => (
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
          {(v?.name || row.user?.name || row.actor_name || 'S')[0].toUpperCase()}
        </div>
        <span className="text-sm font-medium text-gray-900">{v?.name || row.user?.name || row.actor_name || 'System'}</span>
      </div>
    )},
    { key: 'action', label: 'Action', sortable: true, render: (v) => (
      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 capitalize">
        {(v || '').replace(/_/g, ' ')}
      </span>
    )},
    { key: 'resource_type', label: 'Resource Type', render: (v) => (
      <span className="text-sm text-gray-600 capitalize">{(v || '').replace(/_/g, ' ')}</span>
    )},
    { key: 'resource_id', label: 'Resource', render: (v) => (
      <span className="font-mono text-sm text-gray-500">{v || '-'}</span>
    )},
    { key: 'description', label: 'Description', render: (v) => (
      <span className="text-sm text-gray-600">{v || '-'}</span>
    )},
    { key: 'ip_address', label: 'IP', render: (v) => (
      <span className="font-mono text-xs text-gray-400">{v || '-'}</span>
    )},
    { key: 'created_at', label: 'Date', sortable: true, render: (v) => (
      <span className="text-sm text-gray-500">{v ? new Date(v).toLocaleString() : '-'}</span>
    )},
  ]

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Audit Logs</h1>

      <DataTable
        columns={columns}
        data={logs}
        totalItems={total}
        page={page}
        onPageChange={setPage}
        loading={loading}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={(key, order) => { setSortBy(key); setSortOrder(order) }}
        filters={{
          search: filters.search,
          extra: (
            <>
              <select
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                className="rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              >
                <option value="">All Actions</option>
                <option value="create">Create</option>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
                <option value="login">Login</option>
                <option value="logout">Logout</option>
                <option value="assign">Assign</option>
                <option value="status_change">Status Change</option>
              </select>
              <select
                value={filters.resource}
                onChange={(e) => setFilters({ ...filters, resource: e.target.value })}
                className="rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              >
                <option value="">All Resources</option>
                <option value="user">User</option>
                <option value="order">Order</option>
                <option value="product">Product</option>
                <option value="commission">Commission</option>
                <option value="ticket">Ticket</option>
                <option value="payment">Payment</option>
                <option value="role">Role</option>
              </select>
            </>
          ),
        }}
        onFilterChange={(f) => { setFilters({ ...filters, search: f.search }); setPage(1) }}
      />
    </div>
  )
}
