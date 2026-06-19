<script lang="ts">
  import { locale } from '../../../../lib/kiosk-i18n';
  import { formatRelativeTime } from '../../../../lib/newsboard/newsFormat';
  import { type QuelleKey } from '../../../../lib/newsboard/newsTaxonomy';
  import SourceChip from './SourceChip.svelte';

  let {
    quelle,
    publishedAt,
    submitterName = '',
  }: { quelle: QuelleKey; publishedAt?: string | Date; submitterName?: string } = $props();

  const rel = $derived(formatRelativeTime(publishedAt, $locale));
</script>

<div
  class="flex items-center flex-wrap font-dmmono"
  style="gap:10px; font-size:10px; color:var(--k-ink-mute); letter-spacing:0.06em;"
>
  <SourceChip id={quelle} mini />
  <span>·</span>
  <span>{rel}</span>
  {#if submitterName}
    <span>·</span>
    <span class="inline-flex items-center" style="gap:4px;">
      <span
        class="inline-flex items-center justify-center"
        style="width:14px; height:14px; border-radius:50%; background:var(--k-moss);
               color:var(--k-paper); font-size:8px; font-weight:700; border:1px solid var(--k-ink);"
      >{submitterName.slice(0, 2).toUpperCase()}</span>
      {submitterName}
    </span>
  {/if}
</div>
