<script lang="ts">
  // Renders ONE active spotlight stop: the dim/ring overlay + the copy card.
  // Mounted/unmounted per stop by TourController (targetRect flips to null
  // during the scroll-then-measure transition, which tears this component
  // down and rebuilds it — that's what gives us a fresh onMount, and with
  // it a fresh focus + fresh matchMedia read, per stop for free).
  import { onMount } from 'svelte';
  import { t } from '../../lib/kiosk-i18n';
  import type { TourChapter } from '../../lib/tour/tourChapters';

  let { chapter, stopIndex, availableStops, targetRect, radius, onNext, onBack, onClose } = $props<{
    chapter: TourChapter;
    stopIndex: number;              // index into availableStops
    availableStops: number[];       // indices of chapter.stops that currently have anchors
    targetRect: { top: number; left: number; width: number; height: number }; // viewport coords
    radius: string;                 // computed borderRadius of the anchor
    onNext: () => void; onBack: () => void; onClose: () => void;
  }>();

  const stop = $derived(chapter.stops[availableStops[stopIndex]]);
  const isLast = $derived(stopIndex === availableStops.length - 1);
  const isMobileVp = typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches;
  const bodyKey = $derived(isMobileVp && stop.bodyMobileKey ? stop.bodyMobileKey : stop.bodyKey);
  function stopLinkHref(l: NonNullable<import('../../lib/tour/tourChapters').TourStop['link']>): string {
    return `${l.hrefBase}?prefill_title=${encodeURIComponent($t[l.prefillTitleKey])}&prefill_body=${encodeURIComponent($t[l.prefillBodyKey])}&prefill_tags=${encodeURIComponent(l.prefillTags)}`;
  }

  let cardEl: HTMLElement | undefined = $state();
  let isDesktop = $state(true);

  onMount(() => {
    // matchMedia read once at mount — no live tracking (brief, Step 1).
    isDesktop = window.matchMedia('(min-width: 1024px)').matches;
    cardEl?.focus();
  });

  // Desktop: fixed-positioned below (or above, if it wouldn't fit) the
  // anchor, clamped horizontally to the viewport. Mobile: no inline
  // top/left at all — the `.tour-card` mobile media query in global.css
  // (left/right/bottom, `!important` on top/left) fully owns position,
  // so we deliberately emit nothing there rather than adding a redundant
  // `.tour-sheet` class (not present in the binding CSS block — see
  // task-3-report.md deviations).
  const cardStyle = $derived.by(() => {
    if (!isDesktop) return '';
    const CARD_H = 320;
    const left = Math.min(Math.max(targetRect.left, 12), window.innerWidth - 392);
    const bottomEdge = targetRect.top + targetRect.height;
    if (bottomEdge + 16 + CARD_H > window.innerHeight) {
      return `position:fixed;width:380px;left:${left}px;bottom:${window.innerHeight - targetRect.top + 16}px;`;
    }
    return `position:fixed;width:380px;left:${left}px;top:${bottomEdge + 16}px;`;
  });

  function onCardKeydown(e: KeyboardEvent) {
    // Tab trap — Escape/ArrowLeft/ArrowRight are handled by the controller's
    // document-level keydown listener.
    if (e.key !== 'Tab' || !cardEl) return;
    const focusables = Array.from(cardEl.querySelectorAll<HTMLElement>('button, a[href]'));
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
</script>

<!-- Ring = spotlight + scrim in one: oversized box-shadow paints the dim layer,
     the hole shows the anchor at full brightness. Stacking-context-proof
     (plan decision 1; deviates from handoff §03 z-index mechanism). -->
<div class="tour-ring" style={`top:${targetRect.top - 6}px;left:${targetRect.left - 6}px;width:${targetRect.width + 12}px;height:${targetRect.height + 12}px;border-radius:${radius};`}></div>
<div class="tour-card" bind:this={cardEl} tabindex="-1" role="dialog" aria-modal="true" aria-label={$t[stop.titleKey]} style={cardStyle} onkeydown={onCardKeydown}>
  <div class="tour-card-head">
    <span class="tour-kicker font-dmmono">{$t[chapter.kickerKey]}</span>
    <button class="tour-x font-dmmono" onclick={onClose} aria-label={$t['tour.chrome.close']}>✕</button>
  </div>
  <div class="tour-title font-bricolage">{$t[stop.titleKey]}</div>
  <div class="tour-body">{$t[bodyKey]}</div>
  {#if isLast}
    <div class="tour-end">
      <span class="tour-stamp font-dmmono"><span>✓</span><span>{$t[chapter.final ? 'tour.chrome.stampFinal' : 'tour.chrome.stamp']}</span></span>
      <span class="tour-end-note">{$t[chapter.endNoteKey]}</span>
    </div>
  {/if}
  {#if stop.link}
    <a class="tour-nextch font-dmmono" href={stopLinkHref(stop.link)}>{$t[stop.link.labelKey]}</a>
  {/if}
  <div class="tour-foot">
    <span class="tour-dots">{#each availableStops as _, i}<span class="tour-dot" class:on={i === stopIndex} class:past={i <= stopIndex}></span>{/each}</span>
    <span class="tour-count font-dmmono">{stopIndex + 1} / {availableStops.length}</span>
    <span class="tour-actions">
      {#if stopIndex > 0}<button class="tour-back font-dmmono" onclick={onBack}>{$t['tour.chrome.back']}</button>{/if}
      <button class="tour-next font-bricolage" onclick={isLast ? onClose : onNext}>{isLast ? $t['tour.chrome.done'] : $t['tour.chrome.next']}</button>
    </span>
  </div>
  {#if isLast && chapter.nextChapterHref && chapter.nextChapterKey}<a class="tour-nextch font-dmmono" href={chapter.nextChapterHref}>{$t[chapter.nextChapterKey]}</a>{/if}
</div>
