<script lang="ts">
  import { t, locale } from '../../../../lib/kiosk-i18n';
  import KuratiertChip from '../primitives/KuratiertChip.svelte';

  let {
    issue,
    articleCount,
    sourceCount,
    degraded = false,
  }: { issue: number; articleCount: number; sourceCount: number; degraded?: boolean } = $props();

  // Server passes issue; the dateline is purely cosmetic and may use the client
  // locale's today (acceptable — the issue NUMBER is the server-fixed value).
  const dateline = $derived(
    new Date().toLocaleDateString($locale === 'de' ? 'de-DE' : 'en-GB',
      { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  );
</script>

<section class="relative" style="padding:30px 36px 22px; border-bottom:2px solid var(--k-ink);">
  <!-- Top ribbon -->
  <div
    class="flex justify-between items-center font-dmmono uppercase"
    style="font-size:10.5px; font-weight:600; color:var(--k-ink); letter-spacing:0.16em;
           padding-bottom:12px; border-bottom:1px solid var(--k-ink);"
  >
    <span>{$t['news.masthead.edition']}</span>
    <span class="hidden sm:inline">{dateline}</span>
    <span>{$t['news.masthead.issueAbbr']} {issue}</span>
  </div>

  <!-- Name -->
  <h1
    class="font-instrument italic text-center"
    style="font-weight:400; font-size:clamp(36px, 9vw, 88px); line-height:0.92;
           letter-spacing:-0.025em; margin:16px 0 6px; color:var(--k-ink);"
  >Schillerkiez Kurier</h1>

  <!-- Tagline -->
  <div
    class="font-bricolage text-center"
    style="font-size:14px; font-weight:500; color:var(--k-ink-soft); letter-spacing:0.02em; margin:0 0 14px;"
  >{$t['news.masthead.tagline']}</div>

  <!-- Bottom ribbon -->
  <div
    class="flex justify-between items-center font-dmmono"
    style="padding-top:12px; border-top:1px solid var(--k-ink); font-size:10.5px;
           color:var(--k-ink-soft); letter-spacing:0.06em;"
  >
    <span><b style="color:var(--k-ink);">{articleCount}</b> {$t['news.masthead.articles']}</span>
    <span>
      <b style="color:var(--k-ink);">{sourceCount}</b> {$t['news.masthead.sources']}
      {#if degraded}<span style="color:var(--k-warn); margin-left:6px;">· {$t['news.masthead.degraded']}</span>{/if}
    </span>
    <KuratiertChip />
  </div>
</section>
