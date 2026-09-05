const STATUS_COLOR_MAP = {
  // Green
  ACTIVE: 'green',
  APPROVED: 'green',
  PRESENT: 'green',
  PAID: 'green',

  // Yellow
  DRAFT: 'yellow',
  PENDING: 'yellow',
  LATE: 'yellow',

  // Red
  INACTIVE: 'red',
  TERMINATED: 'red',
  REJECTED: 'red',
  ABSENT: 'red',
  CANCELLED: 'red',
  EXPIRED: 'red',

  // Blue
  COMPUTED: 'blue',

  // Indigo
  VALIDATED: 'indigo',

  // Purple
  OVERTIME: 'purple',
  MANUAL_CORRECTION: 'purple',

  // Amber / Orange
  MISSING_CHECKOUT: 'amber',
};

const COLOR_CLASSES = {
  green:  'bg-emerald-100 text-emerald-700 ring-emerald-200',
  yellow: 'bg-yellow-100 text-yellow-700 ring-yellow-200',
  red:    'bg-red-100 text-red-700 ring-red-200',
  blue:   'bg-blue-100 text-blue-700 ring-blue-200',
  indigo: 'bg-indigo-100 text-indigo-700 ring-indigo-200',
  purple: 'bg-purple-100 text-purple-700 ring-purple-200',
  amber:  'bg-amber-100 text-amber-700 ring-amber-200',
  slate:  'bg-slate-100 text-slate-600 ring-slate-200',
};

function resolveColor(status) {
  if (!status) return 'slate';
  return STATUS_COLOR_MAP[status.toUpperCase()] ?? 'slate';
}

function formatLabel(status) {
  if (!status) return '';
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Generic colored badge.
 * @param {{ color?: string, children: React.ReactNode, className?: string }} props
 */
export function Badge({ color = 'slate', children, className = '' }) {
  const colorClasses = COLOR_CLASSES[color] ?? COLOR_CLASSES.slate;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ${colorClasses} ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * Maps a status string to a semantic color badge automatically.
 * @param {{ status: string, className?: string }} props
 */
export function StatusBadge({ status, className = '' }) {
  const color = resolveColor(status);
  return (
    <Badge color={color} className={className}>
      {formatLabel(status)}
    </Badge>
  );
}
