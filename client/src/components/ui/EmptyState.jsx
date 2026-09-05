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
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
        <Icon size={28} className="text-slate-400" />
      </div>
      <h3 className="text-base font-semibold text-slate-700 mb-1">{title}</h3>
      {message && (
        <p className="text-sm text-slate-500 max-w-sm mb-4">{message}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
