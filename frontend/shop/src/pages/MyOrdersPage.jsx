import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { ordersAPI } from '../services/api'
import StatusChip from '../components/StatusChip'
import Timeline from '../components/Timeline'

export default function MyOrdersPage() {
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
        <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
        <Link to="/products" className="btn-primary btn-sm">
          Shop
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-6xl mb-4">📦</p>
          <h2 className="text-xl font-semibold mb-2">No orders yet</h2>
          <p className="text-gray-500 mb-6">When you place an order, it will appear here.</p>
          <Link to="/products" className="btn-primary">Start Shopping</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <button
                onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 hover:bg-gray-50 transition-colors text-left min-h-[44px]"
              >
                <div>
                  <p className="font-semibold text-gray-900">Order #{order.order_number || order.id}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(order.created_at).toLocaleDateString('en-NZ', {
                      year: 'numeric', month: 'long', day: 'numeric',
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusChip status={order.status} />
                  <span className="font-semibold text-primary">
                    ${(order.total_cents / 100).toFixed(2)} NZD
                  </span>
                  <svg className={`h-5 w-5 text-gray-400 transition-transform ${expandedOrder === order.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {expandedOrder === order.id && (
                <div className="border-t border-gray-100 p-6 space-y-4">
                  {order.items && (
                    <div className="flex flex-wrap gap-2">
                      {order.items.map((item, i) => (
                        <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 text-sm">
                          <div className="w-8 h-8 bg-gray-200 rounded overflow-hidden">
                            <img
                              src={item.product?.image_url || item.product?.images?.[0] || '/placeholder.png'}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <span className="text-gray-700">{item.product_name || 'Product'}</span>
                          <span className="text-gray-400">×{item.quantity}</span>
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
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
