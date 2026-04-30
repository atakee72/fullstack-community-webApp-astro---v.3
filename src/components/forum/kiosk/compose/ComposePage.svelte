<script lang="ts">
  // /topics/create QueryClient provider. Same wrapper pattern as
  // ForumIndex.svelte so the mutation hook can read the client via
  // useQueryClient() inside the inner component.

  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import ComposePageInner from './ComposePageInner.svelte';

  let { currentUser } = $props<{
    currentUser: { id: string; name?: string; image?: string | null };
  }>();

  const client = new QueryClient({
    defaultOptions: {
      queries: { staleTime: 60_000, refetchOnWindowFocus: false }
    }
  });
</script>

<QueryClientProvider {client}>
  <ComposePageInner {currentUser} />
</QueryClientProvider>
