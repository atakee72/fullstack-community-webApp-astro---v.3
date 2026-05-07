<script lang="ts">
  // Empty state — quiet, no CTA. CD's explicit rule: "no CTA — the
  // Kiez is quiet." Per `kiosk-calendar-flows.jsx:598–614`.

  import { t } from '../../../../lib/kiosk-i18n';
</script>

<div class="px-4 md:px-9 lg:px-10 py-16">
  <div
    class="bg-paper-warm border border-dashed border-rule rounded-sm px-6 py-10 max-w-2xl mx-auto text-center flex flex-col items-center gap-2"
  >
    <p class="font-instrument italic text-[20px] text-ink-mute">
      {$t['cal.state.empty.title']}
    </p>
    <p class="font-dmmono text-[11px] text-ink-mute">
      {$t['cal.state.empty.body']}
    </p>
  </div>
</div>
