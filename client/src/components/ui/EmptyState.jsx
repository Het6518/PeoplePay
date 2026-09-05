import { FolderOpen } from 'lucide-react';

/**
 * Empty state display.
 *
 * @param {{
 *   icon?: React.ElementType,
 *   title: string,
 *   message?: string,
 *   action?: React.ReactNode,
 * }} props
 */
export function EmptyState({ icon: Icon = FolderOpen, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center mb-4 text-amber-600 shadow-sm">
        <Icon size={28} />
      </div>
      <h3 className="text-base font-extrabold text-stone-800 tracking-tight mb-1">{title}</h3>
      {message && (
        <p className="text-sm font-medium text-stone-500 max-w-sm mb-4">{message}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
