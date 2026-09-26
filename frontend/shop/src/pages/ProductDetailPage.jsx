import { useParams, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { productsAPI, cartAPI } from '../services/api'
import { useAuth } from '../store/authStore'
import { useToast } from '../components/ui/Toast'
import StatusChip from '../components/StatusChip'

const SPECIES_OPTIONS = [
  { value: 'fur', label: 'Fur' },
  { value: 'scalie', label: 'Scalie' },
  { value: 'avian', label: 'Avian' },
  { value: 'equine', label: 'Equine' },
  { value: 'other', label: 'Other' },
]

export default function ProductDetailPage() {
  const { id } = useParams()
  const { isAuthenticated } = useAuth()
  const toast = useToast()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [selectedSize, setSelectedSize] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const [relatedProducts, setRelatedProducts] = useState([])
  const [activeTab, setActiveTab] = useState('details')

  useEffect(() => {
    setLoading(true)
    productsAPI.get(id)
      .then((res) => {
        const productData = res.data.data
        setProduct(productData)
        if (productData?.variants?.length) {
          setSelectedVariant(productData.variants[0])
        }
        if (productData?.category?.id) {
          productsAPI.list({ category: productData.category.id, limit: 4 })
            .then((relRes) => {
              const all = relRes.data.data || []
              setRelatedProducts(all.filter((p) => p.id !== productData.id).slice(0, 3))
            })
            .catch(() => {})
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      window.location.href = '/login'
      return
    }
    setAdding(true)
    try {
      await cartAPI.addItem({
        product_id: product.id,
        variant_id: selectedVariant?.id || null,
        quantity,
      })
      setAdded(true)
      toast.success('Added to cart!')
      setTimeout(() => setAdded(false), 2000)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add to cart')
    } finally {
      setAdding(false)
    }
  }

  if (loading) {
    return (
      <div className="container-custom py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-pulse">
          <div className="aspect-square bg-gray-200 rounded-2xl" />
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="h-32 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="container-custom py-16 text-center">
        <p className="text-6xl mb-4">😢</p>
        <h2 className="text-2xl font-bold mb-4">Product Not Found</h2>
        <Link to="/products" className="btn-primary">Back to Shop</Link>
      </div>
    )
  }

  const images = product.images || (product.image_url ? [product.image_url] : [])
  const variants = product.variants || []
  const price = product.price / 100
  const variantPrice = selectedVariant?.price ? selectedVariant.price / 100 : null

  const sizeVariants = variants.filter((v) => v.size)
  const hasSizeVariants = sizeVariants.length > 0

  const detailTabs = [
    { id: 'details', label: 'Details' },
    { id: 'care', label: 'Care' },
    { id: 'safety', label: 'Safety' },
    { id: 'shipping', label: 'Shipping' },
  ]

  return (
    <div className="container-custom py-8">
      <nav className="text-sm text-gray-500 mb-6">
        <Link to="/" className="hover:text-primary">Home</Link>
        <span className="mx-2">/</span>
        <Link to="/products" className="hover:text-primary">Shop</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        <div>
          <div className="aspect-square bg-gray-100 rounded-2xl overflow-hidden mb-4">
            {images.length > 0 ? (
              <img
                src={images[selectedImage]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-8xl">🦊</div>
            )}
          </div>
          {images.length > 1 && (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 transition-colors min-w-[44px] min-h-[44px] ${
                    selectedImage === i ? 'border-primary' : 'border-transparent hover:border-gray-300'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
          {product.category && (
            <span className="badge badge-primary">{product.category.name || product.category}</span>
          )}

          <div className="mt-4 mb-6">
            <p className="text-3xl font-bold text-primary">
              ${(variantPrice || price).toFixed(2)} NZD
            </p>
            <p className="text-sm text-gray-400 mt-1">Includes GST (15%)</p>
            {variantPrice && variantPrice !== price && (
              <p className="text-sm text-gray-400 line-through">${price.toFixed(2)} NZD</p>
            )}
          </div>

          <div className="prose prose-sm text-gray-600 mb-6">
            <p>{product.description}</p>
          </div>

          {hasSizeVariants && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Size</label>
              <div className="flex flex-wrap gap-2">
                {sizeVariants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => { setSelectedVariant(v); setSelectedSize(v.size) }}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors min-h-[44px] ${
                      selectedVariant?.id === v.id
                        ? 'border-primary bg-primary text-white'
                        : 'border-gray-300 hover:border-primary text-gray-700'
                    }`}
                  >
                    {v.name || v.size}
                    {v.price && (
                      <span className="ml-1 text-xs opacity-75">
                        ${(v.price / 100).toFixed(2)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {variants.length > 0 && !hasSizeVariants && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Style / Variant</label>
              <div className="flex flex-wrap gap-2">
                {variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariant(v)}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors min-h-[44px] ${
                      selectedVariant?.id === v.id
                        ? 'border-primary bg-primary text-white'
                        : 'border-gray-300 hover:border-primary text-gray-700'
                    }`}
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-11 h-11 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 text-lg"
              >
                -
              </button>
              <span className="w-12 text-center font-medium">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-11 h-11 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 text-lg"
              >
                +
              </button>
            </div>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={adding}
            className={`w-full py-3 rounded-lg font-semibold transition-all duration-200 min-h-[48px] ${
              added
                ? 'bg-green-500 text-white'
                : 'btn-primary'
            } disabled:opacity-50`}
          >
            {adding ? 'Adding...' : added ? 'Added to Cart!' : 'Add to Cart'}
          </button>

          <div className="mt-8 border-t pt-6">
            <div className="flex gap-1 border-b mb-4 overflow-x-auto">
              {detailTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors min-h-[44px] whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'details' && (
              <div className="space-y-4">
                {product.care_instructions && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Care Instructions</h4>
                    <p className="text-sm text-gray-600 whitespace-pre-line">{product.care_instructions}</p>
                  </div>
                )}
                {product.features && product.features.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Features</h4>
                    <ul className="space-y-1">
                      {product.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="text-primary">✓</span> {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {product.species && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Species</h4>
                    <p className="text-sm text-gray-600">{product.species}</p>
                  </div>
                )}
                {!product.care_instructions && (!product.features || product.features.length === 0) && !product.species && (
                  <p className="text-sm text-gray-500">No additional details available for this product.</p>
                )}
              </div>
            )}

            {activeTab === 'care' && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Care Instructions</h4>
                {product.care_instructions ? (
                  <div className="text-sm text-gray-600 whitespace-pre-line bg-purple-50 rounded-xl p-4">
                    {product.care_instructions}
                  </div>
                ) : (
                  <div className="text-sm text-gray-600 bg-purple-50 rounded-xl p-4 space-y-2">
                    <p>• Spot clean with mild soap and water</p>
                    <p>• Do not machine wash or tumble dry</p>
                    <p>• Store in a cool, dry place away from direct sunlight</p>
                    <p>• Keep away from open flames and excessive heat</p>
                    <p>• For fur: gently brush with a slicker brush to maintain fluffiness</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'safety' && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Safety Notes</h4>
                <div className="text-sm text-gray-600 bg-amber-50 rounded-xl p-4 space-y-2">
                  {product.safety_notes ? (
                    <p className="whitespace-pre-line">{product.safety_notes}</p>
                  ) : (
                    <>
                      <p>• Not suitable for children under 12 years</p>
                      <p>• Ensure proper ventilation when wearing for extended periods</p>
                      <p>• Remove head before operating any vehicle</p>
                      <p>• Supervised use recommended for first-time wearers</p>
                      <p>• Avoid wearing in extreme heat conditions</p>
                    </>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'shipping' && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Shipping Information</h4>
                <div className="text-sm text-gray-600 bg-blue-50 rounded-xl p-4 space-y-2">
                  {product.shipping_info ? (
                    <p className="whitespace-pre-line">{product.shipping_info}</p>
                  ) : (
                    <>
                      <p>• <strong>NZ Domestic:</strong> 3-5 business days (tracked)</p>
                      <p>• <strong>Australia:</strong> 7-14 business days (tracked & insured)</p>
                      <p>• <strong>International:</strong> 10-21 business days (tracked & insured)</p>
                      <p>• <strong>Ready to Ship:</strong> Ships within 1-2 business days</p>
                      <p>• <strong>Custom Orders:</strong> 3-6 months production time</p>
                      <p>• All items are carefully packaged for safe delivery</p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {relatedProducts.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Products</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {relatedProducts.map((rp) => (
              <Link key={rp.id} to={`/products/${rp.id}`} className="card overflow-hidden group">
                <div className="aspect-square bg-gray-100 overflow-hidden">
                  <img
                    src={rp.image_url || rp.images?.[0] || '/placeholder.png'}
                    alt={rp.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 group-hover:text-primary transition-colors">{rp.name}</h3>
                  <p className="text-primary font-bold mt-1">
                    ${(rp.price / 100).toFixed(2)} NZD
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
