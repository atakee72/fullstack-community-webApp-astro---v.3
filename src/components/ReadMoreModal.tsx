import React from 'react';

interface ReadMoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  body: string;
  author?: string;
  date?: string | number | Date;
  tags?: string[];
}

export default function ReadMoreModal({
  isOpen,
  onClose,
  title,
  body,
  author,
  date,
  tags
}: ReadMoreModalProps) {
  if (!isOpen) return null;

  const formatDate = (dateValue: string | number | Date | undefined) => {
    if (!dateValue) return '';
    return new Date(dateValue).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-3">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[85vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-[#814256] text-white p-4 rounded-t-lg flex justify-between items-start">
          <div className="flex-1 pr-4">
            <h2 className="text-xl font-bold mb-2">{title}</h2>
            <div className="flex items-center gap-4 text-sm opacity-90">
              {author && <span>By {author}</span>}
              {date && <span>{formatDate(date)}</span>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tags */}
        {tags && tags.length > 0 && (
          <div className="bg-[#4b9aaa] px-4 py-2 flex flex-wrap gap-2">
            {tags.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-0.5 bg-[#eccc6e] text-[#814256] rounded-full text-xs font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Modal Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <div className="prose max-w-none">
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{body}</p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-100 px-6 py-3 rounded-b-lg border-t">
          <button
            onClick={onClose}
            className="w-full md:w-auto px-6 py-2 bg-[#814256] text-white rounded-lg hover:bg-[#6a3648] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}