interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
  /** Tailwind bg class for the active "Next" button, e.g. "bg-[#814256]" */
  accentColor?: string;
  /** Tailwind hover bg class, e.g. "hover:bg-[#6b3548]" */
  accentHover?: string;
  /** Label for items, e.g. "articles" or "items" */
  itemLabel?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  pageSizeOptions,
  onPageSizeChange,
  accentColor = 'bg-[#4b9aaa]',
  accentHover = 'hover:bg-[#3a8999]',
  itemLabel = 'items',
}: PaginationProps) {
  if (totalPages <= 1 && !onPageSizeChange) return null;

  return (
    <div className="flex flex-wrap justify-center items-center gap-4 mt-6">
      {onPageSizeChange && pageSizeOptions && (
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500" htmlFor="page-size">Show</label>
          <select
            id="page-size"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="px-2 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-400"
          >
            {pageSizeOptions.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          onClick={() => onPageChange(0)}
          disabled={currentPage === 0}
          className="hidden sm:inline-flex px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium"
        >
          First
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 0}
          className="px-2.5 sm:px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium"
        >
          ←<span className="hidden sm:inline"> Prev</span>
        </button>
        <span className="text-sm text-gray-500 px-1">
          <span className="sm:hidden">{currentPage + 1}/{totalPages}</span>
          <span className="hidden sm:inline">Page {currentPage + 1} of {totalPages} · {totalItems} {itemLabel}</span>
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages - 1}
          className={`px-2.5 sm:px-3 py-1.5 ${accentColor} text-white rounded-lg ${accentHover} disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium`}
        >
          <span className="hidden sm:inline">Next </span>→
        </button>
        <button
          onClick={() => onPageChange(totalPages - 1)}
          disabled={currentPage >= totalPages - 1}
          className="hidden sm:inline-flex px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium"
        >
          Last
        </button>
      </div>
    </div>
  );
}
