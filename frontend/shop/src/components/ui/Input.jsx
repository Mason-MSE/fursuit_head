export default function Input({
  label,
  error,
  required = false,
  className = '',
  id,
  ...props
}) {
  const inputId = id || props.name || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <input
        id={inputId}
        className={`input-field ${error ? 'border-red-500 focus:ring-red-500' : ''} min-h-[44px]`}
        {...props}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
}
