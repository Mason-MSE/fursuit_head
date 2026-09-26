import { useState, useEffect } from 'react'
import { paymentsAPI } from '../services/api'
import DataTable from '../components/DataTable'
import StatusBadge from '../components/StatusBadge'
import Modal from '../components/Modal'

export default function PaymentsPage() {
  const [payments, setPayments] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ search: '', status: '' })
  const [receiptModal, setReceiptModal] = useState({ open: false, payment: null, url: null })
  const [confirmModal, setConfirmModal] = useState({ open: false, payment: null })
  const [rejectModal, setRejectModal] = useState({ open: false, payment: null })
  const [confirmNotes, setConfirmNotes] = useState('')
  const [rejectReason, setRejectReason] = useState('')

  const fetchPayments = async () => {
    setLoading(true)
    try {
      const { data } = await paymentsAPI.list({
        page,
        per_page: 10,
        search: filters.search || undefined,
        status: filters.status || undefined,
      })
      setPayments(data.data || [])
      setTotal(data.meta?.total || 0)
    } catch {
      setPayments([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPayments() }, [page, filters])

  const handleConfirm = async () => {
    if (!confirmModal.payment) return
    try {
      await paymentsAPI.confirm(confirmModal.payment.id, { notes: confirmNotes })
      setConfirmModal({ open: false, payment: null })
      setConfirmNotes('')
      fetchPayments()
    } catch {}
  }

  const handleReject = async () => {
    if (!rejectModal.payment) return
    try {
      await paymentsAPI.reject(rejectModal.payment.id, { reason: rejectReason })
      setRejectModal({ open: false, payment: null })
      setRejectReason('')
      fetchPayments()
    } catch {}
  }

  const viewReceipt = async (payment) => {
    try {
      const { data } = await paymentsAPI.receipt(payment.id)
      const url = URL.createObjectURL(new Blob([data]))
      setReceiptModal({ open: true, payment, url })
    } catch {
      setReceiptModal({ open: true, payment, url: null })
    }
  }

  const hasAmountMismatch = (payment) => {
    return payment.status === 'amount_mismatch' || (
      payment.amount && payment.order?.total &&
      Math.abs(parseFloat(payment.amount) - parseFloat(payment.order.total)) > 0.01
    )
  }

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'completed', label: 'Completed' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'amount_mismatch', label: 'Amount Mismatch' },
  ]

  const columns = [
    { key: 'id', label: 'Payment ID', render: (v) => <span className="font-mono text-sm text-gray-600">#{v}</span> },
    { key: 'order', label: 'Order', render: (v, row) => (
      <span className="font-medium text-primary-600">#{v?.order_number || row.order_id || '-'}</span>
    )},
    { key: 'amount', label: 'Amount', render: (v, row) => (
      <div className="flex items-center gap-2">
        <span className="font-medium text-gray-900">${v || 0}</span>
        {hasAmountMismatch(row) && (
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            Mismatch
          </span>
        )}
      </div>
    )},
    { key: 'method', label: 'Method', render: (v) => <span className="capitalize">{v || '-'}</span> },
    { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
    { key: 'created_at', label: 'Date', render: (v) => (
      <span className="text-gray-500">{v ? new Date(v).toLocaleDateString() : '-'}</span>
    )},
    { key: 'receipt', label: 'Receipt', render: (v, row) => (
      <button onClick={() => viewReceipt(row)} className="text-sm text-primary-600 hover:underline">Preview</button>
    )},
  ]

  const actions = [
    {
      label: 'Confirm',
      onClick: (row) => { setConfirmNotes(''); setConfirmModal({ open: true, payment: row }) },
      className: 'text-green-600 hover:bg-green-50',
    },
    {
      label: 'Reject',
      onClick: (row) => { setRejectReason(''); setRejectModal({ open: true, payment: row }) },
      className: 'text-red-600 hover:bg-red-50',
    },
  ]

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Payments</h1>

      <DataTable
        columns={columns}
        data={payments}
        totalItems={total}
        page={page}
        onPageChange={setPage}
        loading={loading}
        filters={filters}
        onFilterChange={(f) => { setFilters(f); setPage(1) }}
        actions={actions}
      />

      <Modal
        open={confirmModal.open}
        onClose={() => { setConfirmModal({ open: false, payment: null }); setConfirmNotes('') }}
        title="Confirm Payment"
        footer={<>
          <button onClick={() => { setConfirmModal({ open: false, payment: null }); setConfirmNotes('') }} className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={handleConfirm} className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700">Confirm Payment</button>
        </>}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Confirm payment of <strong>${confirmModal.payment?.amount}</strong> for order #{confirmModal.payment?.order?.order_number || confirmModal.payment?.order_id}?
          </p>
          {hasAmountMismatch(confirmModal.payment) && (
            <div className="rounded-lg bg-orange-50 p-3 text-sm text-orange-700">
              Warning: Payment amount (${confirmModal.payment?.amount}) differs from order total (${confirmModal.payment?.order?.total || 'N/A'})
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Notes (optional)</label>
            <textarea
              value={confirmNotes}
              onChange={(e) => setConfirmNotes(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              rows={3}
              placeholder="Add confirmation notes..."
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={rejectModal.open}
        onClose={() => { setRejectModal({ open: false, payment: null }); setRejectReason('') }}
        title="Reject Payment"
        footer={<>
          <button onClick={() => { setRejectModal({ open: false, payment: null }); setRejectReason('') }} className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={handleReject} className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700">Reject Payment</button>
        </>}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Reject payment of <strong>${rejectModal.payment?.amount}</strong>?
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Reason</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              rows={3}
              placeholder="Reason for rejection..."
              required
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={receiptModal.open}
        onClose={() => { if (receiptModal.url) URL.revokeObjectURL(receiptModal.url); setReceiptModal({ open: false, payment: null, url: null }) }}
        title="Payment Receipt"
      >
        {receiptModal.url ? (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-lg border">
              <img src={receiptModal.url} alt="Receipt" className="max-h-96 w-full object-contain" />
            </div>
            <p className="text-center text-xs text-gray-400">
              Payment #{receiptModal.payment?.id} - ${receiptModal.payment?.amount}
            </p>
          </div>
        ) : (
          <div className="py-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <p className="mt-2 text-sm text-gray-400">Receipt not available</p>
          </div>
        )}
      </Modal>
    </div>
  )
}
