<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from '../../../lib/kiosk-i18n';

  const DISMISS_KEY = 'mahalle-verify-banner-dismissed';

  let visible = $state(false);
  let resendState = $state<'idle' | 'loading' | 'sent'>('idle');
  let resendErr = $state<string | null>(null);

  onMount(async () => {
    // sessionStorage can throw (private mode / storage disabled) — treat as not dismissed.
    try {
      if (sessionStorage.getItem(DISMISS_KEY)) return;
    } catch { /* fall through */ }
    // Live check beats the stale JWT: only nag if the DB really says unverified.
    try {
      const res = await fetch('/api/auth/verification-status');
      if (!res.ok) return; // no session / error → never nag
      const data = await res.json();
      visible = data?.verified === false;
    } catch { /* network error → don't nag */ }
  });

  function dismiss() {
    visible = false;
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* best-effort */ }
  }

  async function resend() {
    resendErr = null;
    resendState = 'loading';
    try {
      const res = await fetch('/api/auth/resend-verification', { method: 'POST' });
      if (res.status === 429) { resendErr = $t['auth.verify.throttled']; resendState = 'idle'; }
      else if (!res.ok) { resendErr = $t['auth.err.generic']; resendState = 'idle'; }
      else { resendState = 'sent'; }
    } catch {
      resendErr = $t['auth.err.generic'];
      resendState = 'idle';
    }
  }
</script>

{#if visible}
  <div class="verify-banner" role="status">
    <div class="verify-banner-inner">
      <span class="font-dmmono verify-banner-dot" aria-hidden="true">✉</span>
      <span class="font-bricolage verify-banner-text">
        <strong>{$t['auth.banner.verifyTitle']}</strong>
        <span class="verify-banner-body">{$t['auth.banner.verifyBody']}</span>
        {#if resendErr}<span class="verify-banner-err">{resendErr}</span>{/if}
      </span>
      <button type="button" class="font-bricolage verify-banner-resend" onclick={resend} disabled={resendState !== 'idle'}>
        {resendState === 'sent' ? $t['auth.banner.verifySent']
          : resendState === 'loading' ? $t['auth.verify.resendLoading']
          : $t['auth.banner.verifyResend']}
      </button>
      <button type="button" class="verify-banner-dismiss" onclick={dismiss} aria-label={$t['auth.banner.verifyDismiss']}>×</button>
    </div>
  </div>
{/if}

<style>
  .verify-banner {
    background: var(--k-paper-warm);
    border-bottom: 1.5px solid var(--k-ink);
    border-top: 3px solid var(--k-ochre);
  }
  .verify-banner-inner {
    max-width: 80rem;
    margin: 0 auto;
    padding: 8px 16px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .verify-banner-dot { font-size: 14px; color: var(--k-ochre); flex-shrink: 0; }
  .verify-banner-text { font-size: 13px; color: var(--k-ink-soft); line-height: 1.4; flex: 1; min-width: 0; }
  .verify-banner-text strong { color: var(--k-ink); font-weight: 700; margin-right: 6px; }
  .verify-banner-err { display: block; color: var(--k-danger); font-size: 12px; }
  .verify-banner-resend {
    flex-shrink: 0;
    background: var(--k-ink);
    color: var(--k-paper);
    font-size: 12px;
    font-weight: 700;
    padding: 6px 14px;
    border-radius: 999px;
    border: 1.5px solid var(--k-ink);
    box-shadow: 2px 2px 0 var(--k-ochre);
    cursor: pointer;
  }
  .verify-banner-resend:disabled { opacity: 0.75; cursor: default; }
  .verify-banner-dismiss {
    flex-shrink: 0;
    background: transparent;
    border: none;
    color: var(--k-ink-mute);
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
    padding: 2px 6px;
  }
  @media (max-width: 640px) {
    .verify-banner-body { display: none; } /* keep the strip one line on mobile */
  }
</style>
