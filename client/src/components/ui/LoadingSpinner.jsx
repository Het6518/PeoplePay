const SIZES = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-4',
  lg: 'w-12 h-12 border-4',
};

/**
 * Animated loading spinner.
 *
 * @param {{
 *   size?: 'sm' | 'md' | 'lg',
 *   fullPage?: boolean,
 *   label?: string,
 * }} props
 */
export function LoadingSpinner({ size = 'md', fullPage = false, label = 'Loading...' }) {
  const sizeClass = SIZES[size] ?? SIZES.md;

  const spinner = (
    <div
      className={`${sizeClass} border-primary-200 border-t-primary-600 rounded-full animate-spin`}
      role="status"
      aria-label={label}
    />
  );

  if (fullPage) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="flex justify-center">{spinner}</div>
          <p className="mt-3 text-sm text-slate-500">{label}</p>
        </div>
      </div>
    );
  }

  return spinner;
}
