import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { pagesAPI } from '../services/api'
import DataTable from '../components/DataTable'
import StatusBadge from '../components/StatusBadge'
import Modal from '../components/Modal'

export default function ContentPage() {
  const navigate = useNavigate()
  const [pages, setPages] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ search: '', status: '' })
  const [editorModal, setEditorModal] = useState({ open: false, page: null })
  const [versionsModal, setVersionsModal] = useState({ open: false, page: null })
  const [versions, setVersions] = useState([])
  const [versionsLoading, setVersionsLoading] = useState(false)
  const [form, setForm] = useState({ title: '', slug: '', content: '', status: 'draft' })
  const [saving, setSaving] = useState(false)

  const fetchPages = async () => {
    setLoading(true)
    try {
      const { data } = await pagesAPI.list({
        page,
        per_page: 10,
        search: filters.search || undefined,
        status: filters.status || undefined,
      })
      setPages(data.data || [])
      setTotal(data.meta?.total || 0)
    } catch {
      setPages([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPages() }, [page, filters])

  const openEditor = (pageData = null) => {
    if (pageData) {
      setForm({ title: pageData.title || '', slug: pageData.slug || '', content: pageData.content || '', status: pageData.status || 'draft' })
    } else {
      setForm({ title: '', slug: '', content: '', status: 'draft' })
    }
    setEditorModal({ open: true, page: pageData })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editorModal.page?.id) {
        await pagesAPI.update(editorModal.page.id, form)
      } else {
        await pagesAPI.create(form)
      }
      setEditorModal({ open: false, page: null })
      fetchPages()
    } catch {} finally {
      setSaving(false)
    }
  }

  const openVersions = async (pageData) => {
    setVersionsModal({ open: true, page: pageData })
    setVersionsLoading(true)
    try {
      const { data } = await pagesAPI.versions(pageData.id)
      setVersions(data.data || [])
    } catch {
      setVersions([])
    } finally {
      setVersionsLoading(false)
    }
  }

  const handleRollback = async (versionId) => {
    if (!versionsModal.page) return
    try {
      await pagesAPI.rollback(versionsModal.page.id, versionId)
      setVersionsModal({ open: false, page: null })
      fetchPages()
    } catch {}
  }

  const columns = [
    { key: 'title', label: 'Title', sortable: true, render: (v) => <span className="font-medium text-gray-900">{v}</span> },
    { key: 'slug', label: 'Slug', render: (v) => <span className="font-mono text-sm text-gray-500">/{v || '-'}</span> },
    { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
    { key: 'updated_at', label: 'Last Updated', sortable: true, render: (v) => (
      <span className="text-gray-500">{v ? new Date(v).toLocaleDateString() : '-'}</span>
    )},
    { key: 'created_at', label: 'Created', sortable: true, render: (v) => (
      <span className="text-gray-500">{v ? new Date(v).toLocaleDateString() : '-'}</span>
    )},
  ]

  const actions = [
    { label: 'Edit', onClick: (row) => openEditor(row) },
    { label: 'History', onClick: (row) => openVersions(row) },
  ]

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Content Pages</h1>
        <button
          onClick={() => openEditor()}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          + New Page
        </button>
      </div>

      <DataTable
        columns={columns}
        data={pages}
        totalItems={total}
        page={page}
        onPageChange={setPage}
        loading={loading}
        filters={filters}
        onFilterChange={(f) => { setFilters(f); setPage(1) }}
        actions={actions}
      />

      {/* Page Editor Modal */}
      <Modal
        open={editorModal.open}
        onClose={() => setEditorModal({ open: false, page: null })}
        title={editorModal.page ? 'Edit Page' : 'New Page'}
        footer={<>
          <button onClick={() => setEditorModal({ open: false, page: null })} className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </>}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Slug</label>
            <input
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              placeholder="auto-generated"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Content</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              rows={10}
              placeholder="Page content..."
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            >
              <option value="draft">Draft</option>
              <option value="pending_review">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="published">Published</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Version History Modal */}
      <Modal
        open={versionsModal.open}
        onClose={() => setVersionsModal({ open: false, page: null })}
        title={`Version History - ${versionsModal.page?.title || ''}`}
      >
        {versionsLoading ? (
          <div className="py-8 text-center text-gray-400">Loading versions...</div>
        ) : versions.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">No version history available</div>
        ) : (
          <div className="max-h-96 space-y-3 overflow-y-auto">
            {versions.map((v, i) => (
              <div key={v.id || i} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">Version {v.version_number || v.id}</span>
                    {v.status && <StatusBadge status={v.status} />}
                    {i === 0 && <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">Current</span>}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {v.created_by ? `By ${v.created_by}` : ''} {v.created_at ? `at ${new Date(v.created_at).toLocaleString()}` : ''}
                  </p>
                  {v.title && <p className="mt-1 text-xs text-gray-400">Title: {v.title}</p>}
                </div>
                {i > 0 && (
                  <button
                    onClick={() => handleRollback(v.id)}
                    className="rounded border border-orange-300 px-3 py-1 text-xs font-medium text-orange-700 hover:bg-orange-50"
                  >
                    Rollback
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}
