export default function Stepper({ steps, currentStep, onStepClick }) {
  return (
    <div className="flex items-center w-full overflow-x-auto pb-2">
      {steps.map((s, i) => (
        <div key={s.id || i} className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => onStepClick && onStepClick(i + 1)}
            disabled={!onStepClick || i + 1 > currentStep}
            className={`flex items-center gap-2 transition-colors ${
              onStepClick && i + 1 <= currentStep ? 'cursor-pointer' : 'cursor-default'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                currentStep > i + 1
                  ? 'bg-green-500 text-white'
                  : currentStep === i + 1
                  ? 'bg-primary text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {currentStep > i + 1 ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <div className="hidden sm:block text-left">
              <p className={`text-xs font-medium ${
                currentStep >= i + 1 ? 'text-gray-900' : 'text-gray-400'
              }`}>
                {s.title || s}
              </p>
              {s.description && (
                <p className="text-[10px] text-gray-400 hidden md:block">{s.description}</p>
              )}
            </div>
          </button>
          {i < steps.length - 1 && (
            <div
              className={`w-8 sm:w-12 h-0.5 mx-2 transition-colors ${
                currentStep > i + 1 ? 'bg-green-500' : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )
}
