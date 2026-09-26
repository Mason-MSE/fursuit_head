import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ordersAPI } from '../services/api'
import DataTable from '../components/DataTable'
import StatusBadge from '../components/StatusBadge'

export default function OrdersPage() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ search: '', status: '' })
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('desc')

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const { data } = await ordersAPI.list({
        page,
        per_page: 10,
        search: filters.search || undefined,
        status: filters.status || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      })
      setOrders(data.data || [])
      setTotal(data.meta?.total || 0)
    } catch {
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchOrders() }, [page, filters, sortBy, sortOrder])

  const statusOptions = ['', 'awaiting_payment', 'paid', 'processing', 'ready_to_ship', 'shipped', 'delivered', 'completed', 'cancelled']

  const columns = [
    { key: 'order_number', label: 'Order #', sortable: true, render: (v, row) => (
      <span className="font-medium text-primary-600">#{v || row.id}</span>
    )},
    { key: 'customer', label: 'Customer', render: (v, row) => (
      <span className="text-gray-900">{v?.name || row.user?.name || row.customer_name || '-'}</span>
    )},
    { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
    { key: 'total', label: 'Total', sortable: true, render: (v) => (
      <span className="font-medium text-gray-900">${v || 0}</span>
    )},
    { key: 'items_count', label: 'Items', render: (v, row) => (
      <span className="text-gray-500">{v || row.items?.length || 0}</span>
    )},
    { key: 'created_at', label: 'Date', sortable: true, render: (v) => (
      <span className="text-gray-500">{v ? new Date(v).toLocaleDateString() : '-'}</span>
    )},
  ]

  const actions = [
    { label: 'View', onClick: (row) => navigate(`/orders/${row.id}`) },
  ]

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Orders</h1>

      <DataTable
        columns={columns}
        data={orders}
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
    </div>
  )
}
