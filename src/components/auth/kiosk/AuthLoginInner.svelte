<script lang="ts">
  import { onDestroy } from 'svelte';
  import { signIn } from 'auth-astro/client';
  import { t } from '../../../lib/kiosk-i18n';
  import { LoginSchema } from '../../../schemas/auth.schema';
  import AuthField from './primitives/AuthField.svelte';
  import AuthPrimaryBtn from './primitives/AuthPrimaryBtn.svelte';
  import AuthBanner from './primitives/AuthBanner.svelte';

  let email = $state('');
  let password = $state('');
  let emailErr = $state<string | null>(null);
  let pwErr = $state<string | null>(null);
  let credErr = $state(false);     // generic wrong email-or-password
  let status = $state<'idle' | 'loading' | 'success'>('idle');

  // State 05 — locked out. >0 seconds remaining → danger banner + disabled form.
  let lockSec = $state(0);
  let lockTimer: ReturnType<typeof setInterval> | null = null;
  const locked = $derived(lockSec > 0);
  const lockLabel = $derived(`${Math.floor(lockSec / 60)}:${String(lockSec % 60).padStart(2, '0')}`);

  function startLock(sec: number) {
    lockSec = Math.max(1, Math.round(sec));
    credErr = false;
    if (lockTimer) clearInterval(lockTimer);
    lockTimer = setInterval(() => {
      lockSec -= 1;
      if (lockSec <= 0 && lockTimer) {
        clearInterval(lockTimer);
        lockTimer = null;
      }
    }, 1000);
  }
  onDestroy(() => {
    if (lockTimer) clearInterval(lockTimer);
  });

  async function submit(e: Event) {
    e.preventDefault();
    if (locked) return;
    emailErr = null; pwErr = null; credErr = false;

    const parsed = LoginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const fields = parsed.error.flatten().fieldErrors;
      if (fields.email) emailErr = $t['auth.err.emailInvalid'];
      if (fields.password) pwErr = $t['auth.err.pwShort'];
      return;
    }

    status = 'loading';
    try {
      await signIn('credentials', {
        email: parsed.data.email,
        password: parsed.data.password,
        redirect: false,
      });
      // auth-astro's signIn() (redirect:false) resolves with a raw Response —
      // it never exposes `.error` — so failure is detected via the only
      // shape-independent signal: whether a session now exists. Preserves
      // anti-enumeration: still ONE generic banner for all failure kinds.
      const sess = await fetch('/api/auth/session').then((r) => r.json()).catch(() => null);
      if (!sess?.user) {
        // Distinguish lockout (state 05) from plain bad credentials via the
        // peek-only status endpoint — reveals lockout state, never existence.
        try {
          const res = await fetch('/api/auth/login-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: parsed.data.email }),
          });
          const data = await res.json().catch(() => ({}));
          if (data?.locked) {
            startLock(data.retryAfterSec);
            status = 'idle';
            return;
          }
        } catch { /* fall through to generic */ }
        // Anti-enumeration: ONE generic message for wrong-pw AND email-not-found.
        credErr = true;
        status = 'idle';
        return;
      }
      status = 'success';
      window.location.href = '/';
    } catch {
      credErr = true;
      status = 'idle';
    }
  }
</script>

<div class="auth-card">
  <div class="font-dmmono" style="font-size:11px; letter-spacing:0.18em; color:var(--k-accent); font-weight:600;">{$t['auth.login.eyebrow']}</div>
  <h1 class="font-bricolage" style="font-weight:800; font-size:38px; letter-spacing:-0.035em; line-height:1; margin:8px 0 0; color:var(--k-ink);">
    {$t['auth.login.title.a']}<span class="font-instrument" style="font-style:italic; font-weight:400; color:var(--k-accent);">{$t['auth.login.title.accent']}</span>{$t['auth.login.title.b']}
  </h1>

  {#if locked}
    <AuthBanner kind="danger" title={$t['auth.err.lockedTitle']}
      body={`${$t['auth.err.lockedBody.a']}${lockLabel}${$t['auth.err.lockedBody.b']}`} />
  {/if}
  {#if credErr}
    <AuthBanner kind="danger" title={$t['auth.err.credentials']} />
  {/if}
  {#if status === 'success'}
    <AuthBanner kind="success" title={$t['auth.login.successTitle']} body={$t['auth.login.successBody']} />
  {/if}

  <form onsubmit={submit} style="display:flex; flex-direction:column; gap:16px; margin-top:22px;">
    <AuthField
      label={$t['auth.login.email']} placeholder={$t['auth.login.emailPh']}
      type="email" name="email" autocomplete="email"
      value={email} error={emailErr} disabled={locked}
      oninput={(v) => (email = v)} />
    <div>
      <AuthField
        label={$t['auth.login.pw']} placeholder={$t['auth.login.pwPh']}
        type="password" name="password" autocomplete="current-password"
        value={password} error={pwErr} showToggle disabled={locked}
        oninput={(v) => (password = v)} />
      <div style="text-align:right; margin-top:7px;">
        <a href="/forgot-password" class="font-dmmono no-underline" style="font-size:11px; color:var(--k-ink-soft); border-bottom:1px dashed var(--k-ink-mute);">{$t['auth.login.forgot']}</a>
      </div>
    </div>
    <AuthPrimaryBtn loading={status === 'loading'} disabled={locked}>
      {status === 'loading' ? $t['auth.login.ctaLoading'] : status === 'success' ? $t['auth.login.ctaDone'] : $t['auth.login.cta']}
    </AuthPrimaryBtn>
  </form>

  <div class="flex items-center" style="gap:12px; margin:20px 0 16px;">
    <div style="flex:1; border-top:1px dashed var(--k-rule);"></div>
    <span class="font-dmmono uppercase" style="font-size:9.5px; color:var(--k-ink-mute); letter-spacing:0.16em;">{$t['auth.login.or']}</span>
    <div style="flex:1; border-top:1px dashed var(--k-rule);"></div>
  </div>
  <div class="font-bricolage" style="text-align:center; font-size:13.5px; color:var(--k-ink-soft);">
    {$t['auth.login.alt']}<a href="/register" class="no-underline" style="font-weight:700; color:var(--k-ink); border-bottom:2px solid var(--k-accent);">{$t['auth.login.altLink']}</a>
  </div>
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
