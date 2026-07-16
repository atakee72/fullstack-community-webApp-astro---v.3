<script lang="ts">
  /**
   * Novel §04 (Forum-CTA) + §05 (Druckbogen trigger) — article footer.
   * Row 1: rubric chips (reused BlRubrikChip atom, each linking to its tag
   * page) + teilen (Web Share API with clipboard fallback) + Druckbogen
   * (window.print(), the actual print CSS lands in Task 6).
   * Row 2: the Forum-CTA card — the ONLY wine on the entire page. Nothing
   * auto-posts: the CTA link only pre-fills /topics/create via query params.
   * Transcribed from
   * design/handoffs/design_handoff_blog/jsx/kiosk-blog-article.jsx `BlogArticleFooter`.
   */
  import { t } from '../../../lib/kiosk-i18n';
  import { showToast } from '../../../utils/toast';
  import BlRubrikChip from './BlRubrikChip.svelte';
  import type { BeilagePost } from '../../../lib/blog/beilage';

  let { post }: { post: BeilagePost } = $props();

  async function share() {
    const url = window.location.origin + window.location.pathname;
    if (navigator.share) {
      try {
        await navigator.share({ title: post.title, url });
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(url);
      showToast($t['blog.foot.share.copied'], { type: 'success' });
    }
  }

  const discussHref = $derived(
    `/topics/create?prefill_title=${encodeURIComponent($t['blog.foot.discuss.prefix'] + post.title)}` +
    `&prefill_body=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin + window.location.pathname : `/blog/${post.id}`)}`
  );
</script>

<div style="margin-top: 28px; border-top: 2px solid var(--k-ink); padding-top: 16px;">
  <div class="flex items-center flex-wrap" style="gap: 8px;">
    <span class="font-dmmono" style="font-size: 10px; letter-spacing: 0.14em; color: var(--k-ink-mute);">{$t['blog.rubrics']}</span>
    {#each post.tags as tag (tag)}
      <BlRubrikChip {tag} small href={`/blog/tag/${tag}`} />
    {/each}
    <div class="flex-1"></div>
    <button
      type="button"
      onclick={share}
      class="font-dmmono"
      style="font-size: 11px; padding: 7px 14px; border: 1.5px solid var(--k-ink); border-radius: var(--k-radius-pill); min-height: 44px; background: none; cursor: pointer;"
    >{$t['blog.foot.share']}</button>
    <button
      type="button"
      title={$t['blog.foot.print.note']}
      onclick={() => window.print()}
      class="font-dmmono"
      style="font-size: 11px; padding: 7px 14px; border: 1.5px solid var(--k-ink); border-radius: var(--k-radius-pill); min-height: 44px; background: none; cursor: pointer;"
    >{$t['blog.foot.print']}</button>
  </div>

  <!-- NOVEL §04 · Forum-CTA — the ONLY wine on this page -->
  <div
    class="flex items-center flex-wrap"
    style="
      margin-top: 16px;
      border: 2px solid var(--k-ink);
      border-radius: var(--k-radius-lg);
      background: var(--k-paper-warm);
      box-shadow: 3px 3px 0 var(--k-ink);
      padding: 16px 20px;
      gap: 18px;
    "
  >
    <div style="flex: 1; min-width: 200px;">
      <div style="font-size: 16.5px; font-weight: 800; letter-spacing: -0.015em;">
        {$t['blog.foot.discuss.pre']}<i class="font-instrument italic font-normal" style="color: var(--k-wine);">{$t['blog.foot.discuss.it']}</i>{$t['blog.foot.discuss.post']}
      </div>
      <div class="font-dmmono" style="font-size: 9.5px; line-height: 1.5; color: var(--k-ink-mute); margin-top: 4px;">{$t['blog.foot.discuss.note']}</div>
    </div>
    <a
      href={discussHref}
      class="font-bricolage inline-flex items-center"
      style="
        min-height: 44px;
        padding: 10px 20px;
        background: var(--k-wine);
        color: var(--k-paper);
        border: 1.5px solid var(--k-ink);
        border-radius: var(--k-radius-pill);
        font-size: 14px;
        font-weight: 700;
        box-shadow: 2px 2px 0 var(--k-ink);
        white-space: nowrap;
        text-decoration: none;
      "
    >{$t['blog.foot.discuss']} →</a>
  </div>
</div>
