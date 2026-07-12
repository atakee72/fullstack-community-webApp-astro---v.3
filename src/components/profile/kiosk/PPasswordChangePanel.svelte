<script lang="ts">
  // Password change panel — single-stage form (current + new + repeat).
  // Task 9. Mirrors PEmailChangePanel.svelte's topology exactly (same card
  // chrome, same field/border/error patterns, same submitSeq stale-response
  // guard) — see that file's header comment for the full single-mount
  // rationale, which applies here identically: PKontoCard is double-mounted
  // (desktop card + mobile fold) and a stateful form would desync across
  // two independent mounts, so ProfileInner mounts this ONCE in its own
  // grid slot, gated by a local `pwPanelOpen` boolean.
  //
  // Design source: kiosk-profile-flows.jsx §04 (PasswordChangeCard) — single
  // card, no side rules-panel (that's mock-only documentation styling, see
  // PEmailChangePanel's precedent of not literally reproducing side panels).
  //
  // On success: the endpoint stamps `passwordChangedAt`, which invalidates
  // every OTHER device's JWT within 5 minutes (auth.config.ts jwt callback).
  // This device's own token would eventually invalidate too, so we
  // immediately perform a silent re-login (signIn with the new password,
  // redirect:false) and verify via /api/auth/session — the same
  // shape-independent success signal AuthLoginInner/AuthRegisterInner use,
  // since auth-astro's signIn() never exposes `.error`. If that silent
  // re-login unexpectedly fails, hard-redirect to /login rather than leave
  // the user on a page whose session may die at the next JWT recheck.

  import { signIn } from 'auth-astro/client';
  import { t } from '../../../lib/kiosk-i18n';
  import { showSuccess, showError } from '../../../utils/toast';
  import { ChangePasswordSchema } from '../../../schemas/auth.schema';
  import PBtn from './atoms/PBtn.svelte';
  import AuthStrength from '../../auth/kiosk/primitives/AuthStrength.svelte';

  let { email, onClose }: { email: string; onClose: () => void } = $props();

  let currentPassword = $state('');
  let newPassword = $state('');
  let repeatPassword = $state('');

  let currentFocused = $state(false);
  let newFocused = $state(false);
  let repeatFocused = $state(false);

  let currentError = $state<string | null>(null);
  let newError = $state<string | null>(null);
  let repeatError = $state<string | null>(null);

  let submitting = $state(false);
  let submitSeq = 0;

  // Strength scorer copied verbatim from AuthRegisterInner.svelte:24-35 (the
  // same scoring the design mock's AuthStrength reuse instruction points
  // at — "same 4 segments, same labels"). Kept as a per-component copy
  // rather than a shared util because AuthRegisterInner itself duplicates
  // it locally (no existing shared home for it) — see that file.
  function scorePw(pw: string): 0 | 1 | 2 | 3 | 4 {
    if (pw.length < 8) return pw.length === 0 ? 0 : 1;
    let classes = 0;
    if (/[a-z]/.test(pw)) classes++;
    if (/[A-Z]/.test(pw)) classes++;
    if (/\d/.test(pw)) classes++;
    if (/[^A-Za-z0-9]/.test(pw)) classes++;
    if (classes <= 1) return 1;
    if (classes === 2) return 2;
    if (classes === 3) return 3;
    return 4;
  }
  const pwScore = $derived(scorePw(newPassword));

  function serverErrorCopy(code: string | null): string {
    switch (code) {
      case 'invalid_password':
        return $t['profile.pw.err.invalid_password'];
      case 'same_password':
        return $t['profile.pw.err.same_password'];
      case 'throttled':
        return $t['profile.pw.err.throttled'];
      default:
        // 'validation' (shouldn't happen — client mirrors the same schema
        // first) | 'internal' | network errors
        return $t['profile.pw.err.config'];
    }
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (submitting) return;
    currentError = null;
    newError = null;
    repeatError = null;

    // Client-side mirror via the SAME schema the server validates with
    // (no hand-copied regex to drift) — errors routed to the field the
    // flows-JSX rules call out: wrong/short current password on the FIRST
    // field, weak new password on the new field, mismatch on repeat.
    const parsed = ChangePasswordSchema.safeParse({ currentPassword, newPassword, confirmPassword: repeatPassword });
    if (!parsed.success) {
      const fields = parsed.error.flatten().fieldErrors;
      let bad = false;
      if (fields.currentPassword) { currentError = $t['profile.pw.err.invalid_password']; bad = true; }
      if (fields.newPassword) { newError = $t['profile.pw.err.weak']; bad = true; }
      if (fields.confirmPassword) { repeatError = $t['profile.pw.err.mismatch']; bad = true; }
      if (bad) return;
    }

    const mySeq = ++submitSeq;
    submitting = true;
    try {
      const res = await fetch('/api/profile/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword: repeatPassword }),
      });
      if (mySeq !== submitSeq) return; // stale

      if (res.ok) {
        // Silent re-login on THIS device — see header comment. Uses the
        // session's own email (echoed by the endpoint) + the just-set
        // newPassword.
        let stillIn = false;
        try {
          await signIn('credentials', { email, password: newPassword, redirect: false });
          const sess = await fetch('/api/auth/session').then((r) => r.json()).catch(() => null);
          stillIn = !!sess?.user;
        } catch {
          stillIn = false;
        }
        if (mySeq !== submitSeq) return; // stale
        currentPassword = '';
        newPassword = '';
        repeatPassword = '';
        if (!stillIn) {
          // Honest fallback — the session may die at the next JWT recheck
          // otherwise, leaving the user on a page that silently stops working.
          window.location.href = '/login';
          return;
        }
        showSuccess($t['profile.pw.success'], $t['profile.pw.note']);
        onClose();
        return;
      }

      let code: string | null = null;
      try {
        const j = await res.json();
        code = typeof j?.error === 'string' ? j.error : null;
      } catch {
        /* non-JSON error body — falls through to generic copy */
      }
      if (code === 'invalid_password') currentError = serverErrorCopy(code);
      else if (code === 'same_password') newError = serverErrorCopy(code);
      else showError(serverErrorCopy(code));
    } catch {
      if (mySeq !== submitSeq) return;
      showError(serverErrorCopy(null));
    } finally {
      if (mySeq === submitSeq) submitting = false;
    }
  }

  const currentBorder = $derived(currentError ? 'var(--k-danger)' : currentFocused ? 'var(--k-ink)' : 'var(--k-rule)');
  const newBorder = $derived(newError ? 'var(--k-danger)' : newFocused ? 'var(--k-ink)' : 'var(--k-rule)');
  const repeatBorder = $derived(repeatError ? 'var(--k-danger)' : repeatFocused ? 'var(--k-ink)' : 'var(--k-rule)');
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
  <div class="font-dmmono" style="font-size: 10px; letter-spacing: 0.14em; color: var(--k-ochre); font-weight: 600; margin-bottom: 10px;">
    {$t['profile.pw.title']}
  </div>
  <form onsubmit={handleSubmit}>
    <div style="margin-bottom: 12px;">
      <label for="ppw-current" class="font-dmmono" style="display: block; font-size: 9.5px; letter-spacing: 0.14em; color: var(--k-ink-mute); margin-bottom: 5px;">
        {$t['profile.pw.current']}
      </label>
      <input
        id="ppw-current"
        type="password"
        bind:value={currentPassword}
        onfocus={() => (currentFocused = true)}
        onblur={() => (currentFocused = false)}
        autocomplete="current-password"
        class="font-bricolage"
        style="width: 100%; box-sizing: border-box; padding: 10px 13px; background: var(--k-paper-soft); border: 1.5px solid {currentBorder}; border-radius: var(--k-radius-md); font-size: 14px; font-weight: 500; color: var(--k-ink);"
      />
      {#if currentError}
        <div class="font-dmmono" style="font-size: 10px; color: var(--k-danger); margin-top: 4px;">✕ {currentError}</div>
      {/if}
    </div>

    <div style="margin-bottom: 12px;">
      <label for="ppw-new" class="font-dmmono" style="display: block; font-size: 9.5px; letter-spacing: 0.14em; color: var(--k-ink-mute); margin-bottom: 5px;">
        {$t['profile.pw.new']}
      </label>
      <input
        id="ppw-new"
        type="password"
        bind:value={newPassword}
        onfocus={() => (newFocused = true)}
        onblur={() => (newFocused = false)}
        autocomplete="new-password"
        class="font-bricolage"
        style="width: 100%; box-sizing: border-box; padding: 10px 13px; background: var(--k-paper-soft); border: 1.5px solid {newBorder}; border-radius: var(--k-radius-md); font-size: 14px; font-weight: 500; color: var(--k-ink);"
      />
      {#if newPassword}<AuthStrength score={pwScore} />{/if}
      {#if newError}
        <div class="font-dmmono" style="font-size: 10px; color: var(--k-danger); margin-top: 4px;">✕ {newError}</div>
      {/if}
    </div>

    <div style="margin-bottom: 6px;">
      <label for="ppw-repeat" class="font-dmmono" style="display: block; font-size: 9.5px; letter-spacing: 0.14em; color: var(--k-ink-mute); margin-bottom: 5px;">
        {$t['profile.pw.repeat']}
      </label>
      <input
        id="ppw-repeat"
        type="password"
        bind:value={repeatPassword}
        onfocus={() => (repeatFocused = true)}
        onblur={() => (repeatFocused = false)}
        autocomplete="new-password"
        class="font-bricolage"
        style="width: 100%; box-sizing: border-box; padding: 10px 13px; background: var(--k-paper-soft); border: 1.5px solid {repeatBorder}; border-radius: var(--k-radius-md); font-size: 14px; font-weight: 500; color: var(--k-ink);"
      />
      {#if repeatError}
        <div class="font-dmmono" style="font-size: 10px; color: var(--k-danger); margin-top: 4px;">✕ {repeatError}</div>
      {/if}
    </div>

    <div style="text-align: right; margin-bottom: 12px;">
      <a href="/forgot-password" class="font-dmmono no-underline" style="font-size: 10.5px; color: var(--k-ink-soft); border-bottom: 1px dashed var(--k-ink-mute);">{$t['profile.pw.forgot']}</a>
    </div>

    <div style="display: flex; gap: 8px;">
      <PBtn primary small type="submit" disabled={submitting}>{$t['profile.pw.cta']}</PBtn>
      <PBtn small type="button" onclick={onClose} disabled={submitting}>{$t['profile.edit.cancel']}</PBtn>
    </div>

    <div class="font-dmmono" style="margin-top: 12px; font-size: 9.5px; color: var(--k-ink-mute); line-height: 1.6;">
      {$t['profile.pw.note']}
    </div>
  </form>
</div>
