import { useEffect } from 'react';
import { X } from 'lucide-react';

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
};

/**
 * Full-screen modal dialog optimized for mobile viewports.
 *
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   title: string,
 *   children: React.ReactNode,
 *   size?: 'sm' | 'md' | 'lg' | 'xl',
 * }} props
 */
export function Modal({ open, onClose, title, children, size = 'md' }) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  const sizeClass = SIZES[size] ?? SIZES.md;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={`relative bg-white rounded-[24px] sm:rounded-[28px] border border-stone-200/80 shadow-2xl w-full ${sizeClass} max-h-[92vh] sm:max-h-[90vh] flex flex-col animate-fadeIn`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-4 sm:py-5 border-b border-stone-100 flex-shrink-0">
          <h2 id="modal-title" className="text-base sm:text-lg font-extrabold text-stone-900 tracking-tight">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-full hover:bg-stone-100 text-stone-500 hover:text-stone-900 transition-colors"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 sm:px-7 py-5 sm:py-6">{children}</div>
      </div>
    </div>
  );
}
