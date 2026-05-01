import { useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '../../lib/queryKeys';

const API_URL = '/api';

// Re-export under the old name so external imports keep working.
export const MY_REPORTED_IDS_KEY = qk.myReportedIds;

/**
 * Eager-loads the IDs of all content the current user has reported,
 * so flag buttons can render their "already reported" filled state on mount.
 */
export function useMyReportedIdsQuery(enabled: boolean) {
  return useQuery({
    queryKey: qk.myReportedIds,
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
      qk.myReportedIds,
      (prev) => {
        const current = prev?.reportedIds ?? [];
        if (current.includes(contentId)) return prev ?? { reportedIds: current };
        return { reportedIds: [...current, contentId] };
      }
    );
  };
}
