<script lang="ts">
  // Bell + unread badge in the kiosk nav's right cluster. Owns the 90s
  // count polling (visible tab only) and the panel open state. Mounted
  // only for logged-in users (KioskNav gates on user?.name).
  import { t } from '../../../lib/kiosk-i18n';
  import NotificationPanel from './NotificationPanel.svelte';

  let { onOpenChange = (_open: boolean) => {} } = $props<{
    onOpenChange?: (open: boolean) => void;
  }>();

  let unreadCount = $state(0);
  let open = $state(false);
  let bellEl = $state<HTMLElement | null>(null);

  async function refreshCount() {
    try {
      const r = await fetch('/api/notifications?count=1');
      if (!r.ok) return;
      const d = await r.json();
      unreadCount = d.unreadCount ?? 0;
    } catch {
      /* offline/transient — badge keeps its last value */
    }
  }

  $effect(() => {
    refreshCount();
    const onWake = () => {
      if (!document.hidden) refreshCount();
    };
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('focus', onWake);
    const id = setInterval(onWake, 90_000);
    return () => {
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('focus', onWake);
      clearInterval(id);
    };
  });

  function toggle() {
    open = !open;
    onOpenChange(open);
  }
  function closePanel(restoreFocus: boolean) {
    open = false;
    onOpenChange(false);
    // Panel open marked everything read server-side — clear the badge
    // locally instead of waiting for the next poll.
    unreadCount = 0;
    if (restoreFocus) bellEl?.focus();
  }
</script>

<div class="relative">
  <!-- CD: 36px paper-warm outline disc (sibling of the avatar disc) inside a
       44px invisible hit area; badge = wine counter, NO badge at zero, NO
       motion ever (not even on count arrival). Glyph path from kiosk-notify.jsx. -->
  <button
    bind:this={bellEl}
    type="button"
    onclick={toggle}
    aria-haspopup="dialog"
    aria-expanded={open}
    aria-label={$t['nav.bell.aria']}
    class="nc-bell"
  >
    <span class="nc-bell-disc">
      <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 4.4c-3.3 0-4.9 2.5-4.9 5.9v3.5L5.3 16.1h13.4l-1.8-2.3v-3.5c0-3.4-1.6-5.9-4.9-5.9z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />
        <path d="M9.7 18.6a2.3 2.3 0 004.6 0" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
      </svg>
      {#if unreadCount > 0}
        <span class="nc-badge font-dmmono">{unreadCount > 9 ? '9+' : unreadCount}</span>
      {/if}
    </span>
  </button>
  {#if open}
    <NotificationPanel onClose={closePanel} />
  {/if}
</div>

<!-- Styles live in src/styles/global.css (`.nc-*` block), not in this
     component — nested-island orphan rule, same as AvatarMenu. -->
