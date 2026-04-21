import { useMutation, useQueryClient } from '@tanstack/react-query';

interface LikeToggleParams {
  postId: string;
  collectionType: 'topics' | 'announcements' | 'recommendations';
  action: 'like' | 'unlike';
}

interface LikeToggleResponse {
  success: boolean;
  action: 'like' | 'unlike';
  likeCount: number;
  isLiked: boolean;
}

const toggleLike = async (params: LikeToggleParams): Promise<LikeToggleResponse> => {
  const response = await fetch('/api/likes/toggle', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to toggle like');
  }

  return response.json();
};

export function useLikeMutation(
  collectionType: 'topics' | 'announcements' | 'recommendations',
  userId?: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: toggleLike,

    // Optimistic update for immediate UI feedback
    onMutate: async ({ postId, action }) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: [collectionType] });

      // Snapshot all query variations for rollback
      const queries = queryClient.getQueriesData({ queryKey: [collectionType] });
      const previousQueries = queries.map(([queryKey, data]) => ({ queryKey, data }));

      // Update all matching queries optimistically
      queries.forEach(([queryKey]) => {
        queryClient.setQueryData(queryKey, (old: any) => {
          if (!old) return old;

          const posts = Array.isArray(old) ? old : (old[collectionType] || []);
          const updatedPosts = posts.map((post: any) => {
            if (post._id !== postId) return post;
            const currentLikedBy: string[] = post.likedBy || [];
            const nextLikedBy =
              action === 'like'
                ? userId && !currentLikedBy.includes(userId)
                  ? [...currentLikedBy, userId]
                  : currentLikedBy
                : userId
                ? currentLikedBy.filter((id) => id !== userId)
                : currentLikedBy;
            return {
              ...post,
              likes:
                action === 'like'
                  ? (post.likes || 0) + 1
                  : Math.max((post.likes || 0) - 1, 0),
              likedBy: nextLikedBy,
            };
          });

          return Array.isArray(old) ? updatedPosts : { ...old, [collectionType]: updatedPosts };
        });
      });

      return { previousQueries };
    },

    // Rollback on error
    onError: (_err, _variables, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(({ queryKey, data }) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },

    // Single eventual-consistency invalidation (canonical TanStack v5 pattern)
    onSettled: () => {
      return queryClient.invalidateQueries({ queryKey: [collectionType] });
    },
  });
}