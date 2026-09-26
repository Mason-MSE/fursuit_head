const STATUS_CONFIG = {
  pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending', icon: 'clock' },
  confirmed: { color: 'bg-blue-100 text-blue-800', label: 'Confirmed', icon: 'check' },
  processing: { color: 'bg-purple-100 text-purple-800', label: 'Processing', icon: 'gear' },
  shipped: { color: 'bg-indigo-100 text-indigo-800', label: 'Shipped', icon: 'truck' },
  delivered: { color: 'bg-green-100 text-green-800', label: 'Delivered', icon: 'package' },
  completed: { color: 'bg-green-100 text-green-800', label: 'Completed', icon: 'check-circle' },
  cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled', icon: 'x-circle' },
  disputed: { color: 'bg-orange-100 text-orange-800', label: 'Disputed', icon: 'alert' },
  open: { color: 'bg-blue-100 text-blue-800', label: 'Open', icon: 'folder-open' },
  in_progress: { color: 'bg-purple-100 text-purple-800', label: 'In Progress', icon: 'arrow-right' },
  resolved: { color: 'bg-green-100 text-green-800', label: 'Resolved', icon: 'check' },
  draft: { color: 'bg-gray-100 text-gray-800', label: 'Draft', icon: 'pencil' },
  published: { color: 'bg-green-100 text-green-800', label: 'Published', icon: 'globe' },
  amount_mismatch: { color: 'bg-orange-100 text-orange-800', label: 'Amount Mismatch', icon: 'alert-triangle' },
  submitted: { color: 'bg-blue-100 text-blue-800', label: 'Submitted', icon: 'send' },
  reviewing: { color: 'bg-indigo-100 text-indigo-800', label: 'Reviewing', icon: 'eye' },
  quoted: { color: 'bg-cyan-100 text-cyan-800', label: 'Quoted', icon: 'receipt' },
  deposit_pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Deposit Pending', icon: 'banknotes' },
  deposit_received: { color: 'bg-green-100 text-green-800', label: 'Deposit Received', icon: 'check-badge' },
  stage_review: { color: 'bg-amber-100 text-amber-800', label: 'Stage Review', icon: 'photo' },
  stage_approved: { color: 'bg-emerald-100 text-emerald-800', label: 'Stage Approved', icon: 'check-badge' },
  final_review: { color: 'bg-teal-100 text-teal-800', label: 'Final Review', icon: 'star' },
  revision_requested: { color: 'bg-orange-100 text-orange-800', label: 'Revision Requested', icon: 'arrow-uturn' },
  active: { color: 'bg-green-100 text-green-800', label: 'Active', icon: 'check' },
  inactive: { color: 'bg-gray-100 text-gray-600', label: 'Inactive', icon: 'x' },
  suspended: { color: 'bg-red-100 text-red-800', label: 'Suspended', icon: 'x-circle' },
  refunded: { color: 'bg-orange-100 text-orange-800', label: 'Refunded', icon: 'arrow-uturn' },
  rejected: { color: 'bg-red-100 text-red-800', label: 'Rejected', icon: 'x' },
  paid: { color: 'bg-green-100 text-green-800', label: 'Paid', icon: 'check' },
  unpaid: { color: 'bg-red-100 text-red-800', label: 'Unpaid', icon: 'x' },
  low: { color: 'bg-gray-100 text-gray-600', label: 'Low', icon: 'minus' },
  medium: { color: 'bg-yellow-100 text-yellow-800', label: 'Medium', icon: 'minus' },
  high: { color: 'bg-orange-100 text-orange-800', label: 'High', icon: 'plus' },
  urgent: { color: 'bg-red-100 text-red-800', label: 'Urgent', icon: 'exclamation' },
  archived: { color: 'bg-gray-100 text-gray-600', label: 'Archived', icon: 'archive' },
  closed: { color: 'bg-gray-100 text-gray-600', label: 'Closed', icon: 'x-circle' },
  pending_review: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending Review', icon: 'eye' },
  approved: { color: 'bg-green-100 text-green-800', label: 'Approved', icon: 'check' },
}

const ICON_PATHS = {
  clock: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z',
  check: 'M4.5 12.75l6 6 9-13.5',
  gear: 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  truck: 'M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12',
  package: 'M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9',
  'check-circle': 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  'x-circle': 'M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  alert: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
  'folder-open': 'M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776',
  'arrow-right': 'M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3',
  pencil: 'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10',
  globe: 'M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418',
  'alert-triangle': 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
  send: 'M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5',
  eye: 'M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  receipt: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
  banknotes: 'M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z',
  'check-badge': 'M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z',
  photo: 'M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V5.25a1.5 1.5 0 00-1.5-1.5H3.75a1.5 1.5 0 00-1.5 1.5v14.25a1.5 1.5 0 001.5 1.5z',
  star: 'M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z',
  'arrow-uturn': 'M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3',
  x: 'M6 18L18 6M6 6l12 12',
  minus: 'M19.5 12h-15',
  plus: 'M12 4.5v15m7.5-7.5h-15',
  exclamation: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z',
  archive: 'M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z',
}

function StatusIcon({ iconName, className }) {
  const d = ICON_PATHS[iconName]
  if (!d) return null
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  )
}

function formatLabel(status) {
  const config = STATUS_CONFIG[status]
  if (config) return config.label
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status]
  const colorClass = config?.color || 'bg-gray-100 text-gray-600'
  const iconName = config?.icon || 'circle'

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}>
      <StatusIcon iconName={iconName} className="h-3 w-3 shrink-0" />
      {formatLabel(status)}
    </span>
  )
}
