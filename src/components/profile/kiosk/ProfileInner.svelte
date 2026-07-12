<script lang="ts">
  // Profile page orchestrator. Three top-level branches:
  //   1. !loggedIn              → state §10 "signed out" card (no redirect —
  //                                middleware no longer protects /profile).
  //   2. loggedIn && !profile   → ProfileSkeleton + a seq-guarded client
  //                                refetch of GET /api/profile/me (covers the
  //                                edge case where SSR's getProfileMe() came
  //                                back null, e.g. a session that outlived
  //                                its user record).
  //   3. else                   → ProfileTitleBlock + the real content grid.
  //      Tasks 6 (identity/moderation), 7 (moderation card details), 8
  //      (konto), 9 (archiv) mount their cards into the slots marked below —
  //      HTML comments only, no placeholder copy.
  //
  // Design source: design/handoffs/design_handoff_profile/jsx/kiosk-profile.jsx
  // (ProfileOwnDesktop grid) + kiosk-profile-states.jsx (§10).

  import type { ProfileMe } from '../../../lib/profile/profileShared';
  import { t } from '../../../lib/kiosk-i18n';
  import ProfileTitleBlock from './ProfileTitleBlock.svelte';
  import ProfileSkeleton from './states/ProfileSkeleton.svelte';
  import PCard from './atoms/PCard.svelte';
  import PBtn from './atoms/PBtn.svelte';

  let { initialProfile = null, loggedIn = false }: {
    initialProfile?: ProfileMe | null;
    loggedIn?: boolean;
  } = $props();

  let profile = $state<ProfileMe | null>(initialProfile);

  // Seq-guarded client refetch — only runs when we land in the "logged in
  // but no SSR profile" edge case. Mirrors the seq pattern used by
  // NewsboardIndexInner's refetch() (see src/components/newsboard/kiosk/CLAUDE.md).
  let seq = 0;
  $effect(() => {
    if (!loggedIn || profile) return;
    const mySeq = ++seq;
    (async () => {
      try {
        const res = await fetch('/api/profile/me');
        if (!res.ok) return;
        const data = await res.json();
        if (mySeq !== seq) return; // stale
        profile = data.profile ?? null;
      } catch {
        /* stays on skeleton; no retry loop for task 5 scope */
      }
    })();
  });
</script>

{#if !loggedIn}
  <!-- State §10 — signed out. Replaces the legacy 🔒 card; no hard redirect. -->
  <div class="min-h-[55vh] flex items-center justify-center px-4 py-16">
    <PCard pad={28}>
      <div style="max-width: 340px; text-align: center;">
        <div
          class="font-instrument italic"
          style="font-size: 15px; color: var(--k-ink-soft); margin-bottom: 16px;"
        >
          {$t['profile.state.loggedout']}
        </div>
        <PBtn primary small href="/login">{$t['profile.state.login']}</PBtn>
      </div>
    </PCard>
  </div>
{:else if !profile}
  <ProfileSkeleton />
{:else}
  <ProfileTitleBlock handle={profile.handle} since={profile.memberSince} />
  <div class="px-4 lg:px-9 py-6">
    <div class="grid gap-[26px] items-start lg:grid-cols-[384px_1fr]">
      <!-- Left column: identity, moderation, konto -->
      <div class="flex flex-col gap-5">
        <!-- @slot identity — Task 6 mounts PIdentityCard here -->
        <!-- @slot moderation — Task 7 mounts PModerationCard here -->
        <!-- @slot konto — Task 8 mounts PKontoCard here -->
      </div>
      <!-- Right column: archiv -->
      <div class="flex flex-col gap-5">
        <!-- @slot archiv — Task 9 mounts PActivityLedger here -->
      </div>
    </div>
  </div>
{/if}
