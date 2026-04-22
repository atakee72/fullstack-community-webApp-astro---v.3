import React from 'react';
import { QueryClient } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

// Create a client with optimized defaults.
// `gcTime` must be >= persist `maxAge` or queries are evicted before restore.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 5 seconds
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
        // Only persist successful query data; skip errors/loading shells.
        throttleTime: 1000,
      })
    : undefined;

interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  // Fall back to in-memory only during SSR (persister undefined).
  if (!persister) {
    return <>{children}</>;
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
          // Don't persist mutations or queries that are still loading.
          shouldDehydrateQuery: (q) => q.state.status === 'success',
        },
      }}
    >
      {children}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </PersistQueryClientProvider>
  );
}

// Export the client for imperative use
export { queryClient };
