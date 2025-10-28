import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Comment } from '../../types';

const API_URL = '/api';

// Fetch comments for a post
async function fetchComments(postId: string): Promise<Comment[]> {
  const response = await fetch(`${API_URL}/comments/${postId}`);

  if (!response.ok) {
    throw new Error('Failed to fetch comments');
  }

  const data = await response.json();
  return data.comments || [];
}

// Hook for fetching comments
export function useCommentsQuery(postId: string) {
  return useQuery({
    queryKey: ['comments', postId],
    queryFn: () => fetchComments(postId),
    enabled: !!postId,
    // Comments stay fresh for 30 seconds
    staleTime: 30 * 1000,
  });
}

// Create a new comment
async function createComment(data: {
  body: string;
  topicId: string;
  collectionType: 'topics' | 'announcements' | 'recommendations';
}) {
  const response = await fetch(`${API_URL}/comments/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include cookies for Better Auth session
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create comment');
  }

  const result = await response.json();
  return result.comment;
}

// Hook for creating comments
export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createComment,
    onSuccess: (newComment, variables) => {
      // Add the new comment to the cache
      queryClient.setQueryData(
        ['comments', variables.topicId],
        (old: Comment[] | undefined) => {
          if (!old) return [newComment];
          return [...old, newComment];
        }
      );

      // Also update the comment count in the parent post
      queryClient.invalidateQueries({
        queryKey: [variables.collectionType],
        exact: false
      });
    },
  });
}

// Delete a comment
async function deleteComment(commentId: string) {
  const response = await fetch(`${API_URL}/comments/delete/${commentId}`, {
    method: 'DELETE',
    credentials: 'include', // Include cookies for Better Auth session
  });

  if (!response.ok) {
    throw new Error('Failed to delete comment');
  }

  return response.json();
}

// Hook for deleting comments
export function useDeleteComment(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteComment,
    onSuccess: (data, commentId) => {
      // Remove the comment from cache
      queryClient.setQueryData(
        ['comments', postId],
        (old: Comment[] | undefined) => {
          if (!old) return old;
          return old.filter(comment => comment._id !== commentId);
        }
      );

      // Invalidate parent posts to update comment count
      queryClient.invalidateQueries({
        queryKey: ['topics'],
        exact: false
      });
    },
  });
}