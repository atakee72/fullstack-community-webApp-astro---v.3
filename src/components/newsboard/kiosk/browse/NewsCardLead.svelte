<script lang="ts">
  import { t, locale } from '../../../../lib/kiosk-i18n';
  import { type NewsVM } from '../../../../lib/newsboard/newsTaxonomy';
  import KioskBtn from '../../../forum/kiosk/KioskBtn.svelte';
  import SektionTag from '../primitives/SektionTag.svelte';
  import HeatChip from '../primitives/HeatChip.svelte';
  import SaveToggle from '../primitives/SaveToggle.svelte';
  import ArticleImage from '../primitives/ArticleImage.svelte';
  import ArticleMeta from '../primitives/ArticleMeta.svelte';

  let {
    article,
    onSave = (_id: string) => {},
    canSave = false,
  }: { article: NewsVM; onSave?: (id: string) => void; canSave?: boolean } = $props();

  const title = $derived($locale === 'de' ? article.title : (article.titleEN || article.title));
</script>

<article
  class="news-card grid relative"
  style="background:var(--k-paper-warm); border:var(--k-border-ink); border-radius:var(--k-radius-lg);
         padding:28px; box-shadow:var(--k-shadow-md); grid-template-columns:1.1fr 1fr; gap:28px;"
>
  <div>
    <div class="flex items-center flex-wrap" style="gap:8px; margin-bottom:14px;">
      <SektionTag id={article.sektion} />
      <HeatChip count={article.forumLinks} />
    </div>

    <a href={`/newsboard/${article.id}`} class="block no-underline">
      <h2
        class="font-bricolage"
        style="font-weight:800; font-size:42px; line-height:1.02; letter-spacing:-0.035em;
               margin:0 0 12px; color:var(--k-ink);"
      >{title}</h2>
    </a>

    <p
      class="font-instrument italic"
      style="font-size:19px; line-height:1.4; color:var(--k-ink-soft); margin:0 0 18px; max-width:62ch;"
    >{article.dek}</p>

    <div
      class="font-bricolage"
      style="font-size:14px; line-height:1.55; color:var(--k-ink); max-width:62ch;"
    >{article.summary}</div>

    <div
      class="flex items-center"
      style="gap:14px; margin-top:22px; padding-top:14px; border-top:1px dashed var(--k-rule);"
    >
      <ArticleMeta quelle={article.quelle} publishedAt={article.publishedAt} submitterName={article.submitterName} />
      <div class="flex-1"></div>
      <KioskBtn size="sm" href={`/newsboard/${article.id}`}>{$t['news.readmore']}</KioskBtn>
      {#if canSave}<SaveToggle saved={article.saved} onToggle={() => onSave(article.id)} />{/if}
    </div>
  </div>

  <div>
    <ArticleImage imageUrl={article.imageUrl} quelle={article.quelle} sektion={article.sektion} ratio="4/5" lead alt={title} />
  </div>
</article>
