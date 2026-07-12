<script lang="ts">
  // Single Archiv row — desktop grid `52px 1fr auto` + dashed top rule;
  // collapses to a stacked mobile variant below `md` (no fixed date col),
  // matching PActivityRowMobile in kiosk-profile-public.jsx.
  // Design source: kiosk-profile.jsx (PActivityRow) +
  // kiosk-profile-public.jsx (PActivityRowMobile).

  import { t, tStr, locale } from '../../../lib/kiosk-i18n';
  import { formatDdMm } from '../../../lib/profile/profileShared';
  import type { ActivityItem } from '../../../lib/profile/profileShared';
  import PSurfaceTag from './atoms/PSurfaceTag.svelte';
  import PStrap from './atoms/PStrap.svelte';

  let { item, saved }: { item: ActivityItem; saved: boolean } = $props();

  const intlLocale = $derived($locale === 'de' ? 'de-DE' : 'en-GB');

  const dateLine1 = $derived(formatDdMm(item.date, $locale));
  // zusage rows carry no meaningful time (event start, not an action
  // timestamp) — show the weekday short instead of HH:mm.
  const dateLine2 = $derived(
    item.kind === 'zusage'
      ? new Intl.DateTimeFormat(intlLocale, { weekday: 'short' }).format(new Date(item.date))
      : new Intl.DateTimeFormat(intlLocale, { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(item.date))
  );

  const kindLabel = $derived(
    item.kind === 'anzeige'
      ? item.meta.price != null
        ? `${$t['profile.kind.anzeige']} · ${item.meta.price} €`
        : item.meta.listingType === 'gift'
          ? `${$t['profile.kind.anzeige']} · ${$t['profile.kind.gratis']}`
          : $t['profile.kind.anzeige']
      : $t[`profile.kind.${item.kind}` as keyof typeof $t]
  );

  const metaLine = $derived.by(() => {
    const parts: string[] = [];
    if (item.meta.likes != null) parts.push(tStr($t['profile.meta.danke'], { n: item.meta.likes }));
    if (item.meta.comments != null) parts.push(tStr($t['profile.meta.antworten'], { n: item.meta.comments }));
    if (item.meta.going != null) parts.push(tStr($t['profile.meta.zusagen'], { n: item.meta.going }));
    if (item.meta.eventDate) parts.push(formatDdMm(item.meta.eventDate, $locale));
    return parts.join(' · ');
  });

  const byline = $derived(saved && item.by ? tStr($t['profile.archiv.by'], { name: item.by }) : null);
</script>

<!-- Desktop / tablet: fixed date column grid -->
<div
  class="hidden md:grid"
  style="grid-template-columns: 52px 1fr auto; gap: 14px; padding: 13px 0; border-top: 1px dashed var(--k-rule); align-items: start;"
>
  <div style="font-family: var(--k-font-mono); font-size: 10px; color: var(--k-ink-mute); line-height: 1.5;">
    {dateLine1}<br />{dateLine2}
  </div>
  <div style="min-width: 0;">
    <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
      <PSurfaceTag surface={item.surface} />
      <span style="font-family: var(--k-font-mono); font-size: 9.5px; color: var(--k-ink-mute); letter-spacing: 0.08em;">{kindLabel}</span>
      {#if byline}
        <span style="font-family: var(--k-font-serif); font-style: italic; font-size: 12px; color: var(--k-ink-soft);">{byline}</span>
      {/if}
    </div>
    <div style="font-family: var(--k-font-display); font-size: 15.5px; font-weight: 700; letter-spacing: -0.01em; margin-top: 4px; line-height: 1.25;">
      {#if item.href}
        <a href={item.href} style="color: var(--k-ink); text-decoration: none;" class="hover:underline">{item.title}</a>
      {:else}
        <span>{item.title}</span>
      {/if}
    </div>
    {#if metaLine}
      <div style="font-family: var(--k-font-mono); font-size: 10.5px; color: var(--k-ink-soft); margin-top: 4px;">{metaLine}</div>
    {/if}
  </div>
  <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 6px;">
    {#if item.strap}
      <PStrap kind={item.strap} />
    {/if}
    {#if saved}
      <span style="font-family: var(--k-font-mono); font-size: 13px; color: var(--k-ochre);">◈</span>
    {/if}
  </div>
</div>

<!-- Mobile: stacked variant, no fixed date col -->
<div class="md:hidden" style="padding: 12px 0; border-top: 1px dashed var(--k-rule);">
  <div style="display: flex; gap: 9px; align-items: center; flex-wrap: wrap;">
    <span style="font-family: var(--k-font-mono); font-size: 9.5px; color: var(--k-ink-mute);">{dateLine1}</span>
    <PSurfaceTag surface={item.surface} />
    <span style="font-family: var(--k-font-mono); font-size: 9px; color: var(--k-ink-mute); letter-spacing: 0.06em;">{kindLabel}</span>
    {#if item.strap}
      <PStrap kind={item.strap} />
    {/if}
  </div>
  <div style="font-family: var(--k-font-display); font-size: 14.5px; font-weight: 700; line-height: 1.3; margin-top: 5px;">
    {#if item.href}
      <a href={item.href} style="color: var(--k-ink); text-decoration: none;" class="hover:underline">{item.title}</a>
    {:else}
      <span>{item.title}</span>
    {/if}
  </div>
  {#if byline || metaLine}
    <div style="font-family: var(--k-font-mono); font-size: 10px; color: var(--k-ink-soft); margin-top: 3px; display: flex; justify-content: space-between; gap: 8px;">
      <span>{byline ? `${byline}${metaLine ? ' · ' : ''}` : ''}{metaLine}</span>
      {#if saved}
        <span style="color: var(--k-ochre);">◈</span>
      {/if}
    </div>
  {:else if saved}
    <div style="text-align: right; margin-top: 3px;">
      <span style="font-family: var(--k-font-mono); font-size: 10px; color: var(--k-ochre);">◈</span>
    </div>
  {/if}
</div>
