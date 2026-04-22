import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
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

// SSR guard — localStorage is undefined during Astro server render.
const persister =
  typeof window !== 'undefined'
    ? createSyncStoragePersister({
        storage: window.localStorage,
        key: 'mahalle-rq-cache',
        throttleTime: 1000,
      })
    : null;

interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  // On the server (and any edge case where window is missing), use a plain
  // QueryClientProvider so useQuery calls still find a client. On the
  // client, upgrade to PersistQueryClientProvider which hydrates the cache
  // from localStorage before rendering children.
  if (!persister) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 24 * 60 * 60 * 1000, // match gcTime
        // Bump the buster to invalidate all persisted caches on schema changes.
        buster: 'v1',
        dehydrateOptions: {
          shouldDehydrateQuery: (q) => q.state.status === 'success',
        },
      }}
    >
      {children}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </PersistQueryClientProvider>
  );
}

export { queryClient };
