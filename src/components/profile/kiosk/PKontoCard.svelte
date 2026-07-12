<script lang="ts">
  // Konto (account) card — §03. Display-only rows for E-MAIL / PASSWORT (no
  // "ändern" actions, no Gefahrenzone — both are Plan B) + Abmelden.
  // Design source: kiosk-profile.jsx (PKontoCard, PKontoRow) minus the
  // action-link + danger-zone anatomy per Plan A exclusions.

  import { signOut } from 'auth-astro/client';
  import { t } from '../../../lib/kiosk-i18n';
  import PCard from './atoms/PCard.svelte';
  import PCardHead from './atoms/PCardHead.svelte';
  import PBtn from './atoms/PBtn.svelte';

  let { email }: { email: string } = $props();

  async function handleLogout() {
    await signOut({ redirect: false });
    window.location.href = '/';
  }
</script>

<PCard>
  <PCardHead n="03" title={$t['profile.konto.title']} />

  <div style="display: flex; align-items: center; justify-content: space-between; padding: 11px 0; border-top: 1px dashed var(--k-rule); gap: 12px;">
    <div style="min-width: 0;">
      <div style="font-family: var(--k-font-mono); font-size: 9.5px; color: var(--k-ink-mute); letter-spacing: 0.14em;">{$t['profile.konto.email']}</div>
      <div style="font-family: var(--k-font-display); font-size: 13.5px; font-weight: 600; margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{email}</div>
    </div>
  </div>

  <div style="display: flex; align-items: center; justify-content: space-between; padding: 11px 0; border-top: 1px dashed var(--k-rule); gap: 12px;">
    <div style="min-width: 0;">
      <div style="font-family: var(--k-font-mono); font-size: 9.5px; color: var(--k-ink-mute); letter-spacing: 0.14em;">{$t['profile.konto.password']}</div>
      <div style="font-family: var(--k-font-display); font-size: 13.5px; font-weight: 600; margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">••••••••••</div>
    </div>
  </div>

  <div style="display: flex; gap: 8px; margin-top: 16px;">
    <PBtn small onclick={handleLogout}>{$t['profile.konto.logout']}</PBtn>
  </div>
</PCard>
