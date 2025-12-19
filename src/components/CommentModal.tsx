import React, { useState, useEffect } from 'react';

interface CommentModalProps {
  show: boolean;
  handleClose: () => void;
  postTitle: string;
  postId: string;
  onSubmit: (comment: string) => void;
}

export default function CommentModal({
  show,
  handleClose,
  postTitle,
  postId,
  onSubmit
}: CommentModalProps) {
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!show) {
      // Reset form when modal closes
      setComment('');
      setIsSubmitting(false);
      // Re-enable html and body scroll
      const htmlElement = document.documentElement;
      htmlElement.style.overflow = '';
      htmlElement.style.touchAction = '';
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.touchAction = '';
    } else {
      // Disable body AND html scroll when modal opens
      const scrollY = window.scrollY;

      // Lock BOTH html and body elements
      const htmlElement = document.documentElement;
      htmlElement.style.setProperty('overflow', 'hidden', 'important');
      htmlElement.style.setProperty('touch-action', 'none', 'important');

      document.body.style.setProperty('position', 'fixed', 'important');
      document.body.style.setProperty('top', `-${scrollY}px`, 'important');
      document.body.style.setProperty('width', '100%', 'important');
      document.body.style.setProperty('overflow', 'hidden', 'important');
      document.body.style.setProperty('touch-action', 'none', 'important');

      // Add escape key listener when modal is open
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          handleClose();
        }
      };
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
        // Clean up: re-enable html and body scroll when component unmounts
        const scrollY = document.body.style.top;
        const htmlElement = document.documentElement;
        htmlElement.style.overflow = '';
        htmlElement.style.touchAction = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        document.body.style.touchAction = '';
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      };
    }
  }, [show, handleClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(comment);
      // Don't call handleClose here - let the parent component handle it
      // This prevents the tab from being reset to 'posts'
    } catch (error) {
      console.error('Failed to submit comment:', error);
      setIsSubmitting(false);
    }
  };

  if (!show) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-2 md:p-4" onClick={handleClose}>
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden animate-fade-in" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="bg-gradient-to-r from-[#814256] to-[#6a3646] p-3 md:p-4 relative">
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 md:top-4 md:right-4 text-white hover:text-[#eccc6e] transition-colors text-xl md:text-2xl"
            >
              ✕
            </button>
            <div className="flex items-center gap-2 md:gap-3">
              <span className="text-2xl md:text-3xl">💬</span>
              <h2 className="text-xl md:text-2xl font-bold text-white">
                Add a Comment
              </h2>
            </div>
          </div>

          {/* Body */}
          <div className="bg-[#c9c4b9] p-4 md:p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Comment Guidelines */}
              <div className="bg-[#eccc6e] rounded-lg p-4 mt-4">
                <p className="text-[#4b9aaa] text-sm">
                  <span className="font-semibold">💡 Comment Guidelines:</span>
                </p>
                <ul className="text-[#4b9aaa]/90 text-sm mt-2 space-y-1">
                  <li>• Be respectful and constructive</li>
                  <li>• Stay on topic</li>
                  <li>• Help build our community</li>
                </ul>
              </div>

              {/* Comment Textarea */}
              <div>
                <label className="block text-[#814256] font-semibold mb-2">
                  Your Comment
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 bg-white focus:bg-white focus:outline-none focus:border-[#eccc6e] transition-all resize-none"
                  rows={5}
                  placeholder="Share your thoughts..."
                  autoFocus
                  required
                />
                <div className="flex justify-between mt-2">
                  <p className="text-gray-600 text-sm">
                    {comment.length}/500 characters
                  </p>
                  {comment.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setComment('')}
                      className="text-gray-600 hover:text-gray-800 text-sm transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2 pb-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-2 px-4 text-sm bg-white/50 text-[#814256] font-semibold rounded-lg hover:bg-white/70 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !comment.trim()}
                  className="flex-1 py-2 px-4 text-sm bg-gradient-to-r from-[#814256] to-[#6a3646] text-white font-bold rounded-lg hover:from-[#6a3646] hover:to-[#5a2c3c] transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin">⏳</span> Posting...
                    </span>
                  ) : (
                    'Post Comment'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}