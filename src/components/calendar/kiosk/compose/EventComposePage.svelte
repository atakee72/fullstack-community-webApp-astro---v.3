<script lang="ts">
  // /events/create QueryClient provider. Same wrapper pattern as
  // forum's ComposePage.svelte so the mutation hooks can read the
  // client via useQueryClient() inside the inner component.

  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import EventComposePageInner from './EventComposePageInner.svelte';
  import type { Event as EventDoc } from '../../../../types';

  let { currentUser, mode = 'create', initialEvent } = $props<{
    currentUser: { id: string; name?: string; image?: string | null };
    mode?: 'create' | 'edit';
    initialEvent?: EventDoc;
  }>();

  const client = new QueryClient({
    defaultOptions: {
      queries: { staleTime: 60_000, refetchOnWindowFocus: false }
    }
  });
</script>

<QueryClientProvider {client}>
  <EventComposePageInner {currentUser} {mode} {initialEvent} />
</QueryClientProvider>
