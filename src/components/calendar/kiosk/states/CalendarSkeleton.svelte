<script lang="ts">
  // Loading skeleton — 7-col grid with a wine scanline running top to
  // bottom over the placeholder cells. Per CD's loading state in
  // `kiosk-calendar-flows.jsx:582–597`.
</script>

<div class="px-4 md:px-9 lg:px-10 pb-8">
  <div
    class="relative overflow-hidden rounded-sm border border-dashed border-rule"
    style="height: 360px"
    role="status"
    aria-live="polite"
    aria-label="Loading"
  >
    <div class="absolute inset-0 grid grid-cols-7 gap-px p-px">
      {#each Array(35) as _, i (i)}
        <div class="bg-paper-warm rounded-sm"></div>
      {/each}
    </div>
    <div
      class="absolute left-0 right-0 h-2 pointer-events-none"
      style="background: linear-gradient(180deg, transparent, rgba(178,58,91,0.34), transparent); animation: k-cal-skeleton-scan 1.4s linear infinite;"
    ></div>
  </div>
</div>

<style>
  @keyframes k-cal-skeleton-scan {
    0%   { transform: translateY(-8px); }
    100% { transform: translateY(360px); }
  }
</style>
