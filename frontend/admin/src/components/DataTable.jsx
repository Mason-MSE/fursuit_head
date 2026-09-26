import { useState, useMemo } from 'react'

export default function DataTable({
  columns,
  data = [],
  totalItems = 0,
  page = 1,
  pageSize = 10,
  onPageChange,
  onSort,
  sortBy,
  sortOrder,
  loading = false,
  filters,
  onFilterChange,
  actions,
}) {
  const [localSearch, setLocalSearch] = useState(filters?.search || '')

  const handleSearch = (e) => {
    setLocalSearch(e.target.value)
    if (onFilterChange) onFilterChange({ ...filters, search: e.target.value })
  }

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  const handleSort = (key) => {
    if (!onSort) return
    const next = sortBy === key && sortOrder === 'asc' ? 'desc' : 'asc'
    onSort(key, next)
  }

  return (
    <div className="overflow-hidden rounded-lg bg-white shadow">
      {filters && (
        <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
          <input
            type="text"
            placeholder="Search..."
            value={localSearch}
            onChange={handleSearch}
            className="rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          {filters.extra}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 ${col.sortable ? 'cursor-pointer select-none hover:text-gray-700' : ''}`}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {sortBy === col.key && (
                      <span>{sortOrder === 'asc' ? '\u2191' : '\u2193'}</span>
                    )}
                  </span>
                </th>
              ))}
              {actions && <th className="px-4 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="px-4 py-12 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="px-4 py-12 text-center text-gray-400">
                  No data found
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr key={row.id || i} className="hover:bg-gray-50">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {actions.map((action, ai) => {
                          const label = typeof action.label === 'function' ? action.label(row) : action.label
                          const cls = typeof action.className === 'function' ? action.className(row) : action.className
                          return (
                            <button
                              key={ai}
                              onClick={() => action.onClick(row)}
                              className={`rounded px-2 py-1 text-xs font-medium ${cls || 'text-primary-600 hover:bg-primary-50'}`}
                            >
                              {label}
                            </button>
                          )
                        })}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t px-4 py-3">
          <span className="text-sm text-gray-500">
            Showing {Math.min((page - 1) * pageSize + 1, totalItems)} to{' '}
            {Math.min(page * pageSize, totalItems)} of {totalItems}
          </span>
          <div className="flex gap-1">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange?.(page - 1)}
              className="rounded border px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-40"
            >
              Prev
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let p = i + 1
              if (totalPages > 5) {
                p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
              }
              return (
                <button
                  key={p}
                  onClick={() => onPageChange?.(p)}
                  className={`rounded border px-3 py-1 text-sm ${p === page ? 'bg-primary-600 text-white' : 'hover:bg-gray-50'}`}
                >
                  {p}
                </button>
              )
            })}
            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange?.(page + 1)}
              className="rounded border px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
