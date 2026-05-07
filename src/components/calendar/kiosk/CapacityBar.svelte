<script lang="ts">
  // Capacity bar — wine fill for the going portion, striped wine
  // overlay for the maybe portion. (CD's original spec called for
  // threshold colors moss/ochre/wine, but the design itself renders
  // wine at all thresholds — so we follow the design.)
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
</script>

<div
  class="h-2 bg-paper border border-ink rounded-[2px] relative overflow-hidden k-cal-capacity-bar"
  role="progressbar"
  aria-valuenow={going}
  aria-valuemax={capacity}
>
  {#if goingPct > 0}
    <div
      class="absolute left-0 top-0 bottom-0 bg-wine border-r border-ink"
      style:width={`${goingPct}%`}
    ></div>
  {/if}
  {#if maybePct > 0}
    <div
      class="absolute top-0 bottom-0 bg-[repeating-linear-gradient(45deg,rgba(178,58,91,0.55)_0_4px,transparent_4px_8px)]"
      style:left={`${goingPct}%`}
      style:width={`${maybePct}%`}
    ></div>
  {/if}
</div>
