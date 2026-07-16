<script lang="ts">
  /**
   * „Die Beilage" masthead — Kurier-family signal (same centered anatomy +
   * double rule as the Newsboard masthead, rust instead of ink). The strap
   * + title always render; the stats line only in the full (non-compact)
   * variant, and only once both `count` and `latestISO` are provided
   * (compact mounts, e.g. a future tag page, omit them on purpose).
   * The double rule is the standalone `.bl-mast-rules` element from
   * blog.css — never reorder or simplify it.
   */
  import { locale, t } from '../../../lib/kiosk-i18n';
  import { fmtDateKicker } from '../../../lib/blog/beilage';

  let {
    compact = false,
    count,
    latestISO,
  }: { compact?: boolean; count?: number; latestISO?: string | null } = $props();

  const showStats = $derived(!compact && count !== undefined && latestISO !== undefined);
</script>

<div class="text-center" style="padding: {compact ? '18px 24px 0' : '26px 24px 0'};">
  <div
    class="font-dmmono inline-block"
    style="font-size: 10px; letter-spacing: 0.22em; color: var(--k-ink-mute); border-top: 1px solid var(--k-ink); padding-top: 8px;"
  >{$t['blog.mast.strap']}</div>

  <h1
    class="font-bricolage {compact ? 'text-[38px]' : 'text-[34px] lg:text-[58px]'}"
    style="font-weight: 800; letter-spacing: -0.035em; line-height: 0.95; margin: {compact ? '6px 0 4px' : '10px 0 6px'};"
  >
    Die <span class="font-instrument italic font-normal" style="color: var(--k-rust);">Beilage</span>
  </h1>

  {#if showStats}
    <div
      class="font-dmmono flex justify-center items-center flex-wrap"
      style="gap: 18px; font-size: 10.5px; color: var(--k-ink-mute); margin: 4px 0 12px;"
    >
      <span>{$t['blog.mast.from']}</span><span>·</span>
      <span>{count} {$t['blog.mast.posts']}</span><span>·</span>
      <span style="color: var(--k-rust);">{$t['blog.mast.latest']}: {latestISO ? fmtDateKicker(latestISO, $locale) : '—'}</span>
    </div>
  {:else if compact}
    <div style="height: 10px;"></div>
  {/if}

  <div class="bl-mast-rules"></div>
</div>
