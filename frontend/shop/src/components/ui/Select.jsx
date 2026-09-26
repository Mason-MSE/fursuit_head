export default function Select({
  label,
  options = [],
  placeholder,
  className = '',
  id,
  ...props
}) {
  const selectId = id || props.name || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className={className}>
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className="input-field min-h-[44px]"
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
