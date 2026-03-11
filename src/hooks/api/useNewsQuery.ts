import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { NewsItem } from '../../types';

const API_URL = '/api';

interface NewsQueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'publishedAt' | 'approvedAt' | 'viewCount';
  sortOrder?: 'asc' | 'desc';
  source?: 'ai_fetched' | 'user_submitted';
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface NewsResponse {
  news: NewsItem[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

function buildQueryString(options: NewsQueryOptions = {}): string {
  const params = new URLSearchParams();

  if (options.limit !== undefined) params.set('limit', options.limit.toString());
  if (options.offset !== undefined) params.set('offset', options.offset.toString());
  if (options.sortBy) params.set('sortBy', options.sortBy);
  if (options.sortOrder) params.set('sortOrder', options.sortOrder);
  if (options.source) params.set('source', options.source);
  if (options.search) params.set('search', options.search);
  if (options.dateFrom) params.set('dateFrom', options.dateFrom);
  if (options.dateTo) params.set('dateTo', options.dateTo);

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

async function fetchNews(options: NewsQueryOptions = {}): Promise<NewsResponse> {
  const queryString = buildQueryString(options);
  const response = await fetch(`${API_URL}/news${queryString}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch news');
  }

  return response.json();
}

// Hook for fetching news
export function useNewsQuery(options: NewsQueryOptions = {}) {
  return useQuery({
    queryKey: ['news', options],
    queryFn: () => fetchNews(options),
    staleTime: 60 * 1000, // News doesn't change rapidly — 1 minute stale time
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

// Submit news
async function submitNews(data: {
  title: string;
  description: string;
  sourceUrl: string;
  sourceName: string;
  imageUrl?: string;
  submitterComment?: string;
}) {
  const response = await fetch(`${API_URL}/news/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to submit news');
  }

  return response.json();
}

// Hook for submitting news
export function useSubmitNews() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: submitNews,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['news'],
        refetchType: 'all'
      });
    },
    retry: false,
  });
}

// Save/unsave news
async function toggleSaveNews(newsId: string, action: 'save' | 'unsave') {
  const response = await fetch(`${API_URL}/news/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ newsId, action }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to save news');
  }

  return response.json();
}

// Hook for saving/unsaving news
export function useSaveNewsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ newsId, action }: { newsId: string; action: 'save' | 'unsave' }) =>
      toggleSaveNews(newsId, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news'] });
      queryClient.invalidateQueries({ queryKey: ['savedNews'] });
    },
  });
}

// Fetch saved news IDs from server
async function fetchSavedNewsIds(): Promise<string[]> {
  const response = await fetch(`${API_URL}/news/save`, {
    credentials: 'include',
  });

  if (!response.ok) return [];

  const data = await response.json();
  return data.savedIds || [];
}

// Hook for loading saved news IDs
export function useSavedNewsQuery(enabled: boolean) {
  return useQuery({
    queryKey: ['savedNews'],
    queryFn: fetchSavedNewsIds,
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
