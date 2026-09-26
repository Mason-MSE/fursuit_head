import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { productsAPI } from '../services/api'
import DataTable from '../components/DataTable'
import StatusBadge from '../components/StatusBadge'
import Modal from '../components/Modal'

export default function ProductsPage() {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ search: '', status: '' })
  const [deleteModal, setDeleteModal] = useState({ open: false, product: null })

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const { data } = await productsAPI.list({
        page,
        per_page: 10,
        search: filters.search || undefined,
        status: filters.status || undefined,
      })
      setProducts(data.data || [])
      setTotal(data.meta?.total || 0)
    } catch {
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProducts() }, [page, filters])

  const handleDelete = async () => {
    if (!deleteModal.product) return
    try {
      await productsAPI.delete(deleteModal.product.id)
      setDeleteModal({ open: false, product: null })
      fetchProducts()
    } catch {}
  }

  const columns = [
    { key: 'image', label: '', render: (v) => (
      <div className="h-10 w-10 overflow-hidden rounded-lg bg-gray-100">
        {v ? <img src={v} alt="" className="h-full w-full object-cover" /> : (
          <div className="flex h-full w-full items-center justify-center text-gray-300">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V5.25a1.5 1.5 0 00-1.5-1.5H3.75a1.5 1.5 0 00-1.5 1.5v14.25a1.5 1.5 0 001.5 1.5z" />
            </svg>
          </div>
        )}
      </div>
    )},
    { key: 'name', label: 'Product', sortable: true, render: (v, row) => (
      <div>
        <p className="font-medium text-gray-900">{v}</p>
        <p className="text-xs text-gray-400">{row.sku || ''}</p>
      </div>
    )},
    { key: 'price', label: 'Price', sortable: true, render: (v) => <span className="font-medium">${v || 0}</span> },
    { key: 'stock', label: 'Stock', sortable: true, render: (v) => (
      <span className={v <= 5 ? 'font-medium text-red-600' : 'text-gray-700'}>{v ?? 0}</span>
    )},
    { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
  ]

  const actions = [
    { label: 'Edit', onClick: (row) => navigate(`/products/${row.id}`) },
    { label: 'Delete', onClick: (row) => setDeleteModal({ open: true, product: row }), className: 'text-red-600 hover:bg-red-50' },
  ]

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <button
          onClick={() => navigate('/products/new')}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          + New Product
        </button>
      </div>

      <DataTable
        columns={columns}
        data={products}
        totalItems={total}
        page={page}
        onPageChange={setPage}
        loading={loading}
        filters={filters}
        onFilterChange={(f) => { setFilters(f); setPage(1) }}
        actions={actions}
      />

      <Modal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, product: null })}
        title="Delete Product"
        footer={
          <>
            <button onClick={() => setDeleteModal({ open: false, product: null })} className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">Cancel</button>
            <button onClick={handleDelete} className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700">Delete</button>
          </>
        }
      >
        <p className="text-sm text-gray-600">Are you sure you want to delete <strong>{deleteModal.product?.name}</strong>? This action cannot be undone.</p>
      </Modal>
    </div>
  )
}
