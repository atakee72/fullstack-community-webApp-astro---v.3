<script lang="ts">
  // Moderation standing card ("Leumund") — §02. Accent flips warn/success
  // depending on standing; clean accounts get a single serif-italic line,
  // accounts with strikes or rejected content get the full rejected-content
  // ledger (cross-surface tag + ABGELEHNT strap + struck-through title +
  // reason). Purely a display of GET /api/profile/standing — no actions.
  //
  // Design source: kiosk-profile.jsx (PModerationCard, PStrikeDots, PStrap,
  // PSurfaceTag) + kiosk-profile-states.jsx §09 (banned accounts show ●●●
  // via strikes=3, handled naturally since the API reports real strikes).
  //
  // `bare` (Task 10): mobile fold usage. Skips the outer PCard + §02
  // PCardHead — PMobileFold already supplies the card chrome + a "Moderation"
  // title, and the strike dots move into the fold's header badge instead of
  // repeating inline. See kiosk-profile-public.jsx (PMobileFold usage in
  // ProfileOwnMobile) + src/components/profile/kiosk/CLAUDE.md.

  import { t, locale } from '../../../lib/kiosk-i18n';
  import { contentTypeToSurface, formatDdMm, type ProfileStanding } from '../../../lib/profile/profileShared';
  import PCard from './atoms/PCard.svelte';
  import PCardHead from './atoms/PCardHead.svelte';
  import PStrikeDots from './atoms/PStrikeDots.svelte';
  import PSurfaceTag from './atoms/PSurfaceTag.svelte';
  import PStrap from './atoms/PStrap.svelte';

  let { standing, bare = false }: { standing: ProfileStanding; bare?: boolean } = $props();

  const clean = $derived(standing.strikes === 0 && standing.rejected.length === 0);
  const accent = $derived(clean ? 'var(--k-success)' : 'var(--k-warn)');
</script>

{#snippet body()}
  {#if clean}
    <div style="margin-top: 10px; font-family: var(--k-font-serif); font-style: italic; font-size: 14px; color: var(--k-ink-soft);">
      {$t['profile.mod.clean']}
    </div>
  {:else}
    <div style="margin-top: 12px;">
      <div style="font-family: var(--k-font-mono); font-size: 9.5px; color: var(--k-ink-mute); letter-spacing: 0.14em; margin-bottom: 8px;">
        {$t['profile.mod.rejected.label']}
      </div>
      {#each standing.rejected as r (r.date + r.title)}
        <div style="padding: 10px 0; border-top: 1px dashed var(--k-rule); display: grid; grid-template-columns: 44px 1fr; gap: 10px;">
          <span style="font-family: var(--k-font-mono); font-size: 10px; color: var(--k-ink-mute);">{formatDdMm(r.date, $locale)}</span>
          <div style="min-width: 0;">
            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
              <PSurfaceTag surface={contentTypeToSurface(r.contentType)} />
              <PStrap kind="abgelehnt" />
            </div>
            <div
              style="
                font-family: var(--k-font-display); font-size: 13px; font-weight: 600; margin-top: 5px;
                text-decoration: line-through; text-decoration-color: var(--k-danger); text-decoration-thickness: 1.5px;
              "
            >{r.title}</div>
            <div style="font-family: var(--k-font-mono); font-size: 10.5px; color: var(--k-ink-soft); margin-top: 3px;">
              {$t['profile.mod.reason']}{r.reason}
            </div>
          </div>
        </div>
      {/each}
      <div style="margin-top: 8px; font-family: var(--k-font-mono); font-size: 9.5px; color: var(--k-ink-mute); line-height: 1.5;">
        {$t['profile.mod.footer']}
      </div>
    </div>
  {/if}
{/snippet}

{#if bare}
  <div style="font-family: var(--k-font-display); font-size: 12.5px; font-weight: 600;">
    {$t['profile.mod.warnings']} <b>{standing.strikes} / 3</b>
  </div>
  {@render body()}
{:else}
  <PCard {accent}>
    <PCardHead n="02" title={$t['profile.mod.title']} {accent} />
    <div style="display: flex; align-items: center; justify-content: space-between;">
      <span style="font-family: var(--k-font-display); font-size: 13.5px; font-weight: 600;">
        {$t['profile.mod.warnings']} <b>{standing.strikes} / 3</b>
      </span>
      <PStrikeDots strikes={standing.strikes} />
    </div>
    {@render body()}
  </PCard>
{/if}
