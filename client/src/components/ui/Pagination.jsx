import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Build the array of page numbers / ellipsis tokens to display.
 * e.g. for page=5, totalPages=10 → [1, '...', 3, 4, 5, 6, 7, '...', 10]
 */
function buildPageWindow(page, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = [];
  const SIBLINGS = 1; // pages shown either side of current

  const leftSibling = Math.max(page - SIBLINGS, 1);
  const rightSibling = Math.min(page + SIBLINGS, totalPages);

  const showLeftEllipsis = leftSibling > 2;
  const showRightEllipsis = rightSibling < totalPages - 1;

  pages.push(1);

  if (showLeftEllipsis) {
    pages.push('...');
  } else {
    // fill from 2 up to leftSibling
    for (let p = 2; p < leftSibling; p++) pages.push(p);
  }

  for (let p = leftSibling; p <= rightSibling; p++) {
    if (p !== 1 && p !== totalPages) pages.push(p);
  }

  if (showRightEllipsis) {
    pages.push('...');
  } else {
    for (let p = rightSibling + 1; p < totalPages; p++) pages.push(p);
  }

  pages.push(totalPages);

  return pages;
}

/**
 * Pagination control.
 *
 * @param {{
 *   page: number,
 *   totalPages: number,
 *   onPageChange: (page: number) => void,
 * }} props
 */
export function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = buildPageWindow(page, totalPages);

  const buttonBase =
    'inline-flex items-center justify-center min-w-[2rem] h-8 px-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500';
  const activeClass = 'bg-primary-600 text-white shadow-sm';
  const inactiveClass = 'text-slate-600 hover:bg-slate-100';
  const disabledClass = 'text-slate-300 cursor-not-allowed';

  return (
    <nav
      className="flex items-center justify-center gap-1 py-2"
      aria-label="Pagination"
    >
      {/* Previous */}
      <button
        className={`${buttonBase} gap-1 pr-3 ${page === 1 ? disabledClass : inactiveClass}`}
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        aria-label="Go to previous page"
      >
        <ChevronLeft size={16} />
        <span>Previous</span>
      </button>

      {/* Page numbers */}
      {pages.map((p, idx) =>
        p === '...' ? (
          <span
            key={`ellipsis-${idx}`}
            className="inline-flex items-center justify-center min-w-[2rem] h-8 px-1 text-sm text-slate-400 select-none"
            aria-hidden="true"
          >
            &hellip;
          </span>
        ) : (
          <button
            key={p}
            className={`${buttonBase} ${p === page ? activeClass : inactiveClass}`}
            onClick={() => onPageChange(p)}
            aria-label={`Go to page ${p}`}
            aria-current={p === page ? 'page' : undefined}
          >
            {p}
          </button>
        ),
      )}

      {/* Next */}
      <button
        className={`${buttonBase} gap-1 pl-3 ${page === totalPages ? disabledClass : inactiveClass}`}
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        aria-label="Go to next page"
      >
        <span>Next</span>
        <ChevronRight size={16} />
      </button>
    </nav>
  );
}
