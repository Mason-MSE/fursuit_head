import { Link, useSearchParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { productsAPI, categoriesAPI } from '../services/api'
import { ProductCardSkeleton } from '../components/ui/Skeleton'

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalPages, setTotalPages] = useState(1)
  const [viewMode, setViewMode] = useState('grid')

  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [category, setCategory] = useState(searchParams.get('category') || '')
  const [type, setType] = useState(searchParams.get('type') || '')
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest')
  const [priceMin, setPriceMin] = useState(searchParams.get('price_min') || '')
  const [priceMax, setPriceMax] = useState(searchParams.get('price_max') || '')
  const [showFilters, setShowFilters] = useState(false)
  const page = parseInt(searchParams.get('page') || '1')

  useEffect(() => {
    categoriesAPI.list()
      .then((res) => setCategories(res.data.data || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = { page, limit: 12 }
    if (search) params.search = search
    if (category) params.category = category
    if (type) params.type = type
    if (sortBy) params.sort = sortBy
    if (priceMin) params.price_min = Math.round(parseFloat(priceMin) * 100)
    if (priceMax) params.price_max = Math.round(parseFloat(priceMax) * 100)

    productsAPI.list(params)
      .then((res) => {
        setProducts(res.data.data || [])
        setTotalPages(res.data.meta?.total_pages || res.data.meta?.totalPages || 1)
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [searchParams])

  const applyFilters = () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (category) params.set('category', category)
    if (type) params.set('type', type)
    if (sortBy) params.set('sort', sortBy)
    if (priceMin) params.set('price_min', priceMin)
    if (priceMax) params.set('price_max', priceMax)
    params.set('page', '1')
    setSearchParams(params)
  }

  const clearFilters = () => {
    setSearch('')
    setCategory('')
    setType('')
    setSortBy('newest')
    setPriceMin('')
    setPriceMax('')
    setSearchParams({ page: '1' })
  }

  const goToPage = (p) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', String(p))
    setSearchParams(params)
  }

  const hasActiveFilters = search || category || type || sortBy !== 'newest' || priceMin || priceMax

  return (
    <div className="container-custom py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Shop</h1>
          <p className="text-gray-600 mt-1 text-sm md:text-base">Browse our collection of fursuit heads and accessories</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <aside className={`${showFilters ? 'block' : 'hidden'} lg:block lg:w-64 shrink-0`}>
          <div className="bg-white rounded-xl shadow-sm p-6 space-y-6 lg:sticky lg:top-24">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                className="input-field min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={category}
                onChange={(e) => { setCategory(e.target.value); setTimeout(applyFilters, 0) }}
                className="input-field min-h-[44px]"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={type}
                onChange={(e) => { setType(e.target.value); setTimeout(applyFilters, 0) }}
                className="input-field min-h-[44px]"
              >
                <option value="">All Types</option>
                <option value="ready">Ready to Ship</option>
                <option value="commission">Commission</option>
                <option value="partial">Partial Suit</option>
                <option value="accessory">Accessory</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Price Range (NZD)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  className="input-field min-h-[44px] text-sm"
                  min="0"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  className="input-field min-h-[44px] text-sm"
                  min="0"
                />
              </div>
              <button
                onClick={applyFilters}
                className="w-full mt-2 btn-primary btn-sm"
              >
                Apply Price
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setTimeout(applyFilters, 0) }}
                className="input-field min-h-[44px]"
              >
                <option value="newest">Newest</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="name">Name: A-Z</option>
              </select>
            </div>

            {hasActiveFilters && (
              <button onClick={clearFilters} className="w-full text-sm text-gray-500 hover:text-gray-700">
                Clear All Filters
              </button>
            )}
          </div>
        </aside>

        <div className="flex-1">
          <div className="flex items-center justify-between mb-4 gap-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden btn-outline btn-sm"
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>

            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-gray-500 hidden sm:inline">View:</span>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center ${
                  viewMode === 'grid' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center ${
                  viewMode === 'list' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {loading ? (
            <div className={viewMode === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6'
              : 'space-y-4'
            }>
              {[...Array(6)].map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : products.length > 0 ? (
            <>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {products.map((product) => (
                    <Link key={product.id} to={`/products/${product.id}`} className="card overflow-hidden group">
                      <div className="aspect-square bg-gray-100 overflow-hidden">
                        <img
                          src={product.image_url || product.images?.[0] || '/placeholder.png'}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-gray-900 group-hover:text-primary transition-colors">{product.name}</h3>
                          {product.type && (
                            <span className="badge badge-primary shrink-0">{product.type}</span>
                          )}
                        </div>
                        <p className="text-gray-500 text-sm mt-1 line-clamp-2">{product.description}</p>
                        <p className="text-primary font-bold mt-2 text-lg">
                          ${(product.price / 100).toFixed(2)} NZD
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {products.map((product) => (
                    <Link key={product.id} to={`/products/${product.id}`} className="card overflow-hidden group flex">
                      <div className="w-32 h-32 sm:w-40 sm:h-40 bg-gray-100 overflow-hidden shrink-0">
                        <img
                          src={product.image_url || product.images?.[0] || '/placeholder.png'}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="p-4 flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-gray-900 group-hover:text-primary transition-colors">{product.name}</h3>
                          {product.type && (
                            <span className="badge badge-primary shrink-0">{product.type}</span>
                          )}
                        </div>
                        <p className="text-gray-500 text-sm mt-1 line-clamp-2">{product.description}</p>
                        <p className="text-primary font-bold mt-2 text-lg">
                          ${(product.price / 100).toFixed(2)} NZD
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <button
                    onClick={() => goToPage(page - 1)}
                    disabled={page <= 1}
                    className="px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                  >
                    Previous
                  </button>
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => goToPage(i + 1)}
                      className={`px-3 py-2 text-sm rounded-lg min-h-[44px] ${
                        page === i + 1
                          ? 'bg-primary text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => goToPage(page + 1)}
                    disabled={page >= totalPages}
                    className="px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16">
              <p className="text-6xl mb-4">🔍</p>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-500 mb-4">Try adjusting your filters or search terms</p>
              <button onClick={clearFilters} className="btn-outline btn-sm">Clear Filters</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
