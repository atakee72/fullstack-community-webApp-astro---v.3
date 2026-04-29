<script lang="ts">
  // Forum card — Editorial Kiosk regular post.
  //
  // Structure (top to bottom):
  //   1. Type-colored ribbon (wine/moss/teal) — carries the type label
  //   2. Card body on paper-soft — title + excerpt
  //   3. Footer (paper bg, top-bordered) — avatar + author + member-since + counts
  //
  // Avatar deliberately sits at the bottom (canvas treatment): the editorial
  // emphasis is title-first, then the author footer reads like a byline.

  import KioskAvatar from './KioskAvatar.svelte';
  import StatusBadge from './StatusBadge.svelte';
  import { t } from '../../../lib/kiosk-i18n';

  let { topic, kind = 'discussion' } = $props<{
    topic: {
      _id: string;
      title: string;
      body?: string;
      description?: string;
      author?: { name?: string; image?: string | null; createdAt?: string } | null;
      tags?: string[];
      images?: { url: string }[];
      comments?: any[];
      date?: string;
      likes?: number;
      views?: number;
      moderationStatus?: string;
      isUserReported?: boolean;
      hasWarningLabel?: boolean;
    };
    kind?: 'discussion' | 'recommendation' | 'announcement';
  }>();

  // Ribbon color — semantic to post type.
  const ribbonClass = $derived({
    discussion:     'bg-wine text-paper',
    recommendation: 'bg-moss text-paper',
    announcement:   'bg-teal text-paper'
  }[kind]);

  // Localized label that sits in the ribbon (left side).
  const ribbonLabel = $derived({
    discussion:     $t['chip.discussion'],
    recommendation: $t['chip.recommendation'],
    announcement:   $t['chip.announcement']
  }[kind]);

  function relTime(iso?: string): string {
    if (!iso) return '';
    const t = new Date(iso).getTime();
    const min = Math.floor((Date.now() - t) / 60_000);
    if (min < 1) return 'gerade eben';
    if (min < 60) return `vor ${min} min`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `vor ${hr} std`;
    const d = Math.floor(hr / 24);
    if (d < 7) return `vor ${d} t`;
    return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
  }

  // "MEMBER SEIT 2019" — pulled from author.createdAt year.
  const memberSince = $derived.by(() => {
    const created = topic.author?.createdAt;
    if (!created) return '';
    const y = new Date(created).getFullYear();
    return Number.isFinite(y) ? `seit ${y}` : '';
  });

  const excerpt = $derived(
    (topic.body ?? topic.description ?? '').replace(/\s+/g, ' ').trim().slice(0, 180)
  );

  const badgeState = $derived(
    topic.moderationStatus === 'pending' ? 'pending'
    : topic.moderationStatus === 'rejected' ? 'rejected'
    : topic.isUserReported ? 'reported'
    : topic.hasWarningLabel ? 'warning'
    : null
  );

  const commentCount = $derived(topic.comments?.length ?? 0);
  const likeCount = $derived(topic.likes ?? 0);
  const viewCount = $derived(topic.views ?? 0);
</script>

<article
  class="bg-paper-soft border-2 border-ink rounded-lg overflow-hidden flex flex-col
         shadow-[3px_3px_0_var(--k-ink)] hover:shadow-[5px_5px_0_var(--k-ink)] hover:-translate-x-px hover:-translate-y-px
         transition-all duration-[180ms] ease-out"
>
  <!-- Type ribbon -->
  <div class={`flex items-center justify-between gap-3 px-4 py-1.5 ${ribbonClass}`}>
    <span class="font-jetbrains text-[10px] uppercase tracking-[0.18em] font-medium">
      {ribbonLabel}
    </span>
    {#if badgeState}
      <StatusBadge state={badgeState} size="sm" />
    {:else}
      <span class="font-jetbrains text-[10px] uppercase tracking-[0.18em] opacity-80">
        {relTime(topic.date)}
      </span>
    {/if}
  </div>

  <!-- Title + excerpt -->
  <div class="px-5 pt-4 pb-3 flex-1">
    <h3 class="font-bricolage font-bold text-lg leading-snug text-ink mb-2 line-clamp-2">
      {topic.title}
    </h3>
    {#if excerpt}
      <p class="font-inter text-sm text-ink-soft leading-relaxed line-clamp-3">
        {excerpt}{excerpt.length >= 180 ? '…' : ''}
      </p>
    {/if}
  </div>

  <!-- Footer: author byline + counts -->
  <footer class="flex items-center justify-between gap-3 px-5 pb-4 pt-3 border-t border-rule">
    <div class="flex items-center gap-2.5 min-w-0">
      <KioskAvatar name={topic.author?.name ?? '·'} image={topic.author?.image ?? null} size="sm" />
      <div class="flex flex-col leading-tight min-w-0">
        <span class="font-bricolage font-bold text-sm text-ink truncate">
          {topic.author?.name ?? 'anonym'}
        </span>
        {#if memberSince}
          <span class="font-jetbrains text-[10px] uppercase tracking-[0.08em] text-ink-mute">
            {memberSince}
          </span>
        {/if}
      </div>
    </div>
    <div class="flex items-center gap-3 font-jetbrains text-[11px] text-ink-mute shrink-0">
      <span class="flex items-center gap-1" aria-label="Antworten">
        <span aria-hidden="true">↳</span>
        <span>{commentCount}</span>
      </span>
      <span class="flex items-center gap-1" aria-label="Likes">
        <span aria-hidden="true">♥</span>
        <span>{likeCount}</span>
      </span>
      <span class="flex items-center gap-1" aria-label="Aufrufe">
        <span aria-hidden="true">◐</span>
        <span>{viewCount}</span>
      </span>
    </div>
  </footer>
</article>
