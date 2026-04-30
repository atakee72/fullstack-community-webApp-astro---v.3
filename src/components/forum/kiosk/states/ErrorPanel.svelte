<script lang="ts">
  // 503 / fetch-failure panel for the forum index.
  //
  // Renders only when `query.isError` is true — at that point TanStack
  // Query has already exhausted its built-in retries, so the JSX-fictional
  // "auto-retry in 00:08" countdown is dropped. Manual reload only.
  //
  // The "Status-Seite" ghost link from the JSX is also dropped — we don't
  // run a status page, and adding a dead link is worse than not offering
  // one. Add it back when a real status surface ships.

  import KioskBtn from '../KioskBtn.svelte';
  import { t } from '../../../../lib/kiosk-i18n';

  let { onReload } = $props<{
    onReload: () => void;
  }>();
</script>

<div
  class="my-12 mx-2 md:mx-0 px-8 md:px-10 py-12 md:py-[50px] bg-paper-warm border-2 border-danger rounded-2xl shadow-[3px_3px_0_var(--k-danger)] relative"
  role="alert"
  aria-live="polite"
>
  <p class="font-dmmono text-[11px] uppercase tracking-[0.15em] text-danger mb-1.5">
    {$t['state.error.kicker']}
  </p>
  <h2 class="font-bricolage font-extrabold tracking-tight text-3xl md:text-[32px] text-ink mb-2">
    {$t['state.error.title']}
  </h2>
  <p
    class="font-instrument italic text-ink-soft text-base md:text-[17px] leading-relaxed max-w-2xl mb-5"
  >
    {$t['state.error.body']}
  </p>
  <div class="flex flex-wrap gap-2.5 items-center">
    <KioskBtn variant="primary" size="md" onclick={onReload}>
      {$t['state.error.cta.reload']}
    </KioskBtn>
  </div>
</div>
