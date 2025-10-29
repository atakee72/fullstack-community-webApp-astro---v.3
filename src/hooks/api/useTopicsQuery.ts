import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Topic, Announcement, Recommendation } from '../../types';

const API_URL = '/api';

// Query options for field selection and pagination
interface QueryOptions {
  fields?: string[];
  limit?: number;
  offset?: number;
  sortBy?: 'date' | 'likes' | 'views' | 'comments';
  sortOrder?: 'asc' | 'desc';
  search?: string;
  tags?: string[];
}

// Build query string from options
function buildQueryString(options: QueryOptions = {}): string {
  const params = new URLSearchParams();

  if (options.fields?.length) {
    params.set('fields', options.fields.join(','));
  }
  if (options.limit !== undefined) {
    params.set('limit', options.limit.toString());
  }
  if (options.offset !== undefined) {
    params.set('offset', options.offset.toString());
  }
  if (options.sortBy) {
    params.set('sortBy', options.sortBy);
  }
  if (options.sortOrder) {
    params.set('sortOrder', options.sortOrder);
  }
  if (options.search) {
    params.set('search', options.search);
  }
  if (options.tags?.length) {
    params.set('tags', options.tags.join(','));
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

// Fetch topics with options
async function fetchTopics(
  type: 'topics' | 'announcements' | 'recommendations',
  options: QueryOptions = {}
): Promise<Topic[] | Announcement[] | Recommendation[]> {
  const queryString = buildQueryString(options);
  const response = await fetch(`${API_URL}/${type}${queryString}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${type}`);
  }

  const data = await response.json();
  return data[type] || [];
}

// Hook for fetching topics/announcements/recommendations
export function useTopicsQuery(
  type: 'topics' | 'announcements' | 'recommendations',
  options: QueryOptions = {}
) {
  return useQuery({
    queryKey: [type, options],
    queryFn: () => fetchTopics(type, options),
    // Keep data fresh for 5 seconds for more responsive updates
    staleTime: 5 * 1000,
    // Refetch when window regains focus
    refetchOnWindowFocus: true,
  });
}

// Create a new topic/announcement/recommendation
async function createPost(
  type: 'topics' | 'announcements' | 'recommendations',
  data: { title: string; body?: string; description?: string; tags?: string[]; category?: string }
) {
  const response = await fetch(`${API_URL}/${type}/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include cookies for Better Auth session
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Failed to create ${type}`);
  }

  const result = await response.json();
  return result[type.slice(0, -1)] || result;
}

// Hook for creating posts
export function useCreatePost(type: 'topics' | 'announcements' | 'recommendations') {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof createPost>[1]) => createPost(type, data),
    onSuccess: async () => {
      // Immediately invalidate and refetch all related queries
      await queryClient.invalidateQueries({
        queryKey: [type],
        refetchType: 'all'
      });
    },
    onSettled: async () => {
      // Final refresh to ensure consistency
      await queryClient.invalidateQueries({
        queryKey: [type],
        refetchType: 'active'
      });
    },
    retry: false, // Disable automatic retries
  });
}

// Fetch a single topic by ID
async function fetchTopicById(id: string): Promise<Topic> {
  const response = await fetch(`${API_URL}/topics/${id}`);

  if (!response.ok) {
    throw new Error('Failed to fetch topic');
  }

  const data = await response.json();
  return data.topic;
}

// Hook for fetching a single topic
export function useTopicQuery(id: string) {
  return useQuery({
    queryKey: ['topic', id],
    queryFn: () => fetchTopicById(id),
    enabled: !!id,
  });
}

// Update likes
async function updateLikes(
  postId: string,
  action: 'like' | 'unlike',
  type: 'topics' | 'announcements' | 'recommendations'
) {
  const response = await fetch(`${API_URL}/${type}/${postId}/like`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include cookies for Better Auth session
    body: JSON.stringify({ action }),
  });

  if (!response.ok) {
    throw new Error('Failed to update likes');
  }

  return response.json();
}

// Hook for updating likes
export function useLikeMutation(type: 'topics' | 'announcements' | 'recommendations') {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, action }: { postId: string; action: 'like' | 'unlike' }) =>
      updateLikes(postId, action, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [type] });
    },
  });
}

// Edit a post
async function editPost(
  postId: string,
  type: 'topics' | 'announcements' | 'recommendations',
  data: { title: string; body: string; tags: string[] }
) {
  const response = await fetch(`${API_URL}/${type}/edit/${postId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include cookies for Better Auth session
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update post');
  }

  return response.json();
}

// Hook for editing posts
export function useEditPost(type: 'topics' | 'announcements' | 'recommendations') {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, data }: { postId: string; data: { title: string; body: string; tags: string[] } }) =>
      editPost(postId, type, data),
    onSuccess: async () => {
      // Immediately invalidate and refetch all related queries
      await queryClient.invalidateQueries({
        queryKey: [type],
        refetchType: 'all'
      });
    },
    onSettled: async () => {
      // Final refresh to ensure consistency
      await queryClient.invalidateQueries({
        queryKey: [type],
        refetchType: 'active'
      });
    },
  });
}

// Delete a post
async function deletePost(
  postId: string,
  type: 'topics' | 'announcements' | 'recommendations'
) {
  const response = await fetch(`${API_URL}/${type}/delete/${postId}`, {
    method: 'DELETE',
    credentials: 'include', // Include cookies for Better Auth session
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Failed to delete ${type.slice(0, -1)}`);
  }

  return response.json();
}

// Hook for deleting posts
export function useDeletePost(type: 'topics' | 'announcements' | 'recommendations') {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => deletePost(postId, type),
    onSuccess: (data, postId) => {
      // Remove the deleted item from the cache
      queryClient.setQueryData([type], (old: any[] | undefined) => {
        if (!old) return old;
        return old.filter(item => item._id !== postId);
      });

      // Also invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: [type] });
    },
  });
}