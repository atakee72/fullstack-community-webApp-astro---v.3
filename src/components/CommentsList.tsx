import React from 'react';
import { useCommentsQuery, useDeleteComment } from '../hooks/api/useCommentsQuery';
import type { Comment, User } from '../types';

interface CommentsListProps {
  postId: string;
  collectionType: string;
  postTitle?: string;
  onAddComment?: () => void;
  user?: User | null;
}

export default function CommentsList({ postId, collectionType, postTitle, onAddComment, user }: CommentsListProps) {
  // Use React Query for fetching comments
  const { data: comments = [], isLoading: loading } = useCommentsQuery(postId);
  const deleteCommentMutation = useDeleteComment(postId);

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
              // Check ownership - Handle multiple ID formats
              const authorId = author?.id || author?.betterAuthId || author?._id;
              const userId = user?.id || user?._id;
              const isOwner = userId && authorId && userId === authorId;

              return (
                <li key={comment._id} className="accordion-item group">
                  {/* Ribbon Header */}
                  <div className="ribbon bg-[#4b9aaa] group-hover:bg-[#eccc6e] text-white group-hover:text-gray-900 p-2 md:p-3 flex items-center justify-between transition-colors duration-300">
                    <div className="flex items-center gap-2 md:gap-3">
                      <span className="text-xs md:text-sm">{formatDate(comment.date)}</span>
                      <span className="font-semibold text-sm md:text-base">{author?.name || author?.userName || 'Anonymous'}</span>

                      {author?.userPicture && (
                        <img
                          src={author.userPicture}
                          alt={author.name || author.userName}
                          className="w-6 h-6 md:w-8 md:h-8 rounded-full object-cover"
                        />
                      )}
                    </div>

                    {/* Delete button - only shown for comment owner */}
                    {isOwner && (
                      <button
                        onClick={() => {
                          if (window.confirm('Delete your comment irreversibly?')) {
                            handleDeleteComment(comment._id as string);
                          }
                        }}
                        className="bg-gray-300 hover:bg-red-400 text-gray-700 hover:text-white rounded px-1.5 py-0.5 md:px-2 md:py-1 text-xs transition-colors"
                        title="Delete comment"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Content - Hidden by default, shown on hover with transition */}
                  <div className="content max-h-0 overflow-hidden group-hover:max-h-96 transition-all duration-300 ease-in-out bg-gray-300 border-l-4 border-[#4b9aaa]">
                    <div className="p-4">
                      <p className="text-gray-700 leading-relaxed">{comment.body}</p>
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