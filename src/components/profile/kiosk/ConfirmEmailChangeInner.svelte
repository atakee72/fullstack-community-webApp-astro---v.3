<script lang="ts">
  // Sessionless confirm page for the e-mail-change flow (Plan B Task 8) —
  // stage 03 (GEWECHSELT) of kiosk-profile-flows.jsx §03 EmailChangeFlow.
  // Mirrors AuthVerifyInner.svelte's mechanism exactly: reads `token` from
  // the page, POSTs on mount (no session needed — the link may be opened in
  // a different browser than the one that's logged in), shows a success or
  // generic invalid/expired card. Unlike AuthVerifyInner there's no "sent"
  // stage here (that lives in-panel on /profile, see PEmailChangePanel) and
  // no resend action (resend belongs to the still-open panel/banner, not
  // this page) — just confirming → confirmed | invalid.

  import { onMount } from 'svelte';
  import { t, tStr } from '../../../lib/kiosk-i18n';

  let { token = '' }: { token?: string } = $props();

  type Stage = 'confirming' | 'confirmed' | 'invalid';
  let stage = $state<Stage>(token ? 'confirming' : 'invalid');
  let confirmedEmail = $state('');

  onMount(() => {
    if (stage !== 'confirming') return;
    (async () => {
      try {
        const res = await fetch('/api/profile/email-change/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        if (!res.ok) {
          stage = 'invalid';
          return;
        }
        const data = await res.json().catch(() => ({}));
        confirmedEmail = typeof data?.email === 'string' ? data.email : '';
        stage = 'confirmed';
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
      <h1 class="font-bricolage" style="font-weight:800; font-size:26px; letter-spacing:-0.03em; line-height:1.1; margin:0 0 10px; color:var(--k-ink);">{$t['profile.email.confirm.ok.title']}</h1>
      <p class="font-bricolage" style="font-size:13.5px; color:var(--k-ink-soft); margin:0 0 4px;">
        {tStr($t['profile.email.confirm.ok.note.login'], { addr: confirmedEmail })}
      </p>
      <p class="font-bricolage" style="font-size:13.5px; color:var(--k-ink-soft); margin:0 0 20px;">
        {$t['profile.email.confirm.ok.note.sessions']}
      </p>
      <a href="/profile" class="no-underline font-bricolage" style="display:inline-block; background:var(--k-ink); color:var(--k-paper); font-weight:700; font-size:15px; padding:13px 22px; border-radius:999px; border:1.5px solid var(--k-ink); box-shadow:3px 3px 0 var(--k-ochre);">{$t['profile.email.confirm.ok.back']}</a>
    </div>
  {:else if stage === 'confirming'}
    <div style="text-align:center; padding:24px 0;">
      <p class="font-instrument italic" style="font-size:16px; color:var(--k-ink-soft); margin:0;">…</p>
    </div>
  {:else}
    <div style="text-align:center;">
      <div class="font-dmmono" style="font-size:11px; letter-spacing:0.18em; color:var(--k-danger); font-weight:600;">✕</div>
      <h1 class="font-bricolage" style="font-weight:800; font-size:26px; letter-spacing:-0.03em; line-height:1.1; margin:8px 0 10px; color:var(--k-ink);">{$t['profile.email.confirm.fail.title']}</h1>
      <p class="font-instrument italic" style="font-size:15px; color:var(--k-ink-soft); margin:0 0 20px;">{$t['profile.email.confirm.fail.body']}</p>
      <a href="/profile" class="font-dmmono no-underline" style="font-size:11px; color:var(--k-ink-soft); border-bottom:1px dashed var(--k-ink-mute);">{$t['profile.email.confirm.fail.back']}</a>
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
