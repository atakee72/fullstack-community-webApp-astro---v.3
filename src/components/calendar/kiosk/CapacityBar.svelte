<script lang="ts">
  // Capacity bar with threshold colors per CD's spec:
  //   ≤59 %  → moss (green-ish, plenty of room)
  //   60–84% → ochre (filling up)
  //   ≥85 %  → wine (almost / fully booked)
  // Maybe-overlay rendered as 45° striped extension past the
  // going-fill so users see committed vs. tentative attendance.
  // Uses k-cal-capacity-bar animation on mount.

  let {
    going,
    maybe = 0,
    capacity
  } = $props<{
    going: number;
    maybe?: number;
    capacity: number;
  }>();

  const goingPct = $derived(Math.min(100, (going / Math.max(1, capacity)) * 100));
  const maybePct = $derived(Math.min(100 - goingPct, (maybe / Math.max(1, capacity)) * 100));

  // Threshold color (going-fill only)
  const fillClass = $derived(
    goingPct <= 59 ? 'bg-moss' : goingPct < 85 ? 'bg-ochre' : 'bg-wine'
  );
</script>

<div
  class="h-2 bg-paper border border-ink rounded-[2px] relative overflow-hidden k-cal-capacity-bar"
  role="progressbar"
  aria-valuenow={going}
  aria-valuemax={capacity}
>
  {#if goingPct > 0}
    <div
      class={`absolute left-0 top-0 bottom-0 ${fillClass} border-r border-ink`}
      style:width={`${goingPct}%`}
    ></div>
  {/if}
  {#if maybePct > 0}
    <div
      class="absolute top-0 bottom-0 bg-[repeating-linear-gradient(45deg,rgba(232,165,58,0.55)_0_4px,transparent_4px_8px)]"
      style:left={`${goingPct}%`}
      style:width={`${maybePct}%`}
    ></div>
  {/if}
</div>
