<script lang="ts">
  import { onMount } from 'svelte';
  import { t, locale } from '../../../../lib/kiosk-i18n';
  import { resolveSektion, resolveQuelle, type SektionKey, type QuelleKey } from '../../../../lib/newsboard/newsTaxonomy';
  import SourceChip from '../primitives/SourceChip.svelte';
  import { formatRelativeTime } from '../../../../lib/newsboard/newsFormat';

  let {
    sektion,
    currentId,
  }: { sektion: SektionKey; currentId: string } = $props();

  type Rel = { id: string; title: string; quelle: QuelleKey; publishedAt: string };
  let related = $state<Rel[]>([]);

  onMount(async () => {
    try {
      const res = await fetch('/api/news?limit=30&sortBy=approvedAt&sortOrder=desc');
      if (!res.ok) return;
      const data = await res.json();
      related = (data.news ?? [])
        .filter((it: any) => String(it._id) !== currentId && resolveSektion(it.aiCategory) === sektion)
        .slice(0, 3)
        .map((it: any) => ({
          id: String(it._id),
          title: it.title,
          quelle: resolveQuelle(it.sourceName, it.source),
          publishedAt: it.publishedAt ?? it.fetchedAt ?? new Date().toISOString(),
        }));
    } catch { /* leave empty */ }
  });

  const heading = $derived(
    `${$t['news.related.heading']} · ${$t[`news.sektion.${sektion}` as keyof typeof $t]}`
  );
</script>

<div style="padding:14px; border:1px dashed var(--k-rule); border-radius:var(--k-radius-md);">
  <div class="font-dmmono uppercase" style="font-size:10px; color:var(--k-ink-mute); letter-spacing:0.14em; margin-bottom:10px;">
    {heading}
  </div>
  {#if related.length === 0}
    <div class="font-instrument italic" style="font-size:13px; color:var(--k-ink-mute);">{$t['news.related.empty']}</div>
  {:else}
    <div class="flex flex-col" style="gap:12px;">
      {#each related as r (r.id)}
        <a href={`/newsboard/${r.id}`} class="block no-underline" style="padding-bottom:10px; border-bottom:1px dashed var(--k-rule);">
          <div class="flex items-center" style="gap:5px; margin-bottom:4px;">
            <SourceChip id={r.quelle} mini />
            <span class="font-dmmono" style="font-size:9px; color:var(--k-ink-mute);">{formatRelativeTime(r.publishedAt, $locale)}</span>
          </div>
          <div class="font-bricolage" style="font-size:13.5px; font-weight:700; line-height:1.2; color:var(--k-ink);">{r.title}</div>
        </a>
      {/each}
    </div>
  {/if}
</div>
