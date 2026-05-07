<script lang="ts">
  // Filtered-empty state — events exist but none match active filters.
  // Per `kiosk-calendar-flows.jsx:615–639`.

  import { t } from '../../../../lib/kiosk-i18n';

  let { onClear } = $props<{ onClear?: () => void }>();
</script>

<div class="px-4 md:px-9 lg:px-10 py-12">
  <div
    class="bg-paper border border-dashed border-rule rounded-sm px-6 py-8 max-w-xl mx-auto flex flex-col gap-3"
  >
    <p class="font-instrument italic text-[18px] text-ink-mute text-center">
      {$t['cal.state.filtered.title']}
    </p>
    <p class="font-dmmono text-[11px] text-ink-soft text-center">
      {$t['cal.state.filtered.body']}
    </p>
    <div class="flex justify-between font-dmmono text-[11px] mt-2">
      <button
        type="button"
        onclick={onClear}
        class="text-wine hover:underline underline-offset-2"
      >
        {$t['cal.state.filtered.clear']}
      </button>
      <button
        type="button"
        onclick={onClear}
        class="text-ink-mute hover:text-ink"
      >
        {$t['cal.state.filtered.showAll']}
      </button>
    </div>
  </div>
</div>
