export default function Card({ header, footer, children, className = '', onClick }) {
  return (
    <div
      className={`bg-white rounded-xl shadow-sm ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${className}`}
      onClick={onClick}
    >
      {header && (
        <div className="px-6 py-4 border-b border-gray-100">
          {typeof header === 'string' ? (
            <h3 className="font-semibold text-gray-900">{header}</h3>
          ) : (
            header
          )}
        </div>
      )}
      <div className="p-6">{children}</div>
      {footer && (
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
          {footer}
        </div>
      )}
    </div>
  )
}
