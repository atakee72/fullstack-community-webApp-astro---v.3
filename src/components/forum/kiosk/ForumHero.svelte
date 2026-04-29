<script lang="ts">
  // Hero "above the fold" featured topic — one card, full width on the
  // forum grid. Warm gradient bg, light text, larger title than a regular
  // ForumPostCard, footer counts in a tight mono row.
  //
  // Fed by whatever the index page picks as "featured" (pinned topic, or
  // the highest-engagement recent topic). The selection lives in the
  // parent — this component just renders.

  import KioskAvatar from './KioskAvatar.svelte';
  import PostTypeChip from './PostTypeChip.svelte';

  import { t } from '../../../lib/kiosk-i18n';

  let { topic, kind = 'discussion', roleBadge = null } = $props<{
    topic: {
      _id: string;
      title: string;
      body?: string;
      description?: string;
      author?: { name?: string; image?: string | null } | null;
      tags?: string[];
      comments?: any[];
      likes?: number;
      views?: number;
      date?: string;
    };
    kind?: 'discussion' | 'recommendation' | 'announcement';
    roleBadge?: 'team' | null; // hardcoded "MAHALLE-TEAM" pill in 4a
  }>();

  function relTime(iso?: string): string {
    if (!iso) return '';
    const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
    if (min < 1) return 'gerade eben';
    if (min < 60) return `vor ${min} min`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `vor ${hr} std`;
    return `vor ${Math.floor(hr / 24)} t`;
  }

  const excerpt = $derived(
    (topic.body ?? topic.description ?? '').replace(/\s+/g, ' ').trim().slice(0, 220)
  );

  const commentCount = $derived(topic.comments?.length ?? 0);
  const likeCount = $derived(topic.likes ?? 0);
  const viewCount = $derived(topic.views ?? 0);
</script>

<article
  class="relative rounded-xl overflow-hidden border-2 border-ink shadow-[6px_6px_0_var(--k-ink)] hover:shadow-[8px_8px_0_var(--k-ink)] hover:-translate-x-px hover:-translate-y-px transition-all duration-[200ms] ease-out"
  style="background: linear-gradient(135deg, var(--k-ochre) 0%, #d96b3f 55%, var(--k-wine) 100%);"
>
  <!-- Top row: type chip (left) + presence badge (right) -->
  <div class="flex items-center justify-between px-6 pt-5 md:px-8 md:pt-6">
    <PostTypeChip {kind} selected />
    <span class="inline-flex items-center gap-1.5 font-jetbrains text-[10px] uppercase tracking-[0.12em] text-paper bg-ink/40 backdrop-blur-sm border border-paper/20 rounded-full px-2.5 py-0.5">
      <span class="inline-block w-1.5 h-1.5 rounded-full bg-moss" aria-hidden="true"></span>
      online · {relTime(topic.date)}
    </span>
  </div>

  <!-- Title + excerpt -->
  <div class="px-6 pt-6 pb-4 md:px-8 md:pt-10 md:pb-6 max-w-3xl">
    <h2 class="font-bricolage font-extrabold text-paper text-2xl md:text-4xl leading-tight tracking-tight mb-3 md:mb-4">
      {topic.title}
    </h2>
    {#if excerpt}
      <p class="font-inter text-sm md:text-base text-paper/85 leading-relaxed line-clamp-3">
        {excerpt}{excerpt.length >= 220 ? '…' : ''}
      </p>
    {/if}
  </div>

  <!-- Bottom row: author + counts -->
  <footer class="flex items-center justify-between gap-4 px-6 pb-5 md:px-8 md:pb-6 pt-2">
    <div class="flex items-center gap-2.5 min-w-0">
      <KioskAvatar name={topic.author?.name ?? '·'} image={topic.author?.image ?? null} size="md" />
      <div class="flex flex-col leading-tight min-w-0">
        <span class="flex items-center gap-2 min-w-0">
          <span class="font-bricolage font-bold text-sm md:text-base text-paper truncate">
            {topic.author?.name ?? 'anonym'}
          </span>
          {#if roleBadge === 'team'}
            <span class="inline-flex items-center px-2 py-0.5 rounded-md font-jetbrains text-[9px] uppercase tracking-[0.12em] bg-ochre text-ink shrink-0">
              {$t['role.team']}
            </span>
          {/if}
        </span>
        {#if topic.tags?.length}
          <span class="font-jetbrains text-[10px] uppercase tracking-[0.08em] text-paper/70 truncate">
            #{topic.tags.slice(0, 2).join(' · #')}
          </span>
        {/if}
      </div>
    </div>
    <div class="flex items-center gap-3 font-jetbrains text-[11px] text-paper/85 shrink-0">
      <span class="flex items-center gap-1" aria-label="Antworten"><span aria-hidden="true">↳</span><span>{commentCount}</span></span>
      <span class="flex items-center gap-1" aria-label="Likes"><span aria-hidden="true">♥</span><span>{likeCount}</span></span>
      <span class="flex items-center gap-1" aria-label="Aufrufe"><span aria-hidden="true">◐</span><span>{viewCount}</span></span>
    </div>
  </footer>
</article>
