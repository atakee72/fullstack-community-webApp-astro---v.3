<script lang="ts">
  // First-time-only sticky-note coachmark explaining the drag-select
  // interaction. Modeled on CD's hand-written ochre annotation in the
  // calendar artboard:
  //   ochre fill, ink border, slight clockwise rotation, print shadow.
  //
  // Persistence: localStorage key 'kiosk-coachmark.drag-select'. Set
  // either when the user dismisses explicitly OR after they've
  // activated drag-select once (the parent calls dismiss()). Doesn't
  // come back unless the user clears storage.

  import { onMount } from 'svelte';
  import { t } from '../../../lib/kiosk-i18n';

  const STORAGE_KEY = 'kiosk-coachmark.drag-select';

  // Custom-event channel so the title block's `?` reopen affordance
  // can summon us without prop-drilling through 3 components.
  const REOPEN_EVENT = 'kiosk-calendar:coachmark.show';

  let visible = $state(false);

  onMount(() => {
    if (typeof localStorage === 'undefined') return;
    try {
      if (localStorage.getItem(STORAGE_KEY) !== '1') {
        // Defer a tick so the page settles before the note pops in —
        // avoids competing with the initial paint.
        setTimeout(() => (visible = true), 600);
      }
    } catch {
      /* privacy mode etc — silently skip */
    }

    function onReopen() {
      visible = true;
    }
    window.addEventListener(REOPEN_EVENT, onReopen);
    return () => window.removeEventListener(REOPEN_EVENT, onReopen);
  });

  // Expose a dismiss() the parent (CalendarMonthGrid) can call after
  // the user has successfully activated drag-select for the first time.
  // Also flips the localStorage flag so the note doesn't auto-show
  // again next session — but it can still be reopened via the `?`
  // button (which uses the event channel above and bypasses storage).
  export function dismiss() {
    visible = false;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, '1');
      } catch {
        /* ignore */
      }
    }
  }
</script>

{#if visible}
  <div
    class="absolute top-3 right-3 z-20 max-w-[230px] bg-ochre text-ink border-2 border-ink rounded-md px-3.5 py-3 shadow-[3px_3px_0_var(--k-ink,#1b1a17)] font-dmmono text-[10.5px] leading-[1.55] [transform:rotate(2.5deg)]"
    role="note"
    aria-label={$t['cal.coachmark.kicker']}
  >
    <div class="flex items-start justify-between gap-2 mb-1.5">
      <span class="font-bold tracking-[0.08em]">
        ◆ {$t['cal.coachmark.kicker']}
      </span>
      <button
        type="button"
        onclick={dismiss}
        class="font-bold text-ink/80 hover:text-ink leading-none px-1 -mt-0.5"
        aria-label={$t['cal.coachmark.dismiss']}
      >✕</button>
    </div>
    <div class="space-y-0.5">
      <div>{$t['cal.coachmark.line1']}</div>
      <div>{$t['cal.coachmark.line2']}</div>
      <div>{$t['cal.coachmark.line3']}</div>
      <div>{$t['cal.coachmark.line4']}</div>
    </div>
    <div class="mt-2 pt-2 border-t border-dashed border-ink/40 font-instrument italic">
      {$t['cal.coachmark.esc']}
    </div>
  </div>
{/if}
