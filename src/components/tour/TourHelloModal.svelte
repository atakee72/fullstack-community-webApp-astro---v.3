<script lang="ts">
  // Entrance 1 — signed-in, chapter-scoped "Hallo" modal. Shown once ever
  // (server + localStorage `tourHelloDismissedAt`); after that the tour is
  // reachable only via the avatar-menu row (entrance 3). Mounted by
  // TourController when mode === 'hello'.
  import { onMount } from 'svelte';
  import { t } from '../../lib/kiosk-i18n';

  let { name = '', onStart, onDismiss } = $props<{
    name: string;
    onStart: () => void;
    onDismiss: () => void;
  }>();

  // Title interpolation (brief, Step 1): substitute {name}, then split on
  // {da} — the piece between the two halves renders as the italic accent
  // span. An empty name still works: replace('{name}', '') just leaves
  // whatever punctuation the copy authored around it (a dangling comma is
  // not a crash, and the brief doesn't require trimming it).
  const titlePre = $derived.by(() => {
    const filled = $t['tour.hello.title'].replace('{name}', name);
    const idx = filled.indexOf('{da}');
    return idx === -1 ? filled : filled.slice(0, idx);
  });
  const titlePost = $derived.by(() => {
    const filled = $t['tour.hello.title'].replace('{name}', name);
    const idx = filled.indexOf('{da}');
    return idx === -1 ? '' : filled.slice(idx + 4);
  });

  let cardEl: HTMLElement | undefined = $state();
  let startBtn: HTMLButtonElement | undefined = $state();

  onMount(() => {
    startBtn?.focus();
  });

  // Esc = dismiss; simple Tab trap (same recipe as TourSpotlight's card).
  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onDismiss();
      return;
    }
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

<!-- Plain full-viewport scrim, no hole (binding constraint — this isn't the
     spotlight ring, there's no anchor to reveal). -->
<div class="tour-hello-scrim"></div>
<div
  bind:this={cardEl}
  class="tour-hello tour-hello-sheet"
  role="dialog"
  aria-modal="true"
  aria-labelledby="tour-hello-title"
  tabindex="-1"
  onkeydown={onKeydown}
>
  <div class="tour-hello-grabber"></div>
  <button class="tour-x" onclick={onDismiss} aria-label="Schließen">✕</button>
  <div class="tour-hello-kicker font-dmmono">{$t['tour.hello.kicker']}</div>
  <h2 id="tour-hello-title" class="tour-hello-title font-bricolage">{titlePre}<span class="tour-hello-accent font-instrument">{$t['tour.hello.accent']}</span>{titlePost}</h2>
  <p class="tour-hello-body">{$t['tour.hello.body']}</p>
  <div class="tour-hello-actions">
    <button bind:this={startBtn} class="tour-hello-start font-bricolage" onclick={onStart}>{$t['tour.hello.start']}</button>
    <button class="tour-hello-later font-dmmono" onclick={onDismiss}>{$t['tour.hello.later']}</button>
  </div>
  <div class="tour-hello-foot font-dmmono">{$t['tour.hello.foot']}</div>
</div>
