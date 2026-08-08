<script lang="ts">
  // Spotlight-tour orchestrator. Mounted once, globally, in KioskLayout.
  // Five non-negotiable duties (task-3 brief):
  //   1. Wait for hydration before measuring an anchor (waitForAnchor).
  //   2. Never crash if an anchor is entirely absent (guarded queries throughout).
  //   3. Compute available stops per page load — missing anchors are skipped,
  //      the stop counter adapts (e.g. logged-out users miss "saved"/"mine").
  //   4. Scroll first, measure AFTER the scroll settles (content-visibility:auto
  //      cards report a stale rect until they're actually in viewport).
  //   5. A chapter never crosses a navigation — nav-away aborts and stamps seen.
  import { CHAPTERS_BY_PAGE, type TourChapter } from '../../lib/tour/tourChapters';
  import { getLocalState, isChapterSeen, markChapterSeen, markHelloDismissed, syncWithServer, type TourState } from '../../lib/tour/tourStore';
  import TourSpotlight from './TourSpotlight.svelte';
  import TourHelloModal from './TourHelloModal.svelte';   // Task 4 — placeholder, see that file
  import TourOfferStrip from './TourOfferStrip.svelte';   // Task 4 — placeholder, see that file

  let { user = null, page = undefined } = $props<{ user: { name?: string } | null; page?: string }>();

  // Deliberate initial-value capture: `page` is set once by KioskLayout at
  // mount and never changes within a page's lifetime (each Astro navigation
  // remounts this island fresh).
  // svelte-ignore state_referenced_locally
  const chapter: TourChapter | null = page ? (CHAPTERS_BY_PAGE[page] ?? null) : null;
  const loggedIn = $derived(!!user);

  let mode = $state<'idle' | 'hello' | 'touring' | 'offer'>('idle');
  let state = $state<TourState>(getLocalState());
  let availableStops = $state<number[]>([]);
  let stopIndex = $state(0);
  let targetRect = $state<{ top: number; left: number; width: number; height: number } | null>(null);
  let radius = $state('999px');
  let triggerEl: HTMLElement | null = null; // focus restore target

  // ── Duty 1: wait for hydration — poll for an anchor before starting. ──
  function waitForAnchor(sel: string, timeoutMs = 4000): Promise<HTMLElement | null> {
    return new Promise((resolve) => {
      const t0 = performance.now();
      (function poll() {
        const el = document.querySelector<HTMLElement>(sel);
        if (el) return resolve(el);
        if (performance.now() - t0 > timeoutMs) return resolve(null);
        requestAnimationFrame(poll);
      })();
    });
  }

  async function startChapter() {
    if (!chapter) return;
    triggerEl = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    await waitForAnchor(chapter.stops[0].anchor);           // hydration gate
    // Duty 3: compute available stops — missing anchors are skipped, counter adapts.
    availableStops = chapter.stops.map((s, i) => (document.querySelector(s.anchor) ? i : -1)).filter((i) => i >= 0);
    if (!availableStops.length) return;
    stopIndex = 0; mode = 'touring';
    await showStop();
  }

  // Duty 4: scroll first, measure AFTER the scroll (content-visibility:auto).
  async function showStop() {
    if (!chapter) return;
    targetRect = null; // hide ring+card during transition (old card fades via mode CSS)
    const sel = chapter.stops[availableStops[stopIndex]].anchor;
    const el = document.querySelector<HTMLElement>(sel);
    if (!el) { // anchor vanished mid-chapter → skip forward (or end)
      availableStops = availableStops.filter((_, i) => i !== stopIndex);
      if (!availableStops.length || stopIndex >= availableStops.length) return void endChapter();
      return void showStop();
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
    await new Promise((r) => setTimeout(r, reduced ? 50 : 380)); // let the scroll settle
    const r = el.getBoundingClientRect();
    radius = getComputedStyle(el).borderRadius || '999px';
    targetRect = { top: r.top, left: r.left, width: r.width, height: r.height };
  }

  function next() { if (stopIndex < availableStops.length - 1) { stopIndex++; void showStop(); } }
  function back() { if (stopIndex > 0) { stopIndex--; void showStop(); } }

  function endChapter() {
    mode = 'idle'; targetRect = null;
    if (chapter) void markChapterSeen(chapter.key, loggedIn); // ✕/done/nav-away all write; no-op if seen
    state = getLocalState();
    triggerEl?.focus();
  }

  function onKeydown(e: KeyboardEvent) {
    if (mode !== 'touring') return;
    if (e.key === 'Escape') { e.preventDefault(); endChapter(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); back(); }
  }

  $effect(() => {
    // Public start hook — entrance 3 (avatar menu) + dev testing.
    (window as any).__mahalleTourStart = () => { if (mode !== 'touring') void startChapter(); };
    document.addEventListener('keydown', onKeydown);
    // Duty 5: a chapter never crosses a navigation — nav-away = abort (writes stamp).
    const onNav = () => { if (mode === 'touring') endChapter(); };
    document.addEventListener('astro:before-preparation', onNav);
    // Keep ring glued to the anchor while the page scrolls/resizes under it.
    let raf = 0;
    const onScroll = () => {
      if (mode !== 'touring' || !chapter || !targetRect) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = document.querySelector<HTMLElement>(chapter.stops[availableStops[stopIndex]].anchor);
        if (!el) return;
        const r = el.getBoundingClientRect();
        targetRect = { top: r.top, left: r.left, width: r.width, height: r.height };
      });
    };
    document.addEventListener('scroll', onScroll, { passive: true, capture: true });
    window.addEventListener('resize', onScroll);
    return () => {
      delete (window as any).__mahalleTourStart;
      document.removeEventListener('keydown', onKeydown);
      document.removeEventListener('astro:before-preparation', onNav);
      document.removeEventListener('scroll', onScroll, { capture: true });
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
    };
  });

  // Entrance decision — ONE-SHOT per mount (`decided` guard). Without it the
  // effect re-fires every time `mode` returns to 'idle' (end of hello/tour),
  // and its async tail can then stomp an already-started tour: mode flips to
  // 'idle' → guard passes → syncWithServer resolves AFTER startChapter set
  // 'touring' → assignment overwrites mid-tour. Caught in plan audit.
  let decided = false;
  $effect(() => {
    // hello modal (signed-in, never dismissed, chapter surface) → offer strip
    // (chapter surface, chapter unseen) → idle. Client-only: no SSR flash.
    if (!chapter || decided) return;
    decided = true;
    (async () => {
      if (loggedIn) state = await syncWithServer();
      if (mode !== 'idle') return; // a tour was started meanwhile (avatar row / dev hook)
      if (loggedIn && !state.helloDismissedAt) mode = 'hello';
      else if (!isChapterSeen(state, chapter.key)) mode = 'offer';
    })();
  });
</script>

{#if mode === 'hello' && chapter}
  <TourHelloModal name={user?.name?.split(' ')[0] ?? ''} onStart={() => { void markHelloDismissed(loggedIn); mode = 'idle'; void startChapter(); }} onDismiss={() => { void markHelloDismissed(loggedIn); state = getLocalState(); mode = isChapterSeen(state, chapter.key) ? 'idle' : 'offer'; }} />
{:else if mode === 'offer' && chapter}
  <TourOfferStrip page={chapter.page} onStart={() => { mode = 'idle'; void startChapter(); }} onDismiss={() => { void markChapterSeen(chapter.key, loggedIn); state = getLocalState(); mode = 'idle'; }} />
{:else if mode === 'touring' && chapter && targetRect}
  <TourSpotlight {chapter} {stopIndex} {availableStops} {targetRect} {radius} onNext={next} onBack={back} onClose={endChapter} />
{/if}
