<script lang="ts">
  // Calendar entry island — Editorial Kiosk shell.
  //
  // Mirrors `forum/kiosk/ForumIndex.svelte`: this wrapper owns the
  // Svelte Query client; `CalendarPageInner` consumes it via context
  // (createQuery() reads from QueryClientProvider context, so the
  // consumer must be a descendant).

  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import CalendarPageInner from './CalendarPageInner.svelte';

  let {
    initialEvents = [],
    currentUserId = null
  } = $props<{
    initialEvents?: any[];
    currentUserId?: string | null;
  }>();

  const client = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true
      }
    }
  });
</script>

<QueryClientProvider {client}>
  <CalendarPageInner {initialEvents} {currentUserId} />
</QueryClientProvider>
