import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { commissionsAPI } from '../services/api'
import StatusChip from '../components/StatusChip'
import Timeline from '../components/Timeline'

export default function MyCommissionsPage() {
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
      <div className="container-custom py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container-custom py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Commissions</h1>
        <Link to="/me/commissions/new" className="btn-accent btn-sm">
          + New Commission
        </Link>
      </div>

      {commissions.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-6xl mb-4">🎨</p>
          <h2 className="text-xl font-semibold mb-2">No commissions yet</h2>
          <p className="text-gray-500 mb-6">Start a custom commission to bring your fursona to life!</p>
          <Link to="/me/commissions/new" className="btn-accent">Start a Commission</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {commissions.map((commission) => (
            <div key={commission.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <button
                onClick={() => setExpandedCommission(expandedCommission === commission.id ? null : commission.id)}
                className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 hover:bg-gray-50 transition-colors text-left min-h-[44px]"
              >
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-gray-900">{commission.character_name || 'Commission'}</h3>
                    <StatusChip status={commission.status} />
                  </div>
                  <p className="text-sm text-gray-500">
                    Submitted {new Date(commission.created_at).toLocaleDateString('en-NZ', {
                      year: 'numeric', month: 'long', day: 'numeric',
                    })}
                  </p>
                  {commission.style && (
                    <p className="text-sm text-gray-600 mt-1">
                      Style: {commission.style} · Size: {commission.size || 'TBD'}
                    </p>
                  )}
                  {commission.budget && (
                    <p className="text-sm text-gray-600">
                      Budget: ${(commission.budget / 100).toFixed(2)} NZD
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <svg className={`h-5 w-5 text-gray-400 transition-transform ${expandedCommission === commission.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {expandedCommission === commission.id && (
                <div className="border-t border-gray-100 p-6 space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Species:</span>
                      <p className="font-medium">{commission.species || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Size:</span>
                      <p className="font-medium">{commission.size || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Style:</span>
                      <p className="font-medium">{commission.style || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Budget:</span>
                      <p className="font-medium">{commission.budget ? `$${(commission.budget / 100).toFixed(2)} NZD` : '-'}</p>
                    </div>
                  </div>

                  {commission.character_description && (
                    <div>
                      <span className="text-sm text-gray-500">Description:</span>
                      <p className="text-sm font-medium mt-1">{commission.character_description}</p>
                    </div>
                  )}

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

                  <div className="flex gap-3 pt-2">
                    <Link
                      to={`/me/commissions/${commission.id}`}
                      className="btn-outline btn-sm"
                    >
                      View Full Details
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
