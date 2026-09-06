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
  HALF_DAY: 'amber',

  // Red / Short Hours
  SHORT_HOURS: 'red',
};

const COLOR_CLASSES = {
  green:  'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
  yellow: 'bg-amber-50 text-amber-800 border border-amber-200/80',
  red:    'bg-rose-50 text-rose-700 border border-rose-200/80',
  blue:   'bg-sky-50 text-sky-700 border border-sky-200/80',
  indigo: 'bg-indigo-50 text-indigo-700 border border-indigo-200/80',
  purple: 'bg-purple-50 text-purple-700 border border-purple-200/80',
  amber:  'bg-amber-50 text-amber-800 border border-amber-200/80',
  slate:  'bg-stone-100 text-stone-700 border border-stone-200/80',
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
