import StatusChip from './StatusChip'

export default function Timeline({ events = [] }) {
  if (!events.length) return null

  return (
    <div className="relative pl-6">
      <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gray-200" />
      <div className="space-y-6">
        {events.map((event, i) => (
          <div key={event.id || i} className="relative">
            <div
              className={`absolute -left-[18px] top-1 w-3 h-3 rounded-full border-2 ${
                i === 0 ? 'bg-primary border-primary' : 'bg-white border-gray-300'
              }`}
            />
            <div className="ml-4">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <StatusChip status={event.status} size="xs" />
                <span className="text-xs text-gray-400">
                  {event.timestamp
                    ? new Date(event.timestamp).toLocaleString('en-NZ', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : event.date
                    ? new Date(event.date).toLocaleDateString('en-NZ', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : ''}
                </span>
              </div>
              {event.note && (
                <p className="text-sm text-gray-600">{event.note}</p>
              )}
              {event.description && (
                <p className="text-sm text-gray-600">{event.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
