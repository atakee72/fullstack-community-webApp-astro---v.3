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

export function useLikeMutation(collectionType: 'topics' | 'announcements' | 'recommendations') {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: toggleLike,

    // Optimistic update for immediate UI feedback
    onMutate: async ({ postId, action }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: [collectionType] });

      // Get all query variations that might contain this data
      const queries = queryClient.getQueriesData({ queryKey: [collectionType] });

      // Store all previous data for potential rollback
      const previousQueries = queries.map(([queryKey, data]) => ({
        queryKey,
        data
      }));

      // Update all matching queries optimistically
      queries.forEach(([queryKey, oldData]) => {
        queryClient.setQueryData(queryKey, (old: any) => {
          if (!old) return old;

          // Handle different data structures
          const posts = Array.isArray(old) ? old : (old[collectionType] || []);
          const updatedPosts = posts.map((post: any) => {
            if (post._id === postId) {
              return {
                ...post,
                likes: action === 'like' ? (post.likes || 0) + 1 : Math.max((post.likes || 0) - 1, 0),
                likedBy: action === 'like'
                  ? [...(post.likedBy || []), 'optimistic-user-id']
                  : (post.likedBy || []).filter((id: string) => id !== 'optimistic-user-id')
              };
            }
            return post;
          });

          // Return data in the same structure
          return Array.isArray(old) ? updatedPosts : { ...old, [collectionType]: updatedPosts };
        });
      });

      return { previousQueries };
    },

    // On error, rollback all queries
    onError: (_err, _variables, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(({ queryKey, data }) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },

    // Single invalidation point after mutation settles
    onSettled: async () => {
      // Invalidate only active queries to reduce network calls
      await queryClient.invalidateQueries({
        queryKey: [collectionType],
        refetchType: 'active'
      });
    },
  });
}