import React, { useState, useEffect, useRef } from 'react';
import { useCommentsQuery, useCreateComment, useDeleteComment } from '../hooks/api/useCommentsQuery';
import { confirmAction } from '../utils/toast';
import { format } from 'date-fns';
import type { User } from '../types';

interface ReadMoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  body: string;
  author?: string;
  date?: string | number | Date;
  tags?: string[];
  images?: { url: string; publicId: string }[];
  postId?: string;
  collectionType?: string;
  user?: User | null;
  onReportComment?: (commentId: string, preview: string) => void;
  reportedComments?: Set<string>;
}

export default function ReadMoreModal({
  isOpen,
  onClose,
  title,
  body,
  author,
  date,
  tags,
  images,
  postId,
  collectionType,
  user,
  onReportComment,
  reportedComments = new Set()
}: ReadMoreModalProps) {
  const [commentText, setCommentText] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [commentModerationMessage, setCommentModerationMessage] = useState('');
  const [revealedWarnings, setRevealedWarnings] = useState<Set<string>>(new Set());
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  const scrollCarousel = (direction: 1 | -1) => {
    const el = carouselRef.current;
    if (!el) return;
    const card = el.querySelector('[data-carousel-item]') as HTMLElement;
    if (!card) return;
    el.scrollBy({ left: direction * (card.offsetWidth + 12), behavior: 'smooth' });
  };

  const { data: comments = [], isLoading: commentsLoading } = useCommentsQuery(postId || '');
  const createComment = useCreateComment();
  const deleteComment = useDeleteComment(postId || '');

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formatDate = (dateValue: string | number | Date | undefined) => {
    if (!dateValue) return '';
    return new Date(dateValue).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isCommentAuthor = (comment: any) => {
    if (!user) return false;
    const authorId = typeof comment.author === 'object' ? comment.author?._id : comment.author;
    return authorId?.toString() === user.id;
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !postId || !collectionType) return;

    setIsAddingComment(true);
    try {
      const result = await createComment.mutateAsync({
        body: commentText.trim(),
        topicId: postId,
        collectionType
      });

      setCommentText('');

      if (result?.moderationStatus === 'pending') {
        setCommentModerationMessage('Your comment has been submitted for review. It will be visible once approved.');
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsAddingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (await confirmAction('Delete your comment irreversibly?', { title: 'Delete Comment', confirmLabel: 'Delete', variant: 'danger' })) {
      setDeletingCommentId(commentId);
      // Wait for CSS collapse animation before actually deleting
      setTimeout(async () => {
        try {
          await deleteComment.mutateAsync(commentId);
        } catch (error) {
          console.error('Failed to delete comment:', error);
        } finally {
          setDeletingCommentId(null);
        }
      }, 300);
    }
  };

  // Close when clicking backdrop (outside the modal panel)
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-3"
      onClick={handleBackdropClick}
    >
      <div ref={modalRef} className="bg-white rounded-lg w-full max-w-3xl max-h-[85vh] flex flex-col">
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
        <div className="flex-1 overflow-y-auto p-6 bg-gray-200">
          {/* Image Carousel */}
          {images && images.length > 0 && (
            <div className="mb-4 -mx-6 px-6 relative">
              <div
                ref={carouselRef}
                className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2"
              >
                {images.map((img, i) => (
                  <div
                    key={i}
                    data-carousel-item
                    className={`snap-start shrink-0 rounded-lg overflow-hidden ${images.length === 1 ? 'w-full' : 'w-[65%]'}`}
                  >
                    <img
                      src={img.url}
                      alt={`Image ${i + 1}`}
                      className="w-full max-h-64 sm:max-h-80 object-contain"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => scrollCarousel(-1)}
                    className="absolute left-7 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 shadow hover:bg-white flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
                    aria-label="Previous image"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <button
                    onClick={() => scrollCarousel(1)}
                    className="absolute right-7 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 shadow hover:bg-white flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
                    aria-label="Next image"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </>
              )}
            </div>
          )}

          <div className="prose max-w-none">
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{body}</p>
          </div>

          {/* Comments Section */}
          {postId && (
            <div className="border-t border-gray-300 pt-4 mt-6">
              <h3 className="text-base font-semibold text-gray-800 mb-2">
                Comments ({comments.length})
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

              {/* Moderation Feedback Message */}
              {commentModerationMessage && (
                <div className="bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-3 flex items-start gap-2">
                  <span className="text-amber-500">⏳</span>
                  <p className="text-amber-800 text-sm">{commentModerationMessage}</p>
                </div>
              )}

              {/* Comments List */}
              {commentsLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin inline-block text-2xl">⏳</div>
                  <p className="text-gray-500 text-sm mt-1">Loading comments...</p>
                </div>
              ) : comments.length > 0 ? (
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {comments.map((comment: any, idx: number) => {
                    const isAuthor = isCommentAuthor(comment);
                    const commentId = comment._id?.toString() || idx.toString();
                    const isDeleting = deletingCommentId === commentId;

                    return (
                      <div
                        key={commentId}
                        className="bg-gray-100 rounded-lg p-1.5 flex items-center gap-1.5 transition-all duration-300 ease-out overflow-hidden"
                        style={{
                          maxHeight: isDeleting ? '0px' : '500px',
                          opacity: isDeleting ? 0 : 1,
                          padding: isDeleting ? '0 6px' : undefined,
                          marginBottom: isDeleting ? '0px' : undefined,
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="font-semibold text-xs text-gray-800">
                              {comment.author?.userName || comment.author?.name || 'Anonymous'}
                            </span>
                            <span className="text-[10px] text-gray-500">
                              {comment.createdAt ? format(new Date(comment.createdAt), 'MMM d, h:mm a') : comment.date ? format(new Date(comment.date), 'MMM d, h:mm a') : ''}
                            </span>
                          </div>

                          {/* AI Flagged Banner - Only visible to comment author */}
                          {comment.moderationStatus === 'pending' && !comment.isUserReported && isAuthor && (
                            <div className="bg-amber-50 border border-amber-200 rounded px-2 py-1 mb-1 flex items-center gap-1.5">
                              <span className="text-amber-500 text-xs">⏳</span>
                              <p className="text-amber-800 text-[10px]">Your comment is under review</p>
                            </div>
                          )}

                          {/* User Reported Banner - Only visible to comment author */}
                          {comment.moderationStatus === 'pending' && comment.isUserReported && isAuthor && (
                            <div className="bg-orange-50 border border-orange-200 rounded px-2 py-1 mb-1 flex items-center gap-1.5">
                              <span className="text-orange-500 text-xs">🚩</span>
                              <p className="text-orange-800 text-[10px]">Your comment has been reported</p>
                            </div>
                          )}

                          {/* Rejected Banner - Only visible to comment author */}
                          {comment.moderationStatus === 'rejected' && isAuthor && (
                            <div className="bg-red-50 border border-red-200 rounded px-2 py-1 mb-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-red-500 text-xs">✕</span>
                                <p className="text-red-800 text-[10px] font-medium">Your comment was removed</p>
                              </div>
                              {comment.rejectionReason && (
                                <p className="text-red-700 text-[10px] mt-0.5 pl-4 italic">
                                  Reason: {comment.rejectionReason}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Warning Content - Blur until revealed (except for author) */}
                          {comment.hasWarningLabel === true && !isAuthor && !revealedWarnings.has(commentId) ? (
                            <div className="bg-yellow-50 border border-yellow-300 rounded px-2 py-3 text-center">
                              <span className="text-yellow-600 text-lg mb-1 block">⚠️</span>
                              <p className="text-yellow-800 font-bold text-[10px] mb-1">Content Warning</p>
                              <p className="text-yellow-700 text-[10px] italic mb-2">
                                "{comment.warningText || 'Potentially sensitive content'}"
                              </p>
                              <button
                                onClick={() => setRevealedWarnings(prev => new Set([...prev, commentId]))}
                                className="px-2 py-0.5 bg-yellow-500 text-white text-[10px] font-medium rounded hover:bg-yellow-600 transition-colors"
                              >
                                Show anyway
                              </button>
                            </div>
                          ) : (
                            <>
                              {comment.hasWarningLabel && (
                                <div className="bg-yellow-50 border border-yellow-300 rounded px-2 py-1 mb-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-yellow-600 text-xs">⚠️</span>
                                    <p className="text-yellow-800 text-[10px] font-medium">
                                      {isAuthor ? 'Your comment was approved with a warning' : 'Content warning'}
                                    </p>
                                  </div>
                                  {comment.warningText && (
                                    <p className="text-yellow-700 text-[10px] mt-0.5 pl-4 italic">
                                      Reason: {comment.warningText}
                                    </p>
                                  )}
                                </div>
                              )}
                              <p className="text-xs text-gray-700 leading-snug">{comment.body}</p>
                            </>
                          )}
                        </div>

                        {/* Action buttons - right side */}
                        <div className="flex flex-col gap-1 flex-shrink-0 pr-2">
                          {/* Report button */}
                          {user && !isAuthor && comment._id && onReportComment && (
                            <button
                              onClick={() => onReportComment(comment._id as string, (comment.body || '').substring(0, 50) + ((comment.body || '').length > 50 ? '...' : ''))}
                              disabled={reportedComments.has(comment._id as string)}
                              className={`text-xs transition-colors ${
                                reportedComments.has(comment._id as string)
                                  ? 'text-gray-400 cursor-not-allowed'
                                  : 'text-gray-400 hover:text-red-500'
                              }`}
                              title={reportedComments.has(comment._id as string) ? "Already reported" : "Report comment"}
                            >
                              🚩
                            </button>
                          )}
                          {/* Delete button */}
                          {isAuthor && comment._id && (
                            <button
                              onClick={() => handleDeleteComment(comment._id as string)}
                              disabled={comment.moderationStatus === 'pending' || comment.moderationStatus === 'rejected'}
                              className={`text-xs transition-colors ${
                                comment.moderationStatus === 'pending' || comment.moderationStatus === 'rejected'
                                  ? 'text-gray-400 cursor-not-allowed'
                                  : 'text-gray-400 hover:text-red-500'
                              }`}
                              title={comment.moderationStatus === 'pending' ? 'Cannot delete during review' : comment.moderationStatus === 'rejected' ? 'Comment was removed' : 'Delete comment'}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">No comments yet. Be the first to comment!</p>
              )}
            </div>
          )}
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
