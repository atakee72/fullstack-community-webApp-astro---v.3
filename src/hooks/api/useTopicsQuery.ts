import { useQuery } from '@tanstack/react-query';
import type { Topic, Announcement, Recommendation } from '../../types';
import { forumQk } from '../../lib/queryKeys';

const API_URL = '/api';

interface QueryOptions {
  fields?: string[];
  limit?: number;
  offset?: number;
  sortBy?: 'date' | 'likes' | 'views' | 'comments';
  sortOrder?: 'asc' | 'desc';
  search?: string;
  tags?: string[];
}

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

export function useTopicsQuery(
  type: 'topics' | 'announcements' | 'recommendations',
  options: QueryOptions = {},
  extras: { initialData?: any[] } = {}
) {
  return useQuery({
    queryKey: forumQk(type).list(options),
    queryFn: () => fetchTopics(type, options),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
    ...(extras.initialData
      ? {
          initialData: extras.initialData as any,
          initialDataUpdatedAt: Date.now(),
        }
      : {}),
  });
}
