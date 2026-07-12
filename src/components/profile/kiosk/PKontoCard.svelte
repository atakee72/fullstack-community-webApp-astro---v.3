<script lang="ts">
  // Konto (account) card — §03. E-MAIL row carries the "ändern" action
  // (Plan B Task 8) opening PEmailChangePanel; PASSWORT row carries its own
  // "ändern" action (Task 9) opening PPasswordChangePanel — both mounted
  // once by ProfileInner, see that file's layout comment +
  // src/components/profile/kiosk/CLAUDE.md. + Abmelden.
  // Design source: kiosk-profile.jsx (PKontoCard, PKontoRow) for the row
  // anatomy + kiosk-profile-states.jsx §08 (PMiniBanner) for the pending
  // banner rendered here whenever a change is awaiting confirmation and the
  // panel itself isn't the thing showing that same info (i.e. it's closed).
  //
  // `bare` (Task 10): mobile fold usage — skips the outer PCard + §03
  // PCardHead, PMobileFold already supplies the card chrome + "Konto" title.
  // Stateless/props-driven like the rest of this card — double-mounted
  // (desktop card + mobile fold) is safe because `pendingEmail` and the
  // resend/cancel handlers all live in ProfileInner; both mounts just
  // render off the same upstream state.

  import { signOut } from 'auth-astro/client';
  import { t, tStr } from '../../../lib/kiosk-i18n';
  import PCard from './atoms/PCard.svelte';
  import PCardHead from './atoms/PCardHead.svelte';
  import PBtn from './atoms/PBtn.svelte';

  let {
    email,
    pendingEmail = null,
    showBanner = false,
    onChangeEmail,
    onResendEmail,
    onCancelEmail,
    onChangePassword,
    bare = false,
  }: {
    email: string;
    pendingEmail?: string | null;
    showBanner?: boolean;
    onChangeEmail?: () => void;
    onResendEmail?: () => Promise<void>;
    onCancelEmail?: () => Promise<void>;
    onChangePassword?: () => void;
    bare?: boolean;
  } = $props();

  let resendLoading = $state(false);
  let cancelLoading = $state(false);

  async function handleResend() {
    if (resendLoading || !onResendEmail) return;
    resendLoading = true;
    await onResendEmail();
    resendLoading = false;
  }

  async function handleCancel() {
    if (cancelLoading || !onCancelEmail) return;
    cancelLoading = true;
    await onCancelEmail();
    cancelLoading = false;
  }

  async function handleLogout() {
    await signOut({ redirect: false });
    window.location.href = '/';
  }
</script>

{#snippet body()}
  <div style="display: flex; align-items: center; justify-content: space-between; padding: 11px 0; border-top: 1px dashed var(--k-rule); gap: 12px;">
    <div style="min-width: 0;">
      <div style="font-family: var(--k-font-mono); font-size: 9.5px; color: var(--k-ink-mute); letter-spacing: 0.14em;">{$t['profile.konto.email']}</div>
      <div style="font-family: var(--k-font-display); font-size: 13.5px; font-weight: 600; margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{email}</div>
    </div>
    {#if onChangeEmail}
      <button
        type="button"
        onclick={onChangeEmail}
        class="font-bricolage"
        style="flex-shrink: 0; background: none; border: none; padding: 0 0 1px; cursor: pointer; font-size: 12.5px; font-weight: 700; color: var(--k-ink); border-bottom: 2px solid var(--k-ochre);"
      >{$t['profile.konto.change']}</button>
    {/if}
  </div>

  {#if showBanner && pendingEmail}
    <div
      style="
        margin-top: 10px; padding: 8px 11px; background: #fbf1d8;
        border: 1.5px solid var(--k-warn); border-radius: var(--k-radius-sm);
        font-family: var(--k-font-mono); font-size: 9.5px; color: var(--k-ink-soft); line-height: 1.55;
      "
    >
      <b style="color: var(--k-warn);">◐</b>
      {tStr($t['profile.email.pending'], { addr: pendingEmail })} ·
      <button
        type="button"
        onclick={handleResend}
        disabled={resendLoading}
        class="font-dmmono"
        style="background: none; border: none; padding: 0; cursor: pointer; font-size: 9.5px; font-weight: 700; color: var(--k-warn); border-bottom: 1.5px solid var(--k-warn); opacity: {resendLoading ? 0.5 : 1};"
      >{$t['profile.email.stage2.resend']}</button> ·
      <button
        type="button"
        onclick={handleCancel}
        disabled={cancelLoading}
        class="font-dmmono"
        style="background: none; border: none; padding: 0; cursor: pointer; font-size: 9.5px; font-weight: 700; color: var(--k-warn); border-bottom: 1.5px solid var(--k-warn); opacity: {cancelLoading ? 0.5 : 1};"
      >{$t['profile.email.stage2.cancel']}</button>
    </div>
  {/if}

  <div style="display: flex; align-items: center; justify-content: space-between; padding: 11px 0; border-top: 1px dashed var(--k-rule); gap: 12px;">
    <div style="min-width: 0;">
      <div style="font-family: var(--k-font-mono); font-size: 9.5px; color: var(--k-ink-mute); letter-spacing: 0.14em;">{$t['profile.konto.password']}</div>
      <div style="font-family: var(--k-font-display); font-size: 13.5px; font-weight: 600; margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">••••••••••</div>
    </div>
    {#if onChangePassword}
      <button
        type="button"
        onclick={onChangePassword}
        class="font-bricolage"
        style="flex-shrink: 0; background: none; border: none; padding: 0 0 1px; cursor: pointer; font-size: 12.5px; font-weight: 700; color: var(--k-ink); border-bottom: 2px solid var(--k-ochre);"
      >{$t['profile.konto.change']}</button>
    {/if}
  </div>

  <div style="display: flex; gap: 8px; margin-top: 16px;">
    <PBtn small onclick={handleLogout}>{$t['profile.konto.logout']}</PBtn>
  </div>
{/snippet}

{#if bare}
  {@render body()}
{:else}
  <PCard>
    <PCardHead n="03" title={$t['profile.konto.title']} />
    {@render body()}
  </PCard>
{/if}
