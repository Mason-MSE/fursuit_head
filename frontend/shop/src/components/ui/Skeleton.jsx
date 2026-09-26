export function SkeletonLine({ className = '' }) {
  return <div className={`bg-gray-200 rounded animate-pulse ${className}`} />
}

export function SkeletonBlock({ className = '' }) {
  return <div className={`bg-gray-200 rounded-xl animate-pulse ${className}`} />
}

export function SkeletonCircle({ className = '' }) {
  return <div className={`bg-gray-200 rounded-full animate-pulse ${className}`} />
}

export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="aspect-square bg-gray-200 animate-pulse" />
      <div className="p-4 space-y-3">
        <SkeletonLine className="h-4 w-3/4" />
        <SkeletonLine className="h-4 w-1/2" />
        <SkeletonLine className="h-6 w-1/3" />
      </div>
    </div>
  )
}

export function OrderCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
      <div className="flex justify-between">
        <SkeletonLine className="h-4 w-32" />
        <SkeletonLine className="h-6 w-24" />
      </div>
      <SkeletonLine className="h-16 w-full" />
    </div>
  )
}
