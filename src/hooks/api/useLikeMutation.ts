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
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: [collectionType] });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData([collectionType]);

      // Optimistically update the cache
      queryClient.setQueryData([collectionType], (old: any) => {
        if (!old) return old;

        // Find and update the post
        const posts = Array.isArray(old) ? old : old[collectionType] || [];
        return posts.map((post: any) => {
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
      });

      // Return context with snapshot
      return { previousData };
    },

    // On error, revert to previous state
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData([collectionType], context.previousData);
      }
    },

    // Always refetch after mutation settles
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [collectionType] });
    },
  });
}