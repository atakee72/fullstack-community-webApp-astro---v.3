import React, { useState, useEffect } from 'react';
import { useCommentsQuery, useDeleteComment } from '../hooks/api/useCommentsQuery';
import type { Comment, User } from '../types';
import { isOwner as checkIsOwner, getUserDisplayName } from '../utils/authHelpers';

const REVEALED_WARNINGS_KEY = 'mahalle_revealed_comment_warnings';

interface CommentsListProps {
  postId: string;
  collectionType: string;
  postTitle?: string;
  onAddComment?: () => void;
  user?: User | null;
  onReportComment?: (commentId: string, preview: string) => void;
  reportedComments?: Set<string>;
}

export default function CommentsList({ postId, collectionType, postTitle, onAddComment, user, onReportComment, reportedComments = new Set() }: CommentsListProps) {
  // Use React Query for fetching comments
  const { data: comments = [], isLoading: loading } = useCommentsQuery(postId);
  const deleteCommentMutation = useDeleteComment(postId);

  // Track which warned comments have been revealed by the user (persisted to localStorage)
  const [revealedWarnings, setRevealedWarnings] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const stored = localStorage.getItem(REVEALED_WARNINGS_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Persist revealed warnings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(REVEALED_WARNINGS_KEY, JSON.stringify([...revealedWarnings]));
    } catch {
      // Ignore localStorage errors
    }
  }, [revealedWarnings]);

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteCommentMutation.mutateAsync(commentId);
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const formatDate = (date: number | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin inline-block text-3xl">⏳</div>
        <p className="text-gray-600 mt-2">Loading comments...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 relative">
      {/* Mobile Add Comment Button - At the top on mobile */}
      {user && onAddComment && (
        <div className="md:hidden mb-3">
          <button
            onClick={onAddComment}
            className="w-full py-1.5 bg-[#4b9aaa] text-white rounded-lg hover:bg-[#3a7a8a] transition-all flex items-center justify-center gap-1"
            title="Write a comment"
          >
            <span className="text-base">+</span>
            <span className="text-xs">Write a comment</span>
          </button>
        </div>
      )}

      {/* Comments List - Accordion Style */}
      {comments.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-gray-500 text-sm md:text-lg">No comments yet. Be the first to comment!</p>
        </div>
      ) : (
        <div className="accordion-wrap">
          <ul className="accordion-list">
            {comments.map((comment, i) => {
              const author = typeof comment.author === 'object' ? comment.author : null;
              const isCommentOwner = checkIsOwner(comment.author, user);

              return (
                <li key={comment._id} className="accordion-item group">
                  {/* Ribbon Header */}
                  <div className="ribbon bg-[#4b9aaa] group-hover:bg-[#eccc6e] text-white group-hover:text-gray-900 p-2 md:p-3 flex items-center justify-between transition-colors duration-300">
                    <div className="flex items-center gap-2 md:gap-3">
                      <span className="text-xs md:text-sm">{formatDate(comment.date)}</span>
                      <span className="font-semibold text-sm md:text-base">{getUserDisplayName(comment.author)}</span>

                      {author?.userPicture && (
                        <img
                          src={author.userPicture}
                          alt={author.name || author.userName}
                          className="w-6 h-6 md:w-8 md:h-8 rounded-full object-cover"
                        />
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Report button - only shown for non-owners */}
                      {user && !isCommentOwner && onReportComment && (
                        <button
                          onClick={() => onReportComment(comment._id as string, comment.body.substring(0, 50) + (comment.body.length > 50 ? '...' : ''))}
                          disabled={reportedComments.has(comment._id as string)}
                          className={`rounded px-1.5 py-0.5 md:px-2 md:py-1 text-xs transition-colors ${
                            reportedComments.has(comment._id as string)
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-gray-300 hover:bg-orange-400 text-gray-700 hover:text-white'
                          }`}
                          title={reportedComments.has(comment._id as string) ? "Already reported" : "Report comment"}
                        >
                          🚩
                        </button>
                      )}
                      {/* Delete button - only shown for comment owner, disabled during moderation */}
                      {isCommentOwner && (
                        <button
                          onClick={() => {
                            if (window.confirm('Delete your comment irreversibly?')) {
                              handleDeleteComment(comment._id as string);
                            }
                          }}
                          disabled={comment.moderationStatus === 'pending' || comment.moderationStatus === 'rejected'}
                          className={`rounded px-1.5 py-0.5 md:px-2 md:py-1 text-xs transition-colors ${
                            comment.moderationStatus === 'pending' || comment.moderationStatus === 'rejected'
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-gray-300 hover:bg-red-400 text-gray-700 hover:text-white'
                          }`}
                          title={comment.moderationStatus === 'pending' ? 'Cannot delete during review' : comment.moderationStatus === 'rejected' ? 'Comment was removed' : 'Delete comment'}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Content - Hidden by default, shown on hover with transition */}
                  <div className="content max-h-0 overflow-hidden group-hover:max-h-96 transition-all duration-300 ease-in-out bg-gray-300 border-l-4 border-[#4b9aaa]">
                    <div className="p-4">
                      {/* AI Flagged Banner - Only visible to comment author */}
                      {comment.moderationStatus === 'pending' && !comment.isUserReported && isCommentOwner && (
                        <div className="bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-3 flex items-start gap-2">
                          <span className="text-amber-500">⏳</span>
                          <div>
                            <p className="text-amber-800 font-medium text-sm">Your comment is under review</p>
                            <p className="text-amber-700 text-xs">It will be visible to others once approved.</p>
                          </div>
                        </div>
                      )}
                      {/* User Reported Banner - Only visible to comment author */}
                      {comment.moderationStatus === 'pending' && comment.isUserReported && isCommentOwner && (
                        <div className="bg-orange-50 border border-orange-200 rounded px-3 py-2 mb-3 flex items-start gap-2">
                          <span className="text-orange-500">🚩</span>
                          <div>
                            <p className="text-orange-800 font-medium text-sm">Your comment has been reported</p>
                            <p className="text-orange-700 text-xs">It is under review. Deletion is disabled until review is complete.</p>
                          </div>
                        </div>
                      )}
                      {/* Rejected Banner - Only visible to comment author */}
                      {comment.moderationStatus === 'rejected' && isCommentOwner && (
                        <div className="bg-red-50 border border-red-200 rounded px-3 py-2 mb-3 flex items-start gap-2">
                          <span className="text-red-500">✕</span>
                          <div>
                            <p className="text-red-800 font-medium text-sm">Your comment was removed</p>
                            <p className="text-red-700 text-xs">
                              {comment.rejectionReason ? `Reason: ${comment.rejectionReason}` : 'It violated community guidelines.'}
                            </p>
                          </div>
                        </div>
                      )}
                      {/* Warning Content - Blur until revealed (except for author) */}
                      {comment.hasWarningLabel && !isCommentOwner && !revealedWarnings.has(comment._id as string) ? (
                        // Blurred state with reveal button
                        <div className="relative">
                          <div className="bg-yellow-50 border border-yellow-300 rounded px-4 py-6 text-center">
                            <span className="text-yellow-600 text-2xl mb-2 block">⚠️</span>
                            <p className="text-yellow-800 font-bold text-sm mb-2">Content Warning</p>
                            <p className="text-yellow-700 text-sm mb-1">
                              This comment has been flagged for:
                            </p>
                            <p className="text-yellow-800 font-medium text-sm italic mb-3">
                              "{comment.warningText || 'Potentially sensitive content'}"
                            </p>
                            <p className="text-yellow-600 text-xs mb-3">
                              Click below if you wish to view this content.
                            </p>
                            <button
                              onClick={() => setRevealedWarnings(prev => new Set([...prev, comment._id as string]))}
                              className="px-4 py-1.5 bg-yellow-500 text-white text-sm font-medium rounded hover:bg-yellow-600 transition-colors"
                            >
                              Show content anyway
                            </button>
                          </div>
                        </div>
                      ) : (
                        // Revealed state or author view
                        <>
                          {comment.hasWarningLabel && (
                            <div className="bg-yellow-50 border border-yellow-300 rounded px-3 py-2 mb-3 flex items-start gap-2">
                              <span className="text-yellow-600">⚠️</span>
                              <div>
                                {isCommentOwner ? (
                                  <>
                                    <p className="text-yellow-800 font-medium text-sm">Your comment was approved with a warning</p>
                                    <p className="text-yellow-700 text-xs">
                                      {comment.warningText ? `Reason: ${comment.warningText}` : 'This content may be sensitive.'}
                                    </p>
                                  </>
                                ) : (
                                  <>
                                    <p className="text-yellow-800 font-medium text-sm">Content warning</p>
                                    <p className="text-yellow-700 text-xs">
                                      {comment.warningText ? `Reason: ${comment.warningText}` : 'This content may be sensitive.'}
                                    </p>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                          <p className="text-gray-700 leading-relaxed">{comment.body}</p>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}