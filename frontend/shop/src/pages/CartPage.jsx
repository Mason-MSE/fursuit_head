import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { cartAPI } from '../services/api'

export default function CartPage() {
  const navigate = useNavigate()
  const [cart, setCart] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)

  useEffect(() => {
    loadCart()
  }, [])

  const loadCart = async () => {
    setLoading(true)
    try {
      const res = await cartAPI.get()
      setCart(res.data.data)
    } catch {
      setCart({ items: [] })
    } finally {
      setLoading(false)
    }
  }

  const updateQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1) return
    setUpdating(itemId)
    try {
      await cartAPI.updateItem(itemId, { quantity: newQuantity })
      await loadCart()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update')
    } finally {
      setUpdating(null)
    }
  }

  const removeItem = async (itemId) => {
    setUpdating(itemId)
    try {
      await cartAPI.removeItem(itemId)
      await loadCart()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove')
    } finally {
      setUpdating(null)
    }
  }

  const items = cart?.items || []
  const subtotal = items.reduce((sum, item) => {
    const price = item.variant?.price || item.product?.price || 0
    return sum + price * item.quantity
  }, 0) / 100
  const gst = subtotal * 0.15
  const total = subtotal + gst

  if (loading) {
    return (
      <div className="container-custom py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container-custom py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>

      {items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-6xl mb-4">🛒</p>
          <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
          <p className="text-gray-500 mb-6">Add some items to get started!</p>
          <Link to="/products" className="btn-primary">Browse Shop</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div key={item.id} className="bg-white rounded-xl shadow-sm p-4 flex gap-4">
                <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                  <img
                    src={item.product?.image_url || item.product?.images?.[0] || '/placeholder.png'}
                    alt={item.product?.name || 'Product'}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-gray-900 truncate">{item.product?.name}</h3>
                      {item.variant && (
                        <p className="text-sm text-gray-500">{item.variant.name}</p>
                      )}
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      disabled={updating === item.id}
                      className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={updating === item.id || item.quantity <= 1}
                        className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center text-sm hover:bg-gray-50 disabled:opacity-50"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={updating === item.id}
                        className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center text-sm hover:bg-gray-50 disabled:opacity-50"
                      >
                        +
                      </button>
                    </div>
                    <p className="font-semibold text-primary">
                      ${(((item.variant?.price || item.product?.price || 0) * item.quantity) / 100).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
              <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal ({items.length} items)</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">GST (15%)</span>
                  <span>${gst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="text-gray-500">Calculated at checkout</span>
                </div>
                <hr />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">${total.toFixed(2)} NZD</span>
                </div>
              </div>
              <button
                onClick={() => navigate('/checkout')}
                className="w-full btn-primary mt-6"
              >
                Proceed to Checkout
              </button>
              <Link to="/products" className="block text-center text-sm text-primary hover:text-primary-dark mt-3">
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
