import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ordersAPI } from '../services/api'
import StatusBadge from '../components/StatusBadge'
import Modal from '../components/Modal'

export default function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [shipModal, setShipModal] = useState(false)
  const [tracking, setTracking] = useState('')
  const [carrier, setCarrier] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const fetchOrder = async () => {
    try {
      const { data } = await ordersAPI.get(id)
      setOrder(data.data)
    } catch (err) { setError(err.response?.data?.error?.message || "Request failed. Please retry.") } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchOrder() }, [id])

  const handleShip = async () => {
    try {
      await ordersAPI.updateStatus(id, { status: 'shipped', tracking_number: tracking, reason: carrier })
      setShipModal(false)
      fetchOrder()
    } catch (err) { setError(err.response?.data?.error?.message || "Request failed. Please retry.") }
  }

  const transition = async (status) => {
    setBusy(true); setError('')
    try { await ordersAPI.updateStatus(id, { status }); await fetchOrder() }
    catch (err) { setError(err.response?.data?.error?.message || 'Update failed') }
    finally { setBusy(false) }
  }

  if (loading) return <div className="py-20 text-center text-gray-400">Loading...</div>
  if (!order) return <div className="py-20 text-center text-red-400">Order not found</div>

  const inputCls = 'w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none'

  return (
    <div>
      {error && <p role="alert" className="mb-4 text-red-700">{error}</p>}
<div className="mb-6 flex items-center gap-4">
        <button onClick={() => navigate('/orders')} className="text-gray-400 hover:text-gray-600">&larr; Back</button>
        <h1 className="text-2xl font-bold text-gray-900">Order #{order.order_number || order.id}</h1>
        <StatusBadge status={order.status} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Order info */}
        <div className="rounded-xl bg-white p-6 shadow lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold">Order Details</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-gray-500">Customer</p><p className="font-medium">{order.customer?.name || order.user?.name || '-'}</p></div>
            <div><p className="text-gray-500">Email</p><p className="font-medium">{order.customer?.email || order.user?.email || '-'}</p></div>
            <div><p className="text-gray-500">Date</p><p className="font-medium">{order.created_at ? new Date(order.created_at).toLocaleString() : '-'}</p></div>
            <div><p className="text-gray-500">Payment</p><p className="font-medium capitalize">{order.payment_status || '-'}</p></div>
          </div>

          <div className="mt-6">
            <h3 className="mb-3 text-sm font-semibold text-gray-500">Items</h3>
            <div className="divide-y rounded-lg border">
              {(order.items || []).map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3">
                  <div>
                    <p className="text-sm font-medium">{item.product_name}</p>
                    <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                  </div>
                  <span className="text-sm font-medium">${((item.total_cents || 0) / 100).toFixed(2)}</span>
                </div>
              ))}
              {(!order.items || order.items.length === 0) && (
                <p className="p-3 text-center text-sm text-gray-400">No items</p>
              )}
            </div>
            <div className="mt-3 flex justify-between rounded-lg bg-gray-50 p-3">
              <span className="text-sm font-semibold">Total</span>
              <span className="text-lg font-bold text-primary-600">${((order.total_cents || 0) / 100).toFixed(2)} {order.currency}</span>
            </div>
          </div>
        </div>

        {/* Status & Actions */}
        <div className="space-y-6">
          <div className="rounded-xl bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold">Actions</h2>
            <div className="space-y-3">
              {(order.allowed_actions || []).filter(action => action !== 'shipped').map(action => <button key={action} disabled={busy} onClick={() => transition(action)} className="w-full rounded-lg border py-2">Move to {action.replaceAll('_', ' ')}</button>)}
              {order.allowed_actions?.includes('shipped') && (
                <button onClick={() => setShipModal(true)} className="w-full rounded-lg bg-primary-600 py-2 text-sm font-medium text-white hover:bg-primary-700">
                  Ship Order
                </button>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-xl bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold">Status Timeline</h2>
            <div className="space-y-4">
              {(order.timeline || order.history || []).map((event, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="h-3 w-3 rounded-full bg-primary-600" />
                    {i < (order.timeline || order.history || []).length - 1 && <div className="w-px flex-1 bg-gray-200" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium capitalize">{event.to_status || event.status || event.action}</p>
                    <p className="text-xs text-gray-400">{event.time || event.created_at ? new Date(event.time || event.created_at).toLocaleString() : ''}</p>
                  </div>
                </div>
              ))}
              {(!order.timeline || order.timeline.length === 0) && (!order.history || order.history.length === 0) && (
                <p className="text-sm text-gray-400">No timeline events</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={shipModal}
        onClose={() => setShipModal(false)}
        title="Ship Order"
        footer={
          <>
            <button onClick={() => setShipModal(false)} className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">Cancel</button>
            <button onClick={handleShip} className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700">Confirm Shipment</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Carrier</label>
            <input value={carrier} onChange={(e) => setCarrier(e.target.value)} className={inputCls} placeholder="e.g. FedEx, UPS, USPS" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Tracking Number</label>
            <input value={tracking} onChange={(e) => setTracking(e.target.value)} className={inputCls} placeholder="Tracking number" />
          </div>
        </div>
      </Modal>
    </div>
  )
}
