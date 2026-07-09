<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from '../../../lib/kiosk-i18n';

  // Negative-result cache: most users are not banned; skip re-checking for
  // the rest of the browser session. A mid-session ban therefore shows up
  // on the next browser session (or after storage clear) — the write APIs'
  // 403 guard is the real enforcement; this banner is communication.
  const OK_KEY = 'mahalle-ban-checked-ok';

  let visible = $state(false);

  onMount(async () => {
    try {
      if (sessionStorage.getItem(OK_KEY)) return;
    } catch { /* storage disabled → just check */ }
    try {
      const res = await fetch('/api/auth/account-status');
      if (!res.ok) return; // no session / error → show nothing
      const data = await res.json();
      if (data?.banned === true) {
        visible = true; // never cache the banned state
      } else {
        try { sessionStorage.setItem(OK_KEY, '1'); } catch { /* best-effort */ }
      }
    } catch { /* network error → show nothing */ }
  });
</script>

{#if visible}
  <div class="suspended-banner" role="alert">
    <div class="suspended-banner-inner">
      <span class="suspended-banner-x" aria-hidden="true">✕</span>
      <span class="font-bricolage suspended-banner-text">
        <strong>{$t['auth.banner.suspendedTitle']}</strong>
        {$t['auth.banner.suspendedBody']}
      </span>
    </div>
  </div>
{/if}

<style>
  .suspended-banner {
    background: var(--k-danger);
    border-bottom: 1.5px solid var(--k-ink);
  }
  .suspended-banner-inner {
    max-width: 80rem;
    margin: 0 auto;
    padding: 10px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .suspended-banner-x { color: var(--k-paper); font-size: 17px; flex-shrink: 0; }
  .suspended-banner-text { font-size: 12.5px; line-height: 1.45; color: var(--k-paper); }
  .suspended-banner-text strong { font-weight: 700; margin-right: 6px; }
</style>
