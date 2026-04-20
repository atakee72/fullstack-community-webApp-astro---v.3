import { useQuery, useQueryClient } from '@tanstack/react-query';

const API_URL = '/api';

export const MY_REPORTED_IDS_KEY = ['my-reported-ids'] as const;

/**
 * Eager-loads the IDs of all content the current user has reported,
 * so flag buttons can render their "already reported" filled state on mount
 * (mirrors useSavedPostsQuery / liked-by patterns).
 */
export function useMyReportedIdsQuery(enabled: boolean) {
  return useQuery({
    queryKey: MY_REPORTED_IDS_KEY,
    queryFn: async () => {
      const res = await fetch(`${API_URL}/reports/my-reported-ids`, { credentials: 'include' });
      if (!res.ok) return { reportedIds: [] as string[] };
      return res.json() as Promise<{ reportedIds: string[] }>;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Optimistically add a contentId to the cached reported-ids set.
 * Call from report-submit handlers so the flag flips to "reported" immediately.
 */
export function useMarkAsReported() {
  const queryClient = useQueryClient();
  return (contentId: string) => {
    queryClient.setQueryData<{ reportedIds: string[] }>(
      MY_REPORTED_IDS_KEY,
      (prev) => {
        const current = prev?.reportedIds ?? [];
        if (current.includes(contentId)) return prev ?? { reportedIds: current };
        return { reportedIds: [...current, contentId] };
      }
    );
  };
}
