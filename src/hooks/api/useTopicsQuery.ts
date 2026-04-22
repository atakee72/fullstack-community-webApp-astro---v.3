import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Topic, Announcement, Recommendation } from '../../types';
import { qk, forumQk } from '../../lib/queryKeys';

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
  options: QueryOptions = {},
  extras: { initialData?: any[] } = {}
) {
  return useQuery({
    queryKey: forumQk(type).list(options),
    queryFn: () => fetchTopics(type, options),
    // Keep data cached for 1 minute - balances freshness with API efficiency
    staleTime: 60 * 1000,
    // Refetch when window regains focus
    refetchOnWindowFocus: true,
    // SSR hydration: when initialData is provided (e.g. from fetchForumItemsForSSR
    // in index.astro), treat it as fresh at hydration time so no immediate refetch.
    ...(extras.initialData
      ? {
          initialData: extras.initialData as any,
          initialDataUpdatedAt: Date.now(),
        }
      : {}),
  });
}

// Create a new topic/announcement/recommendation
async function createPost(
  type: 'topics' | 'announcements' | 'recommendations',
  data: { title: string; body?: string; description?: string; tags?: string[]; category?: string; images?: { url: string; publicId: string }[] }
) {
  const response = await fetch(`${API_URL}/${type}/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include cookies for NextAuth session
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    // Include validation details if available
    const details = error.details ? Object.values(error.details).join(', ') : '';
    throw new Error(details || error.error || `Failed to create ${type}`);
  }

  const result = await response.json();
  // Return full response to include moderationStatus and message
  return result;
}

// Hook for creating posts
export function useCreatePost(type: 'topics' | 'announcements' | 'recommendations') {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof createPost>[1]) => createPost(type, data),
    // Canonical v5: single invalidation in onSettled (runs on success + error).
    // Previously did both onSuccess + onSettled, which caused a double-refetch flicker.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: forumQk(type).all });
    },
    retry: false,
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
    queryKey: qk.topics.detail(id),
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
    credentials: 'include', // Include cookies for NextAuth session
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
      queryClient.invalidateQueries({ queryKey: forumQk(type).all });
    },
  });
}

// Edit a post
async function editPost(
  postId: string,
  type: 'topics' | 'announcements' | 'recommendations',
  data: { title: string; body: string; tags: string[]; images?: { url: string; publicId: string }[] }
) {
  const response = await fetch(`${API_URL}/${type}/edit/${postId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include cookies for NextAuth session
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    // Include validation details if available
    const details = error.details ? Object.values(error.details).join(', ') : '';
    throw new Error(details || error.error || 'Failed to update post');
  }

  return response.json();
}

// Hook for editing posts
export function useEditPost(type: 'topics' | 'announcements' | 'recommendations') {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, data }: { postId: string; data: { title: string; body: string; tags: string[]; images?: { url: string; publicId: string }[] } }) =>
      editPost(postId, type, data),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: forumQk(type).all });
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
    credentials: 'include', // Include cookies for NextAuth session
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
      queryClient.setQueryData(forumQk(type).all, (old: any[] | undefined) => {
        if (!old) return old;
        return old.filter(item => item._id !== postId);
      });

      // Also invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: forumQk(type).all });
    },
  });
}

// Save/bookmark posts
async function toggleSavePost(postId: string, action: 'save' | 'unsave') {
  const res = await fetch(`${API_URL}/posts/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ postId, action }),
  });
  if (!res.ok) throw new Error('Failed to save post');
  return res.json();
}

export function useSavePostMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, action }: { postId: string; action: 'save' | 'unsave' }) =>
      toggleSavePost(postId, action),
    onMutate: async ({ postId, action }) => {
      await queryClient.cancelQueries({ queryKey: qk.savedPosts });
      const prev = queryClient.getQueryData<{ savedIds: string[] }>(qk.savedPosts);
      queryClient.setQueryData(qk.savedPosts, (old: { savedIds: string[] } | undefined) => {
        const ids = old?.savedIds || [];
        return { savedIds: action === 'save' ? [...ids, postId] : ids.filter(id => id !== postId) };
      });
      return { prev };
    },
    onError: (_err: unknown, _vars: unknown, context: { prev?: { savedIds: string[] } } | undefined) => {
      if (context?.prev) queryClient.setQueryData(qk.savedPosts, context.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: qk.savedPosts });
    },
  });
}

export function useSavedPostsQuery(enabled: boolean) {
  return useQuery({
    queryKey: qk.savedPosts,
    queryFn: async () => {
      const res = await fetch(`${API_URL}/posts/save`, { credentials: 'include' });
      if (!res.ok) return { savedIds: [] as string[] };
      return res.json() as Promise<{ savedIds: string[] }>;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    // User-scoped set only this tab mutates. Skip refocus refetch.
    refetchOnWindowFocus: false,
  });
}