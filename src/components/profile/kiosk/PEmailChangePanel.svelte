<script lang="ts">
  // E-mail change panel — 2 in-card stages (01 NEUE ADRESSE, 02 BESTÄTIGEN).
  // Stage 03 (GEWECHSELT) lives on the sessionless confirm PAGE
  // (src/pages/confirm-email-change.astro), not here — see PKontoCard.svelte's
  // header comment + src/components/profile/kiosk/CLAUDE.md for the layout
  // decision this component is part of.
  //
  // SINGLE MOUNT (by ProfileInner) — not double-mounted like PKontoCard.
  // PKontoCard is mounted twice (desktop card + mobile fold); a stateful
  // panel with local input fields would desync across two independent
  // mounts (typing on mobile, then viewing the desktop copy, would show
  // empty fields). ProfileInner mounts this ONCE, in its own grid slot
  // directly below the Konto card/fold on both breakpoints, gated by a
  // local `emailPanelOpen` boolean. PKontoCard's "ändern" action and the
  // §08 pending banner (also inside PKontoCard, so it renders on BOTH
  // mounts) call back up into ProfileInner to open it / drive resend+cancel.
  //
  // Design source: kiosk-profile-flows.jsx §03 (EmailChangeFlow) stages
  // 01/02. Stage 1 has no explicit close affordance in the JSX (the mock
  // only demos the CTA) — this adds a plain "Abbrechen" (reusing the
  // existing profile.edit.cancel copy, not inventing new UI text) next to
  // the primary CTA so the panel can be dismissed without starting a change.

  import { t } from '../../../lib/kiosk-i18n';
  import { showError } from '../../../utils/toast';
  import PBtn from './atoms/PBtn.svelte';

  let {
    pendingEmail,
    onStarted,
    onResend,
    onCancel,
    onClose,
  }: {
    pendingEmail: string | null;
    onStarted: (newEmail: string) => void;
    // Lifted to ProfileInner — the §08 banner (rendered inside PKontoCard)
    // calls the exact same two functions, so resend/cancel behavior can
    // never drift between the banner and this panel's own stage 02 links.
    onResend: () => Promise<void>;
    onCancel: () => Promise<void>;
    onClose: () => void;
  } = $props();

  // Seeded once at mount from the current server state — opening the panel
  // while a change is already pending jumps straight to stage 02 (per brief).
  type Stage = 'form' | 'sent';
  let stage = $state<Stage>(pendingEmail ? 'sent' : 'form');
  let sentAddr = $state(pendingEmail ?? '');

  // ─── Stage 01 · form ────────────────────────────────────────────────────
  let newEmail = $state('');
  let currentPassword = $state('');
  let emailFocused = $state(false);
  let pwFocused = $state(false);
  let emailError = $state<string | null>(null);
  let pwError = $state<string | null>(null);
  let submitting = $state(false);
  let submitSeq = 0;

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function serverErrorCopy(code: string | null): string {
    switch (code) {
      case 'invalid_email':
        return $t['profile.email.err.invalid_email'];
      case 'invalid_password':
        return $t['profile.email.err.invalid_password'];
      case 'email_unavailable':
        return $t['profile.email.err.email_unavailable'];
      case 'throttled':
        return $t['profile.email.err.throttled'];
      default:
        // 'config' | 'send_failed' | 'internal' | network errors
        return $t['profile.email.err.config'];
    }
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (submitting) return;
    emailError = null;
    pwError = null;

    const trimmedEmail = newEmail.trim().toLowerCase();
    if (!EMAIL_RE.test(trimmedEmail)) {
      emailError = $t['profile.email.err.invalid_email'];
      return;
    }
    if (!currentPassword) {
      pwError = $t['profile.email.err.invalid_password'];
      return;
    }

    const mySeq = ++submitSeq;
    submitting = true;
    try {
      const res = await fetch('/api/profile/email-change/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEmail: trimmedEmail, currentPassword }),
      });
      if (mySeq !== submitSeq) return; // stale
      if (res.ok) {
        currentPassword = '';
        sentAddr = trimmedEmail;
        stage = 'sent';
        onStarted(trimmedEmail);
        return;
      }
      let code: string | null = null;
      try {
        const j = await res.json();
        code = typeof j?.error === 'string' ? j.error : null;
      } catch {
        /* non-JSON error body — falls through to generic copy */
      }
      if (code === 'invalid_password') pwError = serverErrorCopy(code);
      else if (code === 'invalid_email' || code === 'email_unavailable') emailError = serverErrorCopy(code);
      else showError(serverErrorCopy(code));
    } catch {
      if (mySeq !== submitSeq) return;
      showError(serverErrorCopy(null));
    } finally {
      if (mySeq === submitSeq) submitting = false;
    }
  }

  // ─── Stage 02 · sent ────────────────────────────────────────────────────
  let resendLoading = $state(false);
  let cancelLoading = $state(false);

  async function handleResend() {
    if (resendLoading) return;
    resendLoading = true;
    await onResend();
    resendLoading = false;
  }

  async function handleCancel() {
    if (cancelLoading) return;
    cancelLoading = true;
    await onCancel();
    cancelLoading = false;
  }

  const emailBorder = $derived(emailError ? 'var(--k-danger)' : emailFocused ? 'var(--k-ink)' : 'var(--k-rule)');
  const pwBorder = $derived(pwError ? 'var(--k-danger)' : pwFocused ? 'var(--k-ink)' : 'var(--k-rule)');
</script>

<div
  style="
    background: var(--k-paper-warm);
    border: 1.5px solid var(--k-ink);
    border-top: 4px solid var(--k-ochre);
    border-radius: 16px;
    box-shadow: 3px 3px 0 var(--k-ink);
    padding: 20px;
  "
>
  {#if stage === 'form'}
    <div class="font-dmmono" style="font-size: 10px; letter-spacing: 0.14em; color: var(--k-ochre); font-weight: 600; margin-bottom: 10px;">
      01 · {$t['profile.email.stage1.title']}
    </div>
    <form onsubmit={handleSubmit}>
      <div style="margin-bottom: 12px;">
        <label for="pemail-new" class="font-dmmono" style="display: block; font-size: 9.5px; letter-spacing: 0.14em; color: var(--k-ink-mute); margin-bottom: 5px;">
          {$t['profile.email.stage1.newlabel']}
        </label>
        <input
          id="pemail-new"
          type="email"
          bind:value={newEmail}
          onfocus={() => (emailFocused = true)}
          onblur={() => (emailFocused = false)}
          autocomplete="email"
          class="font-bricolage"
          style="width: 100%; box-sizing: border-box; padding: 10px 13px; background: var(--k-paper-soft); border: 1.5px solid {emailBorder}; border-radius: var(--k-radius-md); font-size: 14px; font-weight: 500; color: var(--k-ink);"
        />
        {#if emailError}
          <div class="font-dmmono" style="font-size: 10px; color: var(--k-danger); margin-top: 4px;">✕ {emailError}</div>
        {/if}
      </div>
      <div style="margin-bottom: 14px;">
        <label for="pemail-pw" class="font-dmmono" style="display: block; font-size: 9.5px; letter-spacing: 0.14em; color: var(--k-ink-mute); margin-bottom: 5px;">
          {$t['profile.email.stage1.pwlabel']}
        </label>
        <input
          id="pemail-pw"
          type="password"
          bind:value={currentPassword}
          onfocus={() => (pwFocused = true)}
          onblur={() => (pwFocused = false)}
          autocomplete="current-password"
          class="font-bricolage"
          style="width: 100%; box-sizing: border-box; padding: 10px 13px; background: var(--k-paper-soft); border: 1.5px solid {pwBorder}; border-radius: var(--k-radius-md); font-size: 14px; font-weight: 500; color: var(--k-ink);"
        />
        {#if pwError}
          <div class="font-dmmono" style="font-size: 10px; color: var(--k-danger); margin-top: 4px;">✕ {pwError}</div>
        {:else}
          <div class="font-dmmono" style="font-size: 10px; color: var(--k-ink-mute); margin-top: 4px;">{$t['profile.email.stage1.pwhint']}</div>
        {/if}
      </div>
      <div style="display: flex; gap: 8px;">
        <PBtn primary small type="submit" disabled={submitting}>{$t['profile.email.stage1.cta']}</PBtn>
        <PBtn small type="button" onclick={onClose} disabled={submitting}>{$t['profile.edit.cancel']}</PBtn>
      </div>
    </form>
  {:else}
    <div class="font-dmmono" style="font-size: 10px; letter-spacing: 0.14em; color: var(--k-ochre); font-weight: 600; margin-bottom: 10px;">
      02 · {$t['profile.email.stage2.title']}
    </div>
    <div style="font-size: 26px; margin-bottom: 8px;">✉</div>
    <div class="font-bricolage" style="font-size: 15px; font-weight: 700; line-height: 1.35;">
      {$t['profile.email.stage2.sent']}<br />
      <span class="font-dmmono" style="font-size: 13px;">{sentAddr}</span>
    </div>
    <div class="font-dmmono" style="margin-top: 10px; font-size: 10px; color: var(--k-ink-soft); line-height: 1.7;">
      {$t['profile.email.stage2.note30']} {$t['profile.email.stage2.noteold']}
    </div>
    <div style="margin-top: 12px; display: flex; gap: 12px; align-items: center;">
      <button
        type="button"
        onclick={handleResend}
        disabled={resendLoading}
        class="font-bricolage"
        style="background: none; border: none; padding: 0; cursor: pointer; font-size: 12.5px; font-weight: 700; color: var(--k-ink); border-bottom: 2px solid var(--k-ochre); opacity: {resendLoading ? 0.5 : 1};"
      >{$t['profile.email.stage2.resend']}</button>
      <button
        type="button"
        onclick={handleCancel}
        disabled={cancelLoading}
        class="font-bricolage"
        style="background: none; border: none; padding: 0; cursor: pointer; font-size: 12.5px; font-weight: 700; color: var(--k-ink-mute); opacity: {cancelLoading ? 0.5 : 1};"
      >{$t['profile.email.stage2.cancel']}</button>
    </div>
  {/if}
</div>
