import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { productsAPI } from '../services/api'

export default function HomePage() {
  const [featured, setFeatured] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    productsAPI.list({ featured: true, limit: 4 })
      .then((res) => setFeatured(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <section className="relative bg-gradient-to-br from-primary via-primary-dark to-purple-900 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 text-9xl">🦊</div>
          <div className="absolute bottom-10 right-10 text-9xl">🐺</div>
        </div>
        <div className="container-custom py-24 md:py-32 relative z-10">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Bring Your Fursona to <span className="text-accent-light">Life</span>
            </h1>
            <p className="text-lg md:text-xl text-purple-100 mb-8 leading-relaxed">
              Handcrafted custom fursuit heads made with love in New Zealand.
              Each piece is uniquely designed to capture your character's personality.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/products" className="btn-accent text-lg px-8 py-4">
                Browse Shop
              </Link>
              <Link to="/me/commissions/new" className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-primary transition-all duration-200 text-lg">
                Custom Commission
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="container-custom py-16">
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🎨</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Fully Custom</h3>
              <p className="text-gray-600 text-sm">Every head is designed from scratch to match your fursona perfectly.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">✨</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Premium Quality</h3>
              <p className="text-gray-600 text-sm">High-quality materials and construction for a comfortable, durable head.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🇳🇿</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Made in NZ</h3>
              <p className="text-gray-600 text-sm">Proudly handcrafted in New Zealand with love and attention to detail.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="container-custom py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Featured Products</h2>
          <Link to="/products" className="text-primary hover:text-primary-dark font-semibold">
            View All →
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="aspect-square bg-gray-200 rounded-t-xl" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : featured.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featured.map((product) => (
              <Link key={product.id} to={`/products/${product.id}`} className="card overflow-hidden group">
                <div className="aspect-square bg-gray-100 overflow-hidden">
                  <img
                    src={product.image_url || product.images?.[0] || '/placeholder.png'}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 group-hover:text-primary transition-colors">{product.name}</h3>
                  <p className="text-primary font-bold mt-1">
                    ${(product.price / 100).toFixed(2)} NZD
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p className="text-6xl mb-4">🦊</p>
            <p>Products coming soon! Check back later.</p>
          </div>
        )}
      </section>

      <section className="container-custom py-16">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 md:p-12 text-white text-center">
          <h2 className="text-3xl font-bold mb-4">Commission Status</h2>
          <p className="text-purple-100 mb-6 max-w-2xl mx-auto">
            We create custom fursuit heads tailored to your character. Check our current commission status below.
          </p>
          <div className="inline-flex items-center gap-3 bg-white/20 backdrop-blur-sm rounded-xl px-8 py-4">
            <div className="w-3 h-3 rounded-full bg-yellow-400 animate-pulse" />
            <span className="text-lg font-semibold">
              Status: <span className="text-yellow-200">Waitlist</span>
            </span>
          </div>
          <div className="mt-6">
            <Link to="/me/commissions/new" className="btn-accent">
              Join the Waitlist
            </Link>
          </div>
        </div>
      </section>

      <section className="container-custom py-16">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to Start?</h2>
          <p className="text-gray-600 mb-8">
            Whether you want a ready-to-ship head or a fully custom commission, we're here to help bring your vision to life.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/products" className="btn-primary">
              Shop Now
            </Link>
            <Link to="/me/commissions/new" className="btn-outline">
              Start a Commission
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
