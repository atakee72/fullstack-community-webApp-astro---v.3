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
  // Moderation standing: fetched (seq-guarded) whenever a logged-in profile
  // is present, with a manual retry path on failure. Drives both
  // PModerationCard (§02) and the `banned` gate:
  // `banned = standing?.isBanned || profile?.isBanned` — the profile
  // snapshot (SSR-fast, from the session) flips `banned` on immediately so
  // PIdentityCard's edit action disables right away; the §09 danger banner
  // renders as soon as `banned` is true regardless of whether the standing
  // fetch has resolved — it prefers `standing.bannedAt` for the exact date
  // but falls back to an em-dash if that fetch is still pending or failed,
  // so a banned user is never left with a disabled edit button and no
  // explanation. If the standing fetch itself fails, `standingError` swaps
  // the §02 moderation slot for a fallback line with a retry link instead
  // of silently vanishing.
  //
  // Design source: design/handoffs/design_handoff_profile/jsx/kiosk-profile.jsx
  // (ProfileOwnDesktop grid) + kiosk-profile-states.jsx (§09, §10).

  import { formatDdMm, type ProfileMe, type ProfileStanding } from '../../../lib/profile/profileShared';
  import { t, tStr, locale } from '../../../lib/kiosk-i18n';
  import ProfileTitleBlock from './ProfileTitleBlock.svelte';
  import ProfileSkeleton from './states/ProfileSkeleton.svelte';
  import PCard from './atoms/PCard.svelte';
  import PBtn from './atoms/PBtn.svelte';
  import PIdentityCard from './PIdentityCard.svelte';
  import PModerationCard from './PModerationCard.svelte';
  import PKontoCard from './PKontoCard.svelte';
  import PActivityLedger from './PActivityLedger.svelte';
  import PMobileFold from './atoms/PMobileFold.svelte';
  import PStrikeDots from './atoms/PStrikeDots.svelte';

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
  // $state, NOT a plain let — the $effect below reads it as its re-arm guard,
  // so retryStanding()'s reset must be reactive for the effect to re-fire.
  // (The effect setting it back to true triggers one extra effect run, which
  // terminates immediately via the same guard.)
  let standingRequested = $state(false);
  let standingError = $state(false);
  $effect(() => {
    if (!profile || standingRequested) return;
    standingRequested = true;
    standingError = false;
    const mySeq = ++standingSeq;
    (async () => {
      try {
        const res = await fetch('/api/profile/standing');
        if (!res.ok) {
          if (mySeq !== standingSeq) return; // stale
          standingError = true;
          return;
        }
        const data: ProfileStanding = await res.json();
        if (mySeq !== standingSeq) return; // stale
        standing = data;
      } catch {
        if (mySeq !== standingSeq) return; // stale
        standingError = true;
      }
    })();
  });

  // Retry after a failed standing fetch — resets the request guards so the
  // $effect above fires again; the effect's own seq increment guarantees a
  // stale in-flight response from the prior attempt can't clobber this one.
  function retryStanding() {
    standingRequested = false;
    standingError = false;
  }

  const banned = $derived((standing?.isBanned ?? false) || (profile?.isBanned ?? false));

  const bannedAtLabel = $derived(standing?.bannedAt ? formatDdMm(standing.bannedAt, $locale) : null);

  // Mirrors PModerationCard's own accent derivation — the mobile fold
  // wraps the "bare" content of that same card, so its top-rule must track
  // the same clean/warn logic rather than a static warn (the design source
  // hardcodes warn because its mock always demos the rejected-content
  // anatomy; real data can be clean).
  const modAccent = $derived(
    standing && standing.strikes === 0 && standing.rejected.length === 0
      ? 'var(--k-success)'
      : 'var(--k-warn)'
  );
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
    {#if banned}
      <!-- State §09 — gesperrt. Profile stays fully readable; write actions
           (edit) are disabled via the `banned` prop threaded into PIdentityCard.
           bannedAtLabel may be null (standing fetch failed or still pending) —
           fall back to an em-dash rather than hiding the banner entirely. -->
      <div
        class="mb-5"
        style="
          padding: 8px 11px; background: #f6e3e3; border: 1.5px solid var(--k-danger);
          border-radius: var(--k-radius-sm); font-family: var(--k-font-mono); font-size: 9.5px;
          color: var(--k-ink-soft); line-height: 1.55;
        "
      >
        <b style="color: var(--k-danger); font-weight: 700;">✕</b>
        {tStr($t['profile.state.banned'], { d: bannedAtLabel ?? '—' })}
      </div>
    {/if}
    <!--
      Grid at all breakpoints. Desktop (lg+) uses explicit line placement:
      col 1 = identity → moderation → konto (rows 1–3), col 2 = archiv
      (spans all 3 rows). Below lg the same grid collapses to a single
      implicit column and `order-*` utilities re-sequence it to the
      ProfileOwnMobile stack: identity → archiv → moderation fold → konto
      fold. PIdentityCard and PActivityLedger hold internal state (edit/
      avatar, own fetch) so each is mounted exactly ONCE and just moves via
      CSS; PModerationCard/PKontoCard are stateless/props-driven, so their
      desktop-card and mobile-fold ("bare" prop, wrapped in PMobileFold)
      instances are both mounted, sourcing from the same `standing`/
      `profile` state lifted here. See src/components/profile/kiosk/CLAUDE.md.

      `min-w-0` on every direct grid-item wrapper below is load-bearing: a
      CSS grid item's automatic minimum width defaults to its content's
      min-content size, and below `lg` (single implicit column, no explicit
      `grid-template-columns`) that lets any one item's non-wrapping row
      (e.g. the identity card's 4-col stat grid) blow the whole column out
      wider than the viewport — invisibly, since `overflow-x: clip` on
      html/body (see root CLAUDE.md) hides the resulting cut-off content
      instead of showing a scrollbar. `min-w-0` resets the automatic
      minimum to 0 so the column tracks the grid container's own width.
    -->
    <div class="grid gap-[26px] items-start lg:grid-cols-[384px_1fr]">
      <!-- Identity — single mount -->
      <div class="order-1 min-w-0 lg:col-start-1 lg:row-start-1">
        <PIdentityCard
          profile={profile}
          banned={banned}
          onSaved={(p) => {
            if (!profile) return;
            profile = { ...profile, name: p.name, hobbies: p.hobbies };
          }}
        />
      </div>

      <!-- Moderation — desktop card (lg+ only) -->
      <div class="hidden min-w-0 lg:block lg:col-start-1 lg:row-start-2">
        {#if standing}
          <PModerationCard standing={standing} />
        {:else if standingError}
          <PCard accent="var(--k-warn)">
            <div class="font-dmmono" style="font-size: 10.5px; color: var(--k-ink-mute); line-height: 1.55;">
              {$t['profile.mod.loadfailed']}
              <button
                type="button"
                onclick={retryStanding}
                style="font-family: var(--k-font-mono); font-size: 10.5px; font-weight: 700; color: var(--k-ink-mute); background: none; border: none; border-bottom: 1.5px solid var(--k-ink-mute); padding: 0; cursor: pointer;"
              >{$t['profile.save.retry']}</button>
            </div>
          </PCard>
        {/if}
      </div>

      <!-- Konto — desktop card (lg+ only) -->
      <div class="hidden min-w-0 lg:block lg:col-start-1 lg:row-start-3">
        <PKontoCard email={profile.email} />
      </div>

      <!-- Archiv — single mount, spans the right column on desktop -->
      <div class="order-2 min-w-0 lg:col-start-2 lg:row-start-1 lg:row-span-3">
        <PActivityLedger />
      </div>

      <!-- Moderation — mobile fold (below lg only) -->
      <div class="order-3 min-w-0 lg:hidden">
        {#if standing}
          <PMobileFold title={$t['profile.mod.title']} accent={modAccent} open>
            {#snippet badge()}
              <PStrikeDots strikes={standing.strikes} />
            {/snippet}
            <PModerationCard standing={standing} bare />
          </PMobileFold>
        {:else if standingError}
          <PMobileFold title={$t['profile.mod.title']} accent="var(--k-warn)" open>
            <div class="font-dmmono" style="font-size: 10.5px; color: var(--k-ink-mute); line-height: 1.55;">
              {$t['profile.mod.loadfailed']}
              <button
                type="button"
                onclick={retryStanding}
                style="font-family: var(--k-font-mono); font-size: 10.5px; font-weight: 700; color: var(--k-ink-mute); background: none; border: none; border-bottom: 1.5px solid var(--k-ink-mute); padding: 0; cursor: pointer;"
              >{$t['profile.save.retry']}</button>
            </div>
          </PMobileFold>
        {/if}
      </div>

      <!-- Konto — mobile fold (below lg only) -->
      <div class="order-4 min-w-0 lg:hidden">
        <PMobileFold title={$t['profile.konto.title']} open>
          <PKontoCard email={profile.email} bare />
        </PMobileFold>
      </div>
    </div>
  </div>
{/if}
