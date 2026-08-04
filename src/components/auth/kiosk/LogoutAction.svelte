<script>
  import { onMount } from 'svelte';
  import { signOut } from 'auth-astro/client';

  onMount(async () => {
    try {
      // callbackUrl is required here: auth-astro's signOut always navigates
      // to callbackUrl, which defaults to the CURRENT url — omitting it on
      // /logout would bounce right back onto this page.
      await signOut({ callbackUrl: '/login?abgemeldet=1' });
    } catch {
      window.location.href = '/login?abgemeldet=1';
    }
  });
</script>
