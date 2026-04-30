<script lang="ts">
  // Top-of-feed offline banner. Mounted by ForumIndexInner whenever the
  // `online` store reports false.
  //
  // Two body modes:
  //   cachedMinutes = number  →  "cached N min ago" (in-memory data exists)
  //   cachedMinutes = null    →  "content unavailable"
  //
  // Reuses `.k-pulse-dot` (motion.css) for the warn-yellow dot animation.

  import { t, tStr } from '../../../../lib/kiosk-i18n';

  let { cachedMinutes = null } = $props<{
    cachedMinutes?: number | null;
  }>();

  const body = $derived(
    cachedMinutes === null
      ? $t['state.offline.body.empty']
      : tStr($t['state.offline.body.cached'], { n: cachedMinutes })
  );
</script>

<div
  class="mb-3 px-3.5 py-2 bg-ink text-paper rounded-md flex items-center gap-2.5 text-[12px]"
  role="status"
  aria-live="polite"
>
  <span
    class="block k-pulse-dot shrink-0"
    style="width: 8px; height: 8px; border-radius: 50%; background: var(--k-warn);"
    aria-hidden="true"
  ></span>
  <b class="font-dmmono text-[10px] tracking-[0.1em]">
    {$t['state.offline.label']}
  </b>
  <span class="opacity-85">{body}</span>
</div>
