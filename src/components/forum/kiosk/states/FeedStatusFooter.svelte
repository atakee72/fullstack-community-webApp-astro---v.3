<script lang="ts">
  // Forum-feed bottom rule. Carries page-count, live/offline/loading
  // status, and a load-more affordance. Per kiosk-forum-states.jsx
  // FooterRule (line 413).
  //
  // `mode` is the operative signal:
  //   loading  → query is fetching
  //   offline  → navigator.onLine === false
  //   fresh    → happy path (default)
  //
  // 'live' mode (post-just-landed celebration) ships in 5b together with
  // the optimistic compose mutation it celebrates.
  //
  // Load-more CTA renders but is inert in 4b — real pagination on the
  // Svelte forum side is queued separately.

  import { t, tStr } from '../../../../lib/kiosk-i18n';

  let {
    mode = 'fresh',
    pageCount = 1,
    currentPage = 1,
    minutesSinceLast = 28
  } = $props<{
    mode?: 'fresh' | 'loading' | 'offline' | 'live';
    pageCount?: number;
    currentPage?: number;
    minutesSinceLast?: number;
  }>();

  // Status indicator colour + copy per mode. 'live' fires for ~6 s after
  // a successful topic create — green dot with celebratory copy.
  const indicator = $derived(
    mode === 'loading'
      ? { color: 'text-ink-mute', text: $t['feed.footer.loading'] }
      : mode === 'offline'
      ? { color: 'text-warn', text: $t['feed.footer.offline'] }
      : mode === 'live'
      ? { color: 'text-success', text: $t['feed.footer.live'] }
      : {
          color: 'text-wine',
          text: tStr($t['feed.footer.fresh'], { n: minutesSinceLast })
        }
  );

  const pages = $derived(
    tStr($t['feed.footer.pages'], { current: currentPage, total: pageCount })
  );
</script>

<div
  class="mt-6 px-4 md:px-9 py-2.5 flex items-center justify-between font-dmmono text-[10px] text-ink-mute border-t border-dashed border-rule"
>
  <span>{pages}</span>
  <span class={indicator.color}>{indicator.text}</span>
  <span>{$t['feed.footer.loadMore']}</span>
</div>
