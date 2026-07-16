<script lang="ts">
  /**
   * Article header — implements all 3 postLayout variants (standard / hero /
   * gallery). Task 4 only wires the hero/gallery LAYOUT files around this
   * component (full-bleed backgrounds, gallery grid below) — the header
   * anatomy itself is complete here.
   *
   * `standard` and `gallery` share the strap → title → standfirst → meta
   * skeleton (gallery drops the framed cover + photo credit, which belong
   * to the numbered image grid Task 4 builds). `hero` is a full-bleed cover
   * with an overlapping ink title band — `.bl-hero-band` is a deliberate
   * hook for Task 6's print CSS, keep the class name exact.
   *
   * Transcribed from
   * design/handoffs/design_handoff_blog/jsx/kiosk-blog-article.jsx
   * `BaStrap` + `BlogArticleStandard` (standard/gallery) + `BlogArticleHero`.
   */
  import { t } from '../../../lib/kiosk-i18n';
  import BlPostMeta from './BlPostMeta.svelte';
  import type { BeilagePost } from '../../../lib/blog/beilage';

  let {
    post,
    rank,
    variant,
  }: {
    post: BeilagePost;
    rank: { no: number; of: number };
    variant: 'standard' | 'hero' | 'gallery';
  } = $props();
</script>

{#if variant === 'hero'}
  <div class="relative">
    <img
      src={post.cover}
      alt={post.coverAlt ?? ''}
      class="w-full object-cover h-[260px] lg:h-[420px]"
      style="border-bottom: 2px solid var(--k-ink);"
    />
    <div class="absolute left-0 right-0 flex justify-center" style="bottom: -74px;">
      <div
        class="bl-hero-band text-center"
        style="
          background: var(--k-ink);
          color: var(--k-paper);
          border: 2px solid var(--k-ink);
          border-radius: var(--k-radius-lg);
          box-shadow: 3px 3px 0 var(--k-rust);
          padding: 20px 34px;
          max-width: 760px;
        "
      >
        <div class="font-dmmono" style="font-size: 9.5px; letter-spacing: 0.2em; color: var(--k-rust-on-ink);">
          {$t['blog.strap.hero']} · {$t['blog.strap.rubrik']} {post.tags[0]?.toUpperCase()} · № {rank.no} / {rank.of}
        </div>
        <h1 class="font-bricolage text-[26px] lg:text-[38px]" style="font-weight: 800; letter-spacing: -0.025em; line-height: 1.02; margin: 8px 0 0;">{post.title}</h1>
      </div>
    </div>
  </div>
  <div class="text-center" style="padding-top: 98px;">
    <div class="font-instrument italic" style="font-size: 19px; line-height: 1.45; color: var(--k-ink-soft); max-width: 780px; margin: 0 auto;">{post.description}</div>
    <div class="flex justify-center" style="margin-top: 10px;"><BlPostMeta {post} /></div>
    <div style="width: 56px; height: 3px; background: var(--k-rust); margin: 16px auto 0;"></div>
  </div>
{:else}
  <div class="max-w-[940px] mx-auto">
    <span
      class="font-dmmono inline-block"
      style="font-size: 10px; letter-spacing: 0.16em; color: var(--k-rust); border-left: 3px solid var(--k-rust); padding-left: 10px;"
    >{$t['blog.strap.rubrik']} · {post.tags[0]?.toUpperCase()} · <span style="color: var(--k-ink-mute);">№ {rank.no} / {rank.of}</span></span>

    <h1
      class="font-bricolage text-[27px] {variant === 'gallery' ? 'lg:text-[44px]' : 'lg:text-[46px]'}"
      style="font-weight: 800; letter-spacing: -0.03em; line-height: 1; margin: 14px 0 12px;"
    >{post.title}</h1>

    <div
      class="font-instrument italic"
      style="font-size: {variant === 'gallery' ? '19px' : '20px'}; line-height: 1.45; color: var(--k-ink-soft); max-width: 780px; margin-bottom: 12px;"
    >{post.description}</div>

    <BlPostMeta {post} />

    {#if variant === 'standard'}
      <div style="margin: 18px 0 6px; border: 1.5px solid var(--k-ink); border-radius: var(--k-radius-lg); overflow: hidden; box-shadow: 2px 2px 0 var(--k-ink);">
        <img src={post.cover} alt={post.coverAlt ?? ''} class="w-full object-cover h-[170px] lg:h-[330px]" />
      </div>
      <div class="font-dmmono" style="font-size: 9.5px; color: var(--k-ink-mute); margin-bottom: 20px;">
        {$t['blog.photo.credit']}{post.coverAlt ? ' · ' + post.coverAlt.toUpperCase() : ''}
      </div>
    {/if}
  </div>
{/if}
