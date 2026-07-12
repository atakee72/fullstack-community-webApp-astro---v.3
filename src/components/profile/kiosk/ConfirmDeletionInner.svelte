<script lang="ts">
  // Sessionless undo page for the account-deletion flow (Plan B Task 10).
  // Mirrors ConfirmEmailChangeInner.svelte's mechanism exactly: reads
  // `token` from the page, POSTs on mount (no session needed — the link
  // may be opened in a different browser than the one that's logged in),
  // shows a success or generic invalid/expired card. No "confirming an
  // action that changes state going forward" stage here — cancelling a
  // scheduled deletion is a one-shot undo, so confirming → confirmed |
  // invalid is the whole lifecycle (same shape as ConfirmEmailChangeInner).

  import { onMount } from 'svelte';
  import { t } from '../../../lib/kiosk-i18n';

  let { token = '' }: { token?: string } = $props();

  type Stage = 'confirming' | 'confirmed' | 'invalid';
  let stage = $state<Stage>(token ? 'confirming' : 'invalid');

  onMount(() => {
    if (stage !== 'confirming') return;
    (async () => {
      try {
        const res = await fetch('/api/auth/cancel-deletion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        stage = res.ok ? 'confirmed' : 'invalid';
      } catch {
        stage = 'invalid';
      }
    })();
  });
</script>

<div class="auth-card" style="border-top-color: {stage === 'confirmed' ? 'var(--k-success)' : 'var(--k-ochre)'};">
  {#if stage === 'confirmed'}
    <div style="text-align:center;">
      <div class="flex justify-center" style="margin-bottom:16px;">
        <div class="flex items-center justify-center" style="width:64px; height:64px; border-radius:50%; background:var(--k-success); border:2px solid var(--k-ink); box-shadow:3px 3px 0 var(--k-ink); color:var(--k-paper); font-size:30px; transform:rotate(-4deg);">✓</div>
      </div>
      <h1 class="font-bricolage" style="font-weight:800; font-size:26px; letter-spacing:-0.03em; line-height:1.1; margin:0 0 10px; color:var(--k-ink);">{$t['profile.del.confirm.ok.title']}</h1>
      <p class="font-bricolage" style="font-size:13.5px; color:var(--k-ink-soft); margin:0 0 20px;">
        {$t['profile.del.confirm.ok.body']}
      </p>
      <a href="/profile" class="no-underline font-bricolage" style="display:inline-block; background:var(--k-ink); color:var(--k-paper); font-weight:700; font-size:15px; padding:13px 22px; border-radius:999px; border:1.5px solid var(--k-ink); box-shadow:3px 3px 0 var(--k-ochre);">{$t['profile.del.confirm.ok.back']}</a>
    </div>
  {:else if stage === 'confirming'}
    <div style="text-align:center; padding:24px 0;">
      <p class="font-instrument italic" style="font-size:16px; color:var(--k-ink-soft); margin:0;">…</p>
    </div>
  {:else}
    <div style="text-align:center;">
      <div class="font-dmmono" style="font-size:11px; letter-spacing:0.18em; color:var(--k-danger); font-weight:600;">✕</div>
      <h1 class="font-bricolage" style="font-weight:800; font-size:26px; letter-spacing:-0.03em; line-height:1.1; margin:8px 0 10px; color:var(--k-ink);">{$t['profile.del.confirm.fail.title']}</h1>
      <p class="font-instrument italic" style="font-size:15px; color:var(--k-ink-soft); margin:0 0 20px;">{$t['profile.del.confirm.fail.body']}</p>
      <a href="/profile" class="font-dmmono no-underline" style="font-size:11px; color:var(--k-ink-soft); border-bottom:1px dashed var(--k-ink-mute);">{$t['profile.del.confirm.fail.back']}</a>
    </div>
  {/if}
</div>

<style>
  .auth-card {
    background: var(--k-paper-warm);
    border: 1.5px solid var(--k-ink);
    border-top: 4px solid var(--k-ochre);
    border-radius: 22px;
    box-shadow: 3px 3px 0 var(--k-ink);
    padding: 30px;
  }
</style>
