import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { cartAPI, ordersAPI, addressesAPI, paymentsAPI } from '../services/api'
import { useAuth } from '../store/authStore'
import { useToast } from '../components/ui/Toast'
import Stepper from '../components/ui/Stepper'

const STEPS = [
  { title: 'Shipping', description: 'Delivery address' },
  { title: 'Payment', description: 'Bank transfer' },
  { title: 'Review', description: 'Confirm order' },
  { title: 'Receipt', description: 'Upload payment' },
]

export default function CheckoutPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()
  const [cart, setCart] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [addresses, setAddresses] = useState([])
  const [selectedAddressId, setSelectedAddressId] = useState(null)
  const [receiptFile, setReceiptFile] = useState(null)
  const [orderId, setOrderId] = useState(null)
  const [orderNumber, setOrderNumber] = useState('')

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    region: '',
    postcode: '',
    country: 'New Zealand',
    notes: '',
  })

  useEffect(() => {
    cartAPI.get()
      .then((res) => {
        const cartData = res.data.data
        setCart(cartData)
        if (!cartData?.items?.length) {
          navigate('/cart')
        }
      })
      .catch(() => navigate('/cart'))
      .finally(() => setLoading(false))

    addressesAPI.list()
      .then((res) => setAddresses(res.data.data || []))
      .catch(() => {})
  }, [navigate])

  useEffect(() => {
    if (selectedAddressId && addresses.length) {
      const addr = addresses.find((a) => a.id === selectedAddressId)
      if (addr) {
        setForm({
          name: addr.name || user?.name || '',
          email: addr.email || user?.email || '',
          phone: addr.phone || '',
          address_line1: addr.line1 || '',
          address_line2: addr.line2 || '',
          city: addr.city || '',
          region: addr.region || '',
          postcode: addr.postcode || '',
          country: addr.country || 'New Zealand',
          notes: '',
        })
      }
    }
  }, [selectedAddressId, addresses, user])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const items = cart?.items || []
  const subtotal = items.reduce((sum, item) => {
    const price = item.variant?.price || item.product?.price || 0
    return sum + price * item.quantity
  }, 0) / 100
  const gst = subtotal * 0.15
  const total = subtotal + gst

  const handlePlaceOrder = async () => {
    setSubmitting(true)
    try {
      const res = await ordersAPI.create({
        shipping_address: {
          name: form.name,
          email: form.email,
          phone: form.phone,
          line1: form.address_line1,
          line2: form.address_line2,
          city: form.city,
          region: form.region,
          postcode: form.postcode,
          country: form.country,
        },
        notes: form.notes,
      })
      const orderData = res.data.data
      setOrderId(orderData?.id)
      setOrderNumber(orderData?.order_number || orderData?.id || '')
      setCurrentStep(4)
      toast.success('Order placed successfully!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place order')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUploadReceipt = async () => {
    if (!receiptFile || !orderId) return
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('file', receiptFile)
      fd.append('order_id', orderId)
      await paymentsAPI.uploadReceipt(fd)
      toast.success('Payment receipt uploaded!')
      navigate('/me/orders')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload receipt')
    } finally {
      setSubmitting(false)
    }
  }

  const canProceedStep1 = form.name && form.email && form.address_line1 && form.city && form.postcode

  if (loading) {
    return (
      <div className="container-custom py-8">
        <div className="animate-pulse space-y-4 max-w-2xl mx-auto">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-96 bg-gray-200 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="container-custom py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Checkout</h1>

      <div className="mb-8">
        <Stepper steps={STEPS} currentStep={currentStep} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {currentStep === 1 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Shipping Address</h2>

              {addresses.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select a saved address</label>
                  <div className="space-y-2">
                    {addresses.map((addr) => (
                      <label
                        key={addr.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedAddressId === addr.id ? 'border-primary bg-purple-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="saved_address"
                          checked={selectedAddressId === addr.id}
                          onChange={() => setSelectedAddressId(addr.id)}
                          className="mt-1 text-primary focus:ring-primary"
                        />
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">{addr.name || 'Address'}</p>
                          <p className="text-gray-600">
                            {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}, {addr.city} {addr.postcode}
                          </p>
                          {addr.phone && <p className="text-gray-500">{addr.phone}</p>}
                        </div>
                      </label>
                    ))}
                    <label
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedAddressId === 'new' ? 'border-primary bg-purple-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="saved_address"
                        checked={selectedAddressId === 'new' || !selectedAddressId}
                        onChange={() => setSelectedAddressId('new')}
                        className="mt-1 text-primary focus:ring-primary"
                      />
                      <span className="text-sm font-medium text-gray-700">Use a new address</span>
                    </label>
                  </div>
                </div>
              )}

              {(selectedAddressId === 'new' || !selectedAddressId || addresses.length === 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      className="input-field min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                      className="input-field min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      name="phone"
                      type="tel"
                      value={form.phone}
                      onChange={handleChange}
                      className="input-field min-h-[44px]"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1 *</label>
                    <input
                      name="address_line1"
                      value={form.address_line1}
                      onChange={handleChange}
                      required
                      className="input-field min-h-[44px]"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
                    <input
                      name="address_line2"
                      value={form.address_line2}
                      onChange={handleChange}
                      className="input-field min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                    <input
                      name="city"
                      value={form.city}
                      onChange={handleChange}
                      required
                      className="input-field min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Region / State</label>
                    <input
                      name="region"
                      value={form.region}
                      onChange={handleChange}
                      className="input-field min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Postcode *</label>
                    <input
                      name="postcode"
                      value={form.postcode}
                      onChange={handleChange}
                      required
                      className="input-field min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
                    <input
                      name="country"
                      value={form.country}
                      onChange={handleChange}
                      required
                      className="input-field min-h-[44px]"
                    />
                  </div>
                </div>
              )}

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Order Notes (optional)</label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  rows={3}
                  className="input-field"
                  placeholder="Any special instructions..."
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Payment Method</h2>
              <div className="bg-blue-50 rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Bank Transfer</h3>
                    <p className="text-sm text-gray-500">Direct bank deposit</p>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <h4 className="font-medium text-gray-900 mb-3">Transfer Instructions</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Bank:</span>
                      <span className="font-medium text-gray-900">NZ Fursuit Bank</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Account:</span>
                      <span className="font-medium text-gray-900">12-3456-7890123-00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Reference:</span>
                      <span className="font-medium text-gray-900">{orderNumber || '[Order Number - shown after placing order]'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Amount:</span>
                      <span className="font-bold text-primary">${total.toFixed(2)} NZD</span>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 rounded-lg p-4 text-sm text-amber-800">
                  <p className="font-medium mb-1">Important:</p>
                  <p>Please include your order number as the payment reference. Your order will be confirmed once payment is received.</p>
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span className="font-medium text-gray-900">GST Breakdown</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Subtotal (incl. GST):</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">GST (15%):</span>
                      <span>${gst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Total (incl. GST):</span>
                      <span className="text-primary">${total.toFixed(2)} NZD</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Review Your Order</h2>

              <div className="space-y-4 mb-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Shipping To</h3>
                  <div className="bg-gray-50 rounded-lg p-3 text-sm">
                    <p className="font-medium">{form.name}</p>
                    <p className="text-gray-600">{form.address_line1}{form.address_line2 ? `, ${form.address_line2}` : ''}</p>
                    <p className="text-gray-600">{form.city}, {form.region} {form.postcode}</p>
                    <p className="text-gray-600">{form.country}</p>
                    {form.phone && <p className="text-gray-500 mt-1">Ph: {form.phone}</p>}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Payment Method</h3>
                  <div className="bg-gray-50 rounded-lg p-3 text-sm">
                    <p className="font-medium">Bank Transfer</p>
                    <p className="text-gray-600">NZ Fursuit Bank - 12-3456-7890123-00</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Items</h3>
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                        <div className="w-12 h-12 bg-gray-200 rounded overflow-hidden shrink-0">
                          <img
                            src={item.product?.image_url || item.product?.images?.[0] || '/placeholder.png'}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.product?.name}</p>
                          {item.variant && <p className="text-xs text-gray-500">{item.variant.name}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-medium">${(((item.variant?.price || item.product?.price || 0) * item.quantity) / 100).toFixed(2)}</p>
                          <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {form.notes && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm mb-4">
                  <p className="font-medium text-gray-700 mb-1">Order Notes:</p>
                  <p className="text-gray-600">{form.notes}</p>
                </div>
              )}
            </div>
          )}

          {currentStep === 4 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Upload Payment Receipt</h2>
              <p className="text-sm text-gray-600 mb-4">
                Upload your bank transfer receipt to confirm your payment. This helps us process your order faster.
              </p>

              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-primary transition-colors">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="receipt-upload"
                />
                <label htmlFor="receipt-upload" className="cursor-pointer">
                  <div className="text-4xl mb-2">📄</div>
                  <p className="text-gray-600 font-medium">Click to upload receipt</p>
                  <p className="text-gray-400 text-sm mt-1">PNG, JPG, or PDF up to 5MB</p>
                </label>
              </div>

              {receiptFile && (
                <div className="mt-4 flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2">
                    <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-gray-700">{receiptFile.name}</span>
                  </div>
                  <button
                    onClick={() => setReceiptFile(null)}
                    className="text-red-500 hover:text-red-700 text-sm min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    Remove
                  </button>
                </div>
              )}

              <div className="bg-blue-50 rounded-lg p-4 mt-4 text-sm">
                <p className="font-medium text-blue-900 mb-1">Transfer Details Reminder</p>
                <p className="text-blue-800">
                  Bank: NZ Fursuit Bank | Account: 12-3456-7890123-00 | Reference: {orderNumber}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
            <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
            <div className="space-y-3 mb-4">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-600 truncate mr-2">
                    {item.product?.name} × {item.quantity}
                  </span>
                  <span className="shrink-0">
                    ${(((item.variant?.price || item.product?.price || 0) * item.quantity) / 100).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            <hr className="my-4" />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">GST (15%)</span>
                <span>${gst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span className="text-gray-500">TBD</span>
              </div>
              <hr />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary">${total.toFixed(2)} NZD</span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {currentStep > 1 && currentStep < 4 && (
                <button
                  onClick={() => setCurrentStep((s) => s - 1)}
                  className="w-full btn-outline btn-sm"
                >
                  Back
                </button>
              )}

              {currentStep === 1 && (
                <button
                  onClick={() => setCurrentStep(2)}
                  disabled={!canProceedStep1}
                  className="w-full btn-primary"
                >
                  Continue to Payment
                </button>
              )}

              {currentStep === 2 && (
                <button
                  onClick={() => setCurrentStep(3)}
                  className="w-full btn-primary"
                >
                  Review Order
                </button>
              )}

              {currentStep === 3 && (
                <button
                  onClick={handlePlaceOrder}
                  disabled={submitting}
                  className="w-full btn-accent"
                >
                  {submitting ? 'Placing Order...' : 'Place Order'}
                </button>
              )}

              {currentStep === 4 && (
                <>
                  <button
                    onClick={handleUploadReceipt}
                    disabled={!receiptFile || submitting}
                    className="w-full btn-primary disabled:opacity-50"
                  >
                    {submitting ? 'Uploading...' : 'Submit Receipt & Complete'}
                  </button>
                  <button
                    onClick={() => navigate('/me/orders')}
                    className="w-full btn-outline btn-sm"
                  >
                    Skip for now
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
