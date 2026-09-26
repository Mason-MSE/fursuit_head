import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ticketsAPI } from '../services/api'
import DataTable from '../components/DataTable'
import StatusBadge from '../components/StatusBadge'

export default function TicketsPage() {
  const navigate = useNavigate()
  const [tickets, setTickets] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ search: '', status: '', priority: '' })
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('desc')

  const fetchTickets = async () => {
    setLoading(true)
    try {
      const { data } = await ticketsAPI.list({
        page,
        per_page: 10,
        search: filters.search || undefined,
        status: filters.status || undefined,
        priority: filters.priority || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      })
      setTickets(data.data || [])
      setTotal(data.meta?.total || 0)
    } catch {
      setTickets([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTickets() }, [page, filters, sortBy, sortOrder])

  const columns = [
    { key: 'ticket_number', label: 'Ticket #', sortable: true, render: (v, row) => (
      <span className="font-medium text-primary-600">#{v || row.id}</span>
    )},
    { key: 'subject', label: 'Subject', sortable: true, render: (v) => (
      <span className="font-medium text-gray-900">{v}</span>
    )},
    { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
    { key: 'priority', label: 'Priority', render: (v) => <StatusBadge status={v} /> },
    { key: 'assignee', label: 'Assigned To', render: (v) => (
      <span className="text-gray-600">{v?.name || v || 'Unassigned'}</span>
    )},
    { key: 'created_at', label: 'Created', sortable: true, render: (v) => (
      <span className="text-gray-500">{v ? new Date(v).toLocaleDateString() : '-'}</span>
    )},
  ]

  const actions = [
    { label: 'View', onClick: (row) => navigate(`/tickets/${row.id}`) },
  ]

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Tickets</h1>

      <DataTable
        columns={columns}
        data={tickets}
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
