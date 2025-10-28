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
    onSuccess: () => {
      // Invalidate and refetch the posts query to update like counts
      queryClient.invalidateQueries({ queryKey: [collectionType] });
    },
  });
}