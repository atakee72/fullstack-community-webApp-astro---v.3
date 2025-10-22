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
    }
  }, [show]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(comment);
      handleClose();
    } catch (error) {
      console.error('Failed to submit comment:', error);
    } finally {
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
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#814256] to-[#6a3646] p-6 relative">
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-white hover:text-[#eccc6e] transition-colors text-2xl"
            >
              ✕
            </button>
            <div className="flex items-center gap-3">
              <span className="text-3xl">💬</span>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Add a Comment
                </h2>
                <p className="text-white/80 text-sm mt-1">
                  Replying to: {postTitle}
                </p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="bg-[#4b9aaa] p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Comment Guidelines */}
              <div className="bg-white/10 rounded-lg p-4">
                <p className="text-white text-sm">
                  <span className="font-semibold">💡 Comment Guidelines:</span>
                </p>
                <ul className="text-white/90 text-sm mt-2 space-y-1">
                  <li>• Be respectful and constructive</li>
                  <li>• Stay on topic</li>
                  <li>• Help build our community</li>
                </ul>
              </div>

              {/* Comment Textarea */}
              <div>
                <label className="block text-white font-semibold mb-2">
                  Your Comment
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border-2 border-white/20 bg-white/90 focus:bg-white focus:outline-none focus:border-[#eccc6e] transition-all resize-none"
                  rows={5}
                  placeholder="Share your thoughts..."
                  autoFocus
                  required
                />
                <div className="flex justify-between mt-2">
                  <p className="text-white/80 text-sm">
                    {comment.length}/500 characters
                  </p>
                  {comment.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setComment('')}
                      className="text-white/80 hover:text-white text-sm transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-3 px-6 bg-white/20 text-white font-semibold rounded-lg hover:bg-white/30 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !comment.trim()}
                  className="flex-1 py-3 px-6 bg-gradient-to-r from-[#eccc6e] to-[#dabb5d] text-[#814256] font-bold rounded-lg hover:from-[#dabb5d] hover:to-[#c9aa4c] transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
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