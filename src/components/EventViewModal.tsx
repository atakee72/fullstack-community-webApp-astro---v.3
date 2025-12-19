import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import type { Event } from '../types';

interface EventViewModalProps {
  show: boolean;
  event: Event | null;
  user?: any;
  onClose: () => void;
  onAddComment: (comment: string) => Promise<void>;
  isAddingComment?: boolean;
}

const categoryColors: Record<string, string> = {
  'community': '#4b9aaa',
  'sports-health': '#28a745',
  'culture-education': '#6f42c1',
  'other': '#6c757d'
};

export default function EventViewModal({
  show,
  event,
  user,
  onClose,
  onAddComment,
  isAddingComment = false
}: EventViewModalProps) {
  const [commentText, setCommentText] = useState('');

  // Handle escape key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && show) {
        onClose();
      }
    };

    if (show) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [show, onClose]);

  if (!show || !event) return null;

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    await onAddComment(commentText);
    setCommentText('');
  };

  const startDate = new Date(event.startDate);
  const endDate = new Date(event.endDate);
  const isSameDay = format(startDate, 'yyyy-MM-dd') === format(endDate, 'yyyy-MM-dd');

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-fadeIn"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="bg-[#c9c4b9] rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slideUp"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-[#814256] border-b border-gray-200 px-4 pt-3 pb-3.5 flex items-start justify-between">
            <div className="flex-1 pr-3">
              <h2 className="text-xl font-bold text-white mb-1 leading-tight">
                {event.title}
              </h2>
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-block px-3 py-1 text-xs font-semibold text-white rounded-full"
                  style={{ backgroundColor: categoryColors[event.category || 'other'] }}
                >
                  {event.category?.replace('-', ' ') || 'other'}
                </span>
                {event.tags?.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-block px-2 py-0.5 text-xs bg-[#eccc6e] text-[#814256] rounded font-medium shadow-sm"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors flex-shrink-0"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="px-4 py-3 space-y-2">
            {/* Date & Time */}
            <div className="flex items-start gap-2">
              <div className="text-[#4b9aaa] text-xl">📅</div>
              <div>
                <p className="font-semibold text-gray-700 text-sm">
                  {format(startDate, 'EEEE, MMMM d, yyyy')}
                </p>
                <p className="text-xs text-gray-600">
                  {isSameDay ? (
                    <>
                      {format(startDate, 'h:mm a')} - {format(endDate, 'h:mm a')}
                    </>
                  ) : (
                    <>
                      {format(startDate, 'MMM d, h:mm a')} - {format(endDate, 'MMM d, h:mm a')}
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Location */}
            {event.location && (
              <div className="flex items-start gap-2">
                <div className="text-[#4b9aaa] text-xl">📍</div>
                <div>
                  <p className="font-semibold text-gray-700 text-sm">Location</p>
                  <p className="text-xs text-gray-600">{event.location}</p>
                </div>
              </div>
            )}

            {/* Description */}
            <div className="flex items-start gap-2">
              <div className="text-[#4b9aaa] text-xl">📝</div>
              <div className="flex-1">
                <p className="font-semibold text-gray-700 text-sm mb-1">Description</p>
                <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
                  {event.body}
                </p>
              </div>
            </div>

            {/* Author */}
            <div className="flex items-start gap-2">
              <div className="text-[#4b9aaa] text-xl">👤</div>
              <div>
                <p className="font-semibold text-gray-700 text-sm">Organized by</p>
                <p className="text-xs text-gray-600">
                  {event.author?.userName || 'Unknown'}
                </p>
              </div>
            </div>

            {/* Stats Bar */}
            <div className="flex items-center gap-3 pt-2 border-t border-gray-200">
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <span>💬</span>
                <span>{event.comments?.length || 0} comments</span>
              </div>
            </div>

            {/* Comments Section */}
            <div className="border-t border-gray-200 pt-3 mt-3">
              <h3 className="text-base font-semibold text-gray-800 mb-2">
                Comments ({event.comments?.length || 0})
              </h3>

              {/* Add Comment Form */}
              {user ? (
                <form onSubmit={handleSubmitComment} className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 px-2 py-1.5 border border-gray-300 rounded-md text-sm bg-gray-100 focus:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#4b9aaa] focus:border-transparent"
                    disabled={isAddingComment}
                  />
                  <button
                    type="submit"
                    disabled={isAddingComment || !commentText.trim()}
                    className="px-3 py-1.5 bg-[#4b9aaa] text-white rounded-md hover:bg-[#3a7a8a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                  >
                    {isAddingComment ? 'Posting...' : 'Post'}
                  </button>
                </form>
              ) : (
                <p className="text-xs text-gray-500 mb-3 italic">Please log in to comment.</p>
              )}

              {/* Existing Comments */}
              {event.comments && event.comments.length > 0 ? (
                <div className="space-y-1.5 max-h-60 overflow-y-auto mb-4">
                  {[...event.comments].reverse().map((comment: any, idx: number) => (
                    <div key={idx} className="bg-gray-100 rounded-lg p-1.5">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-semibold text-xs text-gray-800">
                          {comment.author?.userName || comment.author?.name || 'Anonymous'}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {comment.createdAt ? format(new Date(comment.createdAt), 'MMM d, h:mm a') : ''}
                        </span>
                      </div>
                      <p className="text-xs text-gray-700 leading-snug">{comment.body || comment.comment}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">No comments yet. Be the first to comment!</p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-[#814256] h-1"></div>
        </div>
      </div>
    </>
  );
}
