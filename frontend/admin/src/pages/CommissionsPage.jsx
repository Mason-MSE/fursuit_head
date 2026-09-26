import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { commissionsAPI } from '../services/api'
import StatusBadge from '../components/StatusBadge'

const KANBAN_COLUMNS = [
  { key: 'submitted', label: 'Submitted' },
  { key: 'reviewing', label: 'Reviewing' },
  { key: 'quoted', label: 'Quoted' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'final_review', label: 'Final Review' },
  { key: 'completed', label: 'Completed' },
]

export default function CommissionsPage() {
  const navigate = useNavigate()
  const [commissions, setCommissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('kanban')
  const [search, setSearch] = useState('')

  const fetchCommissions = async () => {
    setLoading(true)
    try {
      const { data } = await commissionsAPI.list({
        per_page: 100,
        search: search || undefined,
      })
      setCommissions(data.data || [])
    } catch {
      setCommissions([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCommissions() }, [search])

  const getCommissionsByStatus = (status) => {
    return commissions.filter((c) => c.status === status)
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-gray-400">Loading commissions...</div>
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Commissions</h1>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search commissions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
          />
          <div className="flex rounded-lg border">
            <button
              onClick={() => setView('kanban')}
              className={`rounded-l-lg px-3 py-2 text-sm ${view === 'kanban' ? 'bg-primary-600 text-white' : 'hover:bg-gray-50'}`}
            >
              Board
            </button>
            <button
              onClick={() => setView('list')}
              className={`rounded-r-lg px-3 py-2 text-sm ${view === 'list' ? 'bg-primary-600 text-white' : 'hover:bg-gray-50'}`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {view === 'kanban' ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map((col) => {
            const items = getCommissionsByStatus(col.key)
            return (
              <div key={col.key} className="min-w-[280px] flex-1">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700">{col.label}</h3>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {items.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {items.map((commission) => (
                    <div
                      key={commission.id}
                      onClick={() => navigate(`/commissions/${commission.id}`)}
                      className="cursor-pointer rounded-lg border bg-white p-4 shadow-sm transition hover:shadow-md"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-medium text-primary-600">
                          #{commission.commission_number || commission.id}
                        </span>
                        <StatusBadge status={commission.status} />
                      </div>
                      <p className="mb-2 text-sm font-medium text-gray-900">
                        {commission.character?.name || commission.type || 'Commission'}
                      </p>
                      <p className="mb-2 text-xs text-gray-500 line-clamp-2">
                        {commission.description || 'No description'}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>{commission.client?.name || commission.user?.name || 'Unknown'}</span>
                        {commission.price && (
                          <span className="font-medium text-gray-700">${commission.price}</span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-gray-400">
                          {commission.maker?.name || 'Unassigned'}
                        </span>
                        {commission.created_at && (
                          <span className="text-xs text-gray-400">
                            {new Date(commission.created_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div className="rounded-lg border-2 border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
                      No commissions
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Commission #</th>
                <th className="px-4 py-3">Character</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Maker</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {commissions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">No commissions found</td>
                </tr>
              ) : (
                commissions.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-primary-600">#{c.commission_number || c.id}</span>
                    </td>
                    <td className="px-4 py-3">{c.character?.name || c.type || '-'}</td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-3">{c.maker?.name || 'Unassigned'}</td>
                    <td className="px-4 py-3">{c.client?.name || c.user?.name || '-'}</td>
                    <td className="px-4 py-3 font-medium">{c.price ? `$${c.price}` : '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{c.created_at ? new Date(c.created_at).toLocaleDateString() : '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => navigate(`/commissions/${c.id}`)} className="text-sm text-primary-600 hover:underline">View</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
