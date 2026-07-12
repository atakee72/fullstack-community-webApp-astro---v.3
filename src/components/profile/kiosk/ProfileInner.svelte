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
  //      Task 9 (archiv) mounts its card into the slot marked below —
  //      HTML comments only, no placeholder copy.
  //
  // Moderation standing: fetched once (seq-guarded) whenever a logged-in
  // profile is present. Drives both PModerationCard (§02) and the
  // `banned` gate: `banned = standing?.isBanned || profile?.isBanned` — the
  // profile snapshot (SSR-fast, from the session) flips `banned` on
  // immediately so PIdentityCard's edit action disables right away; the
  // §09 danger banner itself waits on `standing.bannedAt` (client fetch,
  // arrives moments later) since that's the only source with the actual date.
  //
  // Design source: design/handoffs/design_handoff_profile/jsx/kiosk-profile.jsx
  // (ProfileOwnDesktop grid) + kiosk-profile-states.jsx (§09, §10).

  import type { ProfileMe, ProfileStanding } from '../../../lib/profile/profileShared';
  import { t, tStr, locale } from '../../../lib/kiosk-i18n';
  import ProfileTitleBlock from './ProfileTitleBlock.svelte';
  import ProfileSkeleton from './states/ProfileSkeleton.svelte';
  import PCard from './atoms/PCard.svelte';
  import PBtn from './atoms/PBtn.svelte';
  import PIdentityCard from './PIdentityCard.svelte';
  import PModerationCard from './PModerationCard.svelte';
  import PKontoCard from './PKontoCard.svelte';

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

  // ─── Moderation standing (Task 8) ──────────────────────────────────────
  let standing = $state<ProfileStanding | null>(null);
  let standingSeq = 0;
  let standingRequested = false;
  $effect(() => {
    if (!profile || standingRequested) return;
    standingRequested = true;
    const mySeq = ++standingSeq;
    (async () => {
      try {
        const res = await fetch('/api/profile/standing');
        if (!res.ok) return;
        const data: ProfileStanding = await res.json();
        if (mySeq !== standingSeq) return; // stale
        standing = data;
      } catch {
        /* moderation card stays unmounted; not critical to first paint */
      }
    })();
  });

  const banned = $derived((standing?.isBanned ?? false) || (profile?.isBanned ?? false));

  function formatDdMm(iso: string, loc: 'de' | 'en'): string {
    const parts = new Intl.DateTimeFormat(loc === 'de' ? 'de-DE' : 'en-GB', {
      day: '2-digit',
      month: '2-digit',
    }).formatToParts(new Date(iso));
    const day = parts.find((p) => p.type === 'day')?.value ?? '';
    const month = parts.find((p) => p.type === 'month')?.value ?? '';
    return `${day}.${month}`;
  }

  const bannedAtLabel = $derived(standing?.bannedAt ? formatDdMm(standing.bannedAt, $locale) : null);
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
    {#if banned && bannedAtLabel}
      <!-- State §09 — gesperrt. Profile stays fully readable; write actions
           (edit) are disabled via the `banned` prop threaded into PIdentityCard. -->
      <div
        class="mb-5"
        style="
          padding: 8px 11px; background: #f6e3e3; border: 1.5px solid var(--k-danger);
          border-radius: var(--k-radius-sm); font-family: var(--k-font-mono); font-size: 9.5px;
          color: var(--k-ink-soft); line-height: 1.55;
        "
      >
        <b style="color: var(--k-danger); font-weight: 700;">✕</b>
        {tStr($t['profile.state.banned'], { d: bannedAtLabel })}
      </div>
    {/if}
    <div class="grid gap-[26px] items-start lg:grid-cols-[384px_1fr]">
      <!-- Left column: identity, moderation, konto -->
      <div class="flex flex-col gap-5">
        <PIdentityCard
          profile={profile}
          banned={banned}
          onSaved={(p) => {
            if (!profile) return;
            profile = { ...profile, name: p.name, hobbies: p.hobbies };
          }}
        />
        {#if standing}
          <PModerationCard standing={standing} />
        {/if}
        <PKontoCard email={profile.email} />
      </div>
      <!-- Right column: archiv -->
      <div class="flex flex-col gap-5">
        <!-- @slot archiv — Task 9 mounts PActivityLedger here -->
      </div>
    </div>
  </div>
{/if}
