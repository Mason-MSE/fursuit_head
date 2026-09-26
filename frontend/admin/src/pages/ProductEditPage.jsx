import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { productsAPI } from '../services/api'

const EMPTY = {
  name: '',
  slug: '',
  description: '',
  short_description: '',
  price: '',
  compare_price: '',
  cost_price: '',
  sku: '',
  stock: '',
  weight: '',
  images: [],
  status: 'draft',
  category_id: '',
  meta_title: '',
  meta_description: '',
  variants: [],
  tags: [],
}

const TABS = ['info', 'pricing', 'media', 'variants', 'seo']

export default function ProductEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id
  const [product, setProduct] = useState({ ...EMPTY })
  const [tab, setTab] = useState('info')
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (id) {
      productsAPI.get(id).then(({ data }) => {
        const p = data.data
        setProduct({ ...EMPTY, ...p })
      }).catch(() => {}).finally(() => setLoading(false))
    }
  }, [id])

  const update = (field, value) => setProduct((prev) => ({ ...prev, [field]: value }))

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...product }
      if (isNew) {
        const { data } = await productsAPI.create(payload)
        navigate(`/products/${data.data?.id}`)
      } else {
        await productsAPI.update(id, payload)
        navigate('/products')
      }
    } catch {} finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="py-20 text-center text-gray-400">Loading...</div>

  const inputCls = 'w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500'
  const labelCls = 'mb-1 block text-sm font-medium text-gray-700'

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <button onClick={() => navigate('/products')} className="text-gray-400 hover:text-gray-600">&larr; Back</button>
        <h1 className="text-2xl font-bold text-gray-900">{isNew ? 'New Product' : 'Edit Product'}</h1>
      </div>

      <div className="mb-6 flex gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium capitalize transition ${
              tab === t ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <form onSubmit={handleSave}>
        <div className="rounded-xl bg-white p-6 shadow">
          {tab === 'info' && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className={labelCls}>Product Name</label>
                <input value={product.name} onChange={(e) => update('name', e.target.value)} className={inputCls} required />
              </div>
              <div>
                <label className={labelCls}>Slug</label>
                <input value={product.slug} onChange={(e) => update('slug', e.target.value)} className={inputCls} placeholder="auto-generated" />
              </div>
              <div>
                <label className={labelCls}>Status</label>
                <select value={product.status} onChange={(e) => update('status', e.target.value)} className={inputCls}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Category</label>
                <input value={product.category_id} onChange={(e) => update('category_id', e.target.value)} className={inputCls} placeholder="Category ID" />
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Short Description</label>
                <input value={product.short_description} onChange={(e) => update('short_description', e.target.value)} className={inputCls} />
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Description</label>
                <textarea value={product.description} onChange={(e) => update('description', e.target.value)} className={inputCls} rows={6} />
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Tags (comma separated)</label>
                <input
                  value={(product.tags || []).join(', ')}
                  onChange={(e) => update('tags', e.target.value.split(',').map((t) => t.trim()).filter(Boolean))}
                  className={inputCls}
                />
              </div>
            </div>
          )}

          {tab === 'pricing' && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div>
                <label className={labelCls}>Price</label>
                <input type="number" step="0.01" value={product.price} onChange={(e) => update('price', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Compare At Price</label>
                <input type="number" step="0.01" value={product.compare_price} onChange={(e) => update('compare_price', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Cost Price</label>
                <input type="number" step="0.01" value={product.cost_price} onChange={(e) => update('cost_price', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>SKU</label>
                <input value={product.sku} onChange={(e) => update('sku', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Stock</label>
                <input type="number" value={product.stock} onChange={(e) => update('stock', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Weight (g)</label>
                <input type="number" value={product.weight} onChange={(e) => update('weight', e.target.value)} className={inputCls} />
              </div>
            </div>
          )}

          {tab === 'media' && (
            <div>
              <label className={labelCls}>Image URLs (one per line)</label>
              <textarea
                value={(product.images || []).join('\n')}
                onChange={(e) => update('images', e.target.value.split('\n').filter(Boolean))}
                className={inputCls}
                rows={6}
                placeholder="https://example.com/image1.jpg"
              />
              <div className="mt-4 grid grid-cols-4 gap-3">
                {(product.images || []).map((url, i) => (
                  <div key={i} className="aspect-square overflow-hidden rounded-lg bg-gray-100">
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'variants' && (
            <div>
              <p className="mb-4 text-sm text-gray-500">Product variants management. Add variants to offer different options (size, color, etc).</p>
              {(product.variants || []).length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">No variants yet</p>
              ) : (
                <div className="space-y-3">
                  {product.variants.map((v, i) => (
                    <div key={i} className="flex items-center gap-4 rounded-lg border p-4">
                      <input
                        value={v.name || ''}
                        onChange={(e) => {
                          const variants = [...product.variants]
                          variants[i] = { ...variants[i], name: e.target.value }
                          update('variants', variants)
                        }}
                        className={inputCls + ' flex-1'}
                        placeholder="Variant name"
                      />
                      <input
                        value={v.price || ''}
                        onChange={(e) => {
                          const variants = [...product.variants]
                          variants[i] = { ...variants[i], price: e.target.value }
                          update('variants', variants)
                        }}
                        className={inputCls + ' w-32'}
                        placeholder="Price"
                      />
                      <input
                        value={v.stock || ''}
                        onChange={(e) => {
                          const variants = [...product.variants]
                          variants[i] = { ...variants[i], stock: e.target.value }
                          update('variants', variants)
                        }}
                        className={inputCls + ' w-24'}
                        placeholder="Stock"
                      />
                      <button
                        type="button"
                        onClick={() => update('variants', product.variants.filter((_, j) => j !== i))}
                        className="text-red-400 hover:text-red-600"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => update('variants', [...(product.variants || []), { name: '', price: '', stock: '' }])}
                className="mt-4 rounded-lg border border-dashed px-4 py-2 text-sm text-gray-500 hover:border-primary-400 hover:text-primary-600"
              >
                + Add Variant
              </button>
            </div>
          )}

          {tab === 'seo' && (
            <div className="space-y-6">
              <div>
                <label className={labelCls}>Meta Title</label>
                <input value={product.meta_title} onChange={(e) => update('meta_title', e.target.value)} className={inputCls} placeholder="SEO title" />
                <p className="mt-1 text-xs text-gray-400">{(product.meta_title || '').length}/60 characters</p>
              </div>
              <div>
                <label className={labelCls}>Meta Description</label>
                <textarea value={product.meta_description} onChange={(e) => update('meta_description', e.target.value)} className={inputCls} rows={3} placeholder="SEO description" />
                <p className="mt-1 text-xs text-gray-400">{(product.meta_description || '').length}/160 characters</p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/products')} className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={saving} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
            {saving ? 'Saving...' : isNew ? 'Create Product' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
