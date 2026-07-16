<script lang="ts">
  /**
   * Novel §02 · Rubrik-Rail — up to 3 related posts, ranked by shared tags
   * (relatedFor() in lib/blog/beilage.ts already did the ranking + slicing;
   * this component only renders). Zero-shared items read „ZULETZT ERSCHIENEN"
   * / „MOST RECENT" instead of a tag list.
   * Transcribed from
   * design/handoffs/design_handoff_blog/jsx/kiosk-blog-article.jsx `BlogRelatedRail`.
   */
  import { locale, t } from '../../../lib/kiosk-i18n';
  import { fmtDateKicker, type RelatedItem } from '../../../lib/blog/beilage';

  let { items }: { items: RelatedItem[] } = $props();
</script>

{#if items.length > 0}
  <div style="margin-top: 24px;">
    <div class="flex items-baseline flex-wrap" style="gap: 12px; border-bottom: 1px solid var(--k-ink); padding-bottom: 6px; margin-bottom: 14px;">
      <span class="font-dmmono" style="font-size: 10.5px; letter-spacing: 0.16em; color: var(--k-rust);">{$t['blog.rail.title']}</span>
      <span class="font-dmmono" style="font-size: 9px; color: var(--k-ink-mute);">{$t['blog.rail.note']}</span>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3" style="gap: 18px;">
      {#each items as { post, shared } (post.id)}
        <a
          href={`/blog/${post.id}`}
          class="block"
          style="
            text-decoration: none;
            color: inherit;
            border: 1.5px solid var(--k-ink);
            border-radius: var(--k-radius-md);
            background: var(--k-paper-warm);
            box-shadow: 2px 2px 0 var(--k-ink);
            padding: 14px 16px;
          "
        >
          <div class="font-dmmono" style="font-size: 9px; letter-spacing: 0.1em; color: var(--k-rust);">{fmtDateKicker(post.pubDateISO, $locale)}</div>
          <div class="font-bricolage" style="font-size: 14.5px; font-weight: 700; line-height: 1.2; margin: 5px 0 7px;">{post.title}</div>
          <div class="font-dmmono" style="font-size: 8.5px; color: {shared.length ? 'var(--k-rust-deep)' : 'var(--k-ink-mute)'};">
            {shared.length ? `${$t['blog.rail.common']}: ${shared.map((tag) => '#' + tag).join(' ')}` : $t['blog.rail.recent']}
          </div>
        </a>
      {/each}
    </div>
  </div>
{/if}
