<script lang="ts">
  // Phase 4a — forum index, Editorial Kiosk shell.
  //
  // This wrapper owns the Svelte Query client; the actual rendering lives
  // in ForumIndexInner so it can call createQuery() through context.
  // (Svelte Query 6's createQuery reads from QueryClientProvider context,
  // so the consumer must be a descendant.)

  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import ForumIndexInner from './ForumIndexInner.svelte';

  let { initialTopics = [] } = $props<{
    initialTopics?: any[];
  }>();

  const client = new QueryClient({
    defaultOptions: {
      queries: { staleTime: 60_000, refetchOnWindowFocus: false }
    }
  });
</script>

<QueryClientProvider {client}>
  <ForumIndexInner {initialTopics} />
</QueryClientProvider>
