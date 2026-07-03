<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from '../../../lib/kiosk-i18n';
  import AuthBanner from './primitives/AuthBanner.svelte';
  import AuthPrimaryBtn from './primitives/AuthPrimaryBtn.svelte';

  let { token = '', tokenValid = false, email = '', hasSession = false }: {
    token?: string; tokenValid?: boolean; email?: string; hasSession?: boolean;
  } = $props();

  type Stage = 'sent' | 'resent' | 'confirming' | 'confirmed' | 'invalid';
  let stage = $state<Stage>(token ? (tokenValid ? 'confirming' : 'invalid') : 'sent');
  let resendLoading = $state(false);
  let resendErr = $state<string | null>(null);

  onMount(() => {
    if (stage !== 'confirming') return;
    (async () => {
      try {
        const res = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        if (!res.ok) { stage = 'invalid'; return; }
        stage = 'confirmed';
        // JWT still says unverified until re-login; the banner live-checks the
        // DB, so landing on / immediately shows NO nag. Login-less browsers
        // (link opened elsewhere) go to /login instead.
        setTimeout(() => { window.location.href = hasSession ? '/' : '/login'; }, 2500);
      } catch {
        stage = 'invalid';
      }
    })();
  });

  async function resend() {
    resendErr = null;
    resendLoading = true;
    try {
      const res = await fetch('/api/auth/resend-verification', { method: 'POST' });
      if (res.status === 429) resendErr = $t['auth.verify.throttled'];
      else if (!res.ok) resendErr = $t['auth.err.generic'];
      else stage = 'resent';
    } catch {
      resendErr = $t['auth.err.generic'];
    }
    resendLoading = false;
  }
</script>

<div class="auth-card">
  {#if stage === 'confirmed'}
    <div style="text-align:center;">
      <div class="flex justify-center" style="margin-bottom:16px;">
        <div class="flex items-center justify-center" style="width:64px; height:64px; border-radius:50%; background:var(--k-success); border:2px solid var(--k-ink); box-shadow:3px 3px 0 var(--k-ink); color:var(--k-paper); font-size:30px; transform:rotate(-4deg);">✓</div>
      </div>
      <div class="font-dmmono" style="font-size:11px; letter-spacing:0.18em; color:var(--k-success); font-weight:600;">{$t['auth.verify.confirmedEyebrow']}</div>
      <h1 class="font-bricolage" style="font-weight:800; font-size:30px; letter-spacing:-0.03em; line-height:1.05; margin:8px 0 8px; color:var(--k-ink);">{$t['auth.verify.confirmedTitle']}</h1>
      <p class="font-instrument" style="font-style:italic; font-size:16px; color:var(--k-ink-soft); margin:0;">{$t['auth.verify.confirmedBody']}</p>
    </div>
  {:else if stage === 'confirming'}
    <div style="text-align:center; padding:24px 0;">
      <div class="font-dmmono" style="font-size:11px; letter-spacing:0.18em; color:var(--k-accent); font-weight:600;">{$t['auth.verify.eyebrow']}</div>
      <p class="font-instrument" style="font-style:italic; font-size:16px; color:var(--k-ink-soft); margin:12px 0 0;">{$t['auth.verify.confirming']}</p>
    </div>
  {:else if stage === 'invalid'}
    <div style="text-align:center;">
      <div class="font-dmmono" style="font-size:11px; letter-spacing:0.18em; color:var(--k-danger); font-weight:600;">{$t['auth.verify.invalidEyebrow']}</div>
      <h1 class="font-bricolage" style="font-weight:800; font-size:26px; letter-spacing:-0.03em; line-height:1.1; margin:8px 0 10px; color:var(--k-ink);">{$t['auth.verify.invalidTitle']}</h1>
      <p class="font-instrument" style="font-style:italic; font-size:15px; color:var(--k-ink-soft); margin:0 0 20px;">{$t['auth.verify.invalidBody']}</p>
      {#if hasSession}
        {#if resendErr}
          <p class="font-bricolage" style="font-size:12.5px; color:var(--k-danger); margin:0 0 10px;">{resendErr}</p>
        {/if}
        <AuthPrimaryBtn loading={resendLoading} onclick={resend} type="button">
          {resendLoading ? $t['auth.verify.resendLoading'] : $t['auth.verify.resend']}
        </AuthPrimaryBtn>
      {:else}
        <a href="/login" class="no-underline font-bricolage" style="display:inline-block; background:var(--k-ink); color:var(--k-paper); font-weight:700; font-size:15px; padding:13px 22px; border-radius:999px; border:1.5px solid var(--k-ink); box-shadow:3px 3px 0 var(--k-accent);">{$t['auth.verify.invalidLoginCta']}</a>
      {/if}
    </div>
  {:else}
    <!-- sent / resent -->
    <div class="flex justify-center" style="margin-bottom:16px;">
      <div class="flex items-center justify-center" style="width:60px; height:60px; border-radius:50%; background:var(--k-accent); border:2px solid var(--k-ink); box-shadow:3px 3px 0 var(--k-ink); font-size:26px; transform:rotate(-4deg);">✉</div>
    </div>
    <div style="text-align:center;">
      <div class="font-dmmono" style="font-size:11px; letter-spacing:0.18em; color:var(--k-accent); font-weight:600;">{$t['auth.verify.eyebrow']}</div>
      <h1 class="font-bricolage" style="font-weight:800; font-size:30px; letter-spacing:-0.03em; line-height:1.05; margin:8px 0 10px; color:var(--k-ink);">
        {$t['auth.verify.title.a']}<span class="font-instrument" style="font-style:italic; font-weight:400; color:var(--k-accent);">{$t['auth.verify.title.accent']}</span>{$t['auth.verify.title.b']}
      </h1>
      <p class="font-bricolage" style="font-size:13.5px; color:var(--k-ink-soft); margin:0 0 4px;">{$t['auth.verify.sub']}</p>
      <div class="font-dmmono" style="font-size:13px; font-weight:600; color:var(--k-ink); padding:5px 0;">{email}</div>
      <p class="font-bricolage" style="font-size:12.5px; color:var(--k-ink-soft); line-height:1.5; max-width:340px; margin:8px auto 0;">{$t['auth.verify.body']}</p>
    </div>

    {#if stage === 'resent'}
      <AuthBanner kind="success" title={$t['auth.verify.resentNote']} />
    {/if}
    {#if resendErr}
      <p class="font-bricolage" style="text-align:center; font-size:12.5px; color:var(--k-danger); margin:12px 0 0;">{resendErr}</p>
    {/if}

    <div style="margin-top:22px;">
      <AuthPrimaryBtn loading={resendLoading} onclick={resend} type="button">
        {resendLoading ? $t['auth.verify.resendLoading'] : $t['auth.verify.resend']}
      </AuthPrimaryBtn>
    </div>
    <div style="text-align:center; margin-top:16px;">
      <a href="/login" class="font-dmmono no-underline" style="font-size:11px; color:var(--k-ink-soft); border-bottom:1px dashed var(--k-ink-mute);">{$t['auth.verify.back']}</a>
    </div>
  {/if}
</div>

<style>
  .auth-card {
    background: var(--k-paper-warm);
    border: 1.5px solid var(--k-ink);
    border-top: 4px solid var(--k-accent);
    border-radius: 22px;
    box-shadow: 3px 3px 0 var(--k-ink);
    padding: 30px;
  }
</style>
