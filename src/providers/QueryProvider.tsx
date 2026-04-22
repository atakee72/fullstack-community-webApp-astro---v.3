import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

// `gcTime` must be >= persist `maxAge` or queries are evicted before restore.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 1000,
      // Keep cache for 24 hours so persisted entries survive a page reload
      // and get rehydrated instantly. Stale entries still refetch in the
      // background — we're only caching for perceived speed.
      gcTime: 24 * 60 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: true,
      refetchOnReconnect: 'always',
      refetchInterval: false,
      refetchIntervalInBackground: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

interface QueryProviderProps {
  children: React.ReactNode;
}

// We always render the same JSX tree on SSR and client — otherwise React
// throws hydration-mismatch errors. The cache persister attaches imperatively
// in a client-only useEffect, so it doesn't affect the rendered markup.
export function QueryProvider({ children }: QueryProviderProps) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const persister = createSyncStoragePersister({
      storage: window.localStorage,
      key: 'mahalle-rq-cache',
      throttleTime: 1000,
    });
    const [unsubscribe] = persistQueryClient({
      queryClient,
      persister,
      maxAge: 24 * 60 * 60 * 1000,
      buster: 'v1',
      dehydrateOptions: {
        shouldDehydrateQuery: (q) => q.state.status === 'success',
      },
    });
    return () => {
      unsubscribe?.();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

export { queryClient };
