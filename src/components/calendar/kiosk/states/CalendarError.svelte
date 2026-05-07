<script lang="ts">
  // Error state — danger-bordered card with a "nochmal" retry CTA.
  // Per `kiosk-calendar-flows.jsx:640–662`.

  import { t } from '../../../../lib/kiosk-i18n';

  let { onRetry } = $props<{ onRetry?: () => void }>();
</script>

<div class="px-4 md:px-9 lg:px-10 py-16">
  <div
    class="bg-paper border-2 border-danger rounded-sm px-6 py-8 max-w-xl mx-auto flex flex-col items-center gap-3 text-center shadow-[3px_3px_0_var(--k-danger,#a83245)]"
    role="alert"
  >
    <p class="font-dmmono text-[11px] uppercase tracking-[0.12em] font-bold text-danger">
      ◆ {$t['cal.state.error.kicker']}
    </p>
    <p class="font-instrument italic text-[16px] text-ink leading-[1.4]">
      {$t['cal.state.error.title']}
    </p>
    <button
      type="button"
      onclick={onRetry}
      class="mt-2 px-3.5 py-1.5 rounded-full bg-wine text-paper border-2 border-ink font-bricolage font-semibold text-[13px] hover:scale-[1.02] transition-transform"
    >
      {$t['cal.state.error.retry']}
    </button>
  </div>
</div>
