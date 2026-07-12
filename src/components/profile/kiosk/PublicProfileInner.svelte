<script lang="ts">
  // Public "Nachbarn" profile orchestrator — trimmed sibling of
  // ProfileInner.svelte. No auth/skeleton/banned branches: the SSR route
  // (`src/pages/nachbarn/[handle].astro`) already resolved `profile` (or
  // rendered PublicNotFound instead of mounting this island at all), so
  // this component only ever renders the "found" state.
  //
  // Layout: single responsive grid, matching ProfileInner's `order-*` +
  // `lg:col/row-start` reflow pattern rather than two separate component
  // trees — everything here is single-mount (no stateful desktop/mobile
  // duplication needed, unlike own-profile's PModerationCard/PKontoCard).
  //   Desktop (lg+): col 1 = identity → chronik → contact-note(desktop copy),
  //   col 2 = ledger (full column).
  //   Mobile (<lg): identity(compact, no stats) → chronik → ledger
  //   ("Im Kiez unterwegs" heading) → contact-note(mobile copy).
  // The desktop contact-note is nested inside the left-column flex wrapper
  // with `hidden lg:block` (mobile never sees it); the mobile contact-note
  // is its own grid item with `lg:hidden` positioned after the ledger.
  //
  // Design source: design/handoffs/design_handoff_profile/jsx/
  // kiosk-profile-public.jsx (PublicProfileDesktop + PublicProfileMobile).

  import { t } from '../../../lib/kiosk-i18n';
  import type { ChronikData, PublicProfile } from '../../../lib/profile/profileShared';
  import ProfileTitleBlock from './ProfileTitleBlock.svelte';
  import PPublicIdentityCard from './PPublicIdentityCard.svelte';
  import PChronikStrip from './PChronikStrip.svelte';
  import PActivityLedger from './PActivityLedger.svelte';

  let { profile, chronik = null }: { profile: PublicProfile; chronik?: ChronikData | null } = $props();

  // Same belt-and-braces gate as ProfileInner's showChronik — chronik.ts's
  // contract always returns at least dabei+heute, but render nothing rather
  // than an empty strip shell if that ever changes.
  const showChronik = $derived(!!chronik && chronik.stops.length > 0);
</script>

<ProfileTitleBlock handle={profile.handle} since={profile.memberSince} own={false} />

<div class="px-4 lg:px-9 py-6">
  <!--
    `min-w-0` on every direct grid-item wrapper is load-bearing — see
    src/components/profile/kiosk/CLAUDE.md's "Grid item overflow gotcha".
  -->
  <div class="grid gap-[26px] items-start lg:grid-cols-[384px_1fr]">
    <!-- Left column (desktop) / identity+chronik lead (mobile) — single mount -->
    <div class="order-1 min-w-0 flex flex-col gap-5 lg:col-start-1 lg:row-start-1">
      <PPublicIdentityCard {profile} />
      {#if showChronik && chronik}
        <PChronikStrip {chronik} />
      {/if}
      <div
        class="hidden lg:block"
        style="padding: 12px 16px; border: 1.5px dashed var(--k-rule); border-radius: var(--k-radius-md); font-family: var(--k-font-mono); font-size: 10px; color: var(--k-ink-mute); line-height: 1.6;"
      >
        {$t['profile.public.contact']}
      </div>
    </div>

    <!-- Right column (desktop) / ledger (mobile) — single mount -->
    <div class="order-2 min-w-0 lg:col-start-2 lg:row-start-1">
      <PActivityLedger publicHandle={profile.handle} headingKey="profile.public.ledger" />
    </div>

    <!-- Mobile-only contact note, after the ledger -->
    <div
      class="order-3 min-w-0 lg:hidden"
      style="padding: 11px 14px; border: 1.5px dashed var(--k-rule); border-radius: var(--k-radius-md); font-family: var(--k-font-mono); font-size: 9.5px; color: var(--k-ink-mute); line-height: 1.6;"
    >
      {$t['profile.public.contact.mobile']}
    </div>
  </div>
</div>
