<script lang="ts">
  // Forum post card — Editorial Kiosk three-treatment design.
  //
  // Each post-kind owns a distinct visual identity (per kiosk-forum.jsx):
  //
  //   topic         → paper-warm bg, 1.5px ink border, no strap, no shadow.
  //                   PostTypeChip floats in the top-right corner.
  //   announcement  → INK bg, paper text. Teal strap reads
  //                   "OFFIZIELLE ANKÜNDIGUNG · KIEZRAT" with optional
  //                   "📌 ANGEHEFTET" on the right when pinned. 2px ink
  //                   border, teal print-offset shadow.
  //   recommendation → paper-warm bg with moss strap "✦ EMPFEHLUNG AUS
  //                   DEM KIEZ", 1.5px moss border, moss print shadow,
  //                   body text rendered in Instrument Serif italic for
  //                   editorial warmth.
  //
  // Common skeleton (top → bottom):
  //   1. Strap (announcement + recommendation only).
  //   2. Top row: author byline (avatar + name + optional MAHALLE-TEAM
  //      badge + relative time below) on the left; PostTypeChip (only
  //      when no strap) + optional StatusBadge on the right.
  //   3. Image (when present) — real Cloudinary URL, riso scanline overlay.
  //   4. Title (Bricolage extrabold, balanced wrap).
  //   5. Body excerpt (font-per-kind, ink/paper tone-per-kind).
  //   6. Tags — plain mono `#tagname`, NOT pills.
  //   7. Meta footer — dashed top border, `♥ likes 💬 replies 🔖` on
  //      the left, `→ lesen` on the right.

  import KioskAvatar from './KioskAvatar.svelte';
  import StatusBadge from './StatusBadge.svelte';
  import PostTypeChip from './PostTypeChip.svelte';
  import { t } from '../../../lib/kiosk-i18n';
  import { optimizeCloudinary } from '../../../utils/cloudinary';

  let {
    topic,
    kind = 'discussion',
    featured = false,
    optimistic = false,
    ghosted = false,
    statusBadgeOverride = null,
    team = false,
    pinned = false,
    bookmarked = false
  } = $props<{
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
      moderationStatus?: string;
      isUserReported?: boolean;
      hasWarningLabel?: boolean;
    };
    kind?: 'discussion' | 'recommendation' | 'announcement';
    featured?: boolean;
    optimistic?: boolean;
    ghosted?: boolean;
    statusBadgeOverride?:
      | 'pending' | 'approved' | 'rejected' | 'flagged' | 'reported' | 'warning' | null;
    team?: boolean;
    pinned?: boolean;
    bookmarked?: boolean;
  }>();

  const isAnnouncement = $derived(kind === 'announcement');
  const isRecommendation = $derived(kind === 'recommendation');

  const cardBgClass = $derived(isAnnouncement ? 'bg-ink' : 'bg-paper-warm');
  const cardBorderClass = $derived(
    isAnnouncement ? 'border-2 border-ink'
    : isRecommendation ? 'border-[1.5px] border-moss'
    : 'border-[1.5px] border-ink'
  );
  // Print shadow per kind. Topic gets none (canvas-true: it's the quiet
  // kind, paper-warm card sits flat on paper).
  const cardShadowClass = $derived(
    isAnnouncement
      ? (featured ? 'shadow-[3px_3px_0_var(--k-teal)]' : 'shadow-[2px_2px_0_var(--k-teal)]')
    : isRecommendation
      ? 'shadow-[2px_2px_0_var(--k-moss)]'
    : ''
  );

  const strapBgClass = $derived(
    isAnnouncement ? 'bg-teal' : isRecommendation ? 'bg-moss' : ''
  );
  const strapLabel = $derived(
    isAnnouncement ? $t['pinned.banner.label']
    : isRecommendation ? $t['card.strap.recommendation']
    : ''
  );

  // Tone helpers — announcement card flips ink/paper, recommendation
  // adds serif italic on the body.
  const titleColor = $derived(isAnnouncement ? 'text-paper' : 'text-ink');
  const authorColor = $derived(isAnnouncement ? 'text-paper' : 'text-ink');
  const bodyToneClass = $derived(
    isAnnouncement ? 'text-paper/80'
    : isRecommendation ? 'text-ink-soft italic'
    : 'text-ink-soft'
  );
  const bodyFontClass = $derived(
    isRecommendation ? 'font-instrument' : 'font-bricolage'
  );
  const metaColor = $derived(isAnnouncement ? 'text-paper/55' : 'text-ink-mute');
  const metaBorderColor = $derived(isAnnouncement ? 'border-paper/25' : 'border-rule');
  const tagColor = $derived(isAnnouncement ? 'text-paper/70' : 'text-ink-mute');

  // German short relative-time. EN strings come in Phase 4b/5b once
  // the design source's English variants are locked in.
  function relTime(iso?: string): string {
    if (!iso) return '';
    const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
    if (min < 1) return 'gerade eben';
    if (min < 60) return `vor ${min} min`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `vor ${hr} std`;
    const d = Math.floor(hr / 24);
    if (d < 7) return `vor ${d} t`;
    return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
  }

  const body = $derived((topic.body ?? topic.description ?? '').trim());
  const commentCount = $derived(topic.comments?.length ?? 0);
  const likeCount = $derived(topic.likes ?? 0);
  const tags = $derived(topic.tags ?? []);
  const heroImage = $derived(
    topic.images?.[0]?.url ? optimizeCloudinary(topic.images[0].url) : null
  );

  // StatusBadge: explicit override wins, else infer from moderation flags.
  const inferredBadge = $derived(
    topic.moderationStatus === 'pending' ? 'pending'
    : topic.moderationStatus === 'rejected' ? 'rejected'
    : topic.isUserReported ? 'reported'
    : topic.hasWarningLabel ? 'warning'
    : null
  );
  const badgeState = $derived(statusBadgeOverride ?? inferredBadge);

  const opacityClass = $derived(
    ghosted ? 'opacity-45' : optimistic ? 'opacity-[0.78]' : 'opacity-100'
  );

  const padding = $derived(featured ? 'px-6 py-5' : 'px-5 py-4');
  const titleSize = $derived(
    featured ? 'text-2xl md:text-[28px]' : 'text-[16.5px] md:text-[17px]'
  );
  const bodySize = $derived(featured ? 'text-[14px]' : 'text-[12.5px]');
  const imageHeight = $derived(
    featured ? 'h-[180px] md:h-[220px]' : 'h-[100px] md:h-[140px]'
  );
</script>

<article
  class={`${cardBgClass} ${cardBorderClass} ${cardShadowClass} ${opacityClass} rounded-lg overflow-hidden transition-all duration-[180ms] ease-out hover:-translate-x-px hover:-translate-y-px`}
>
  {#if strapLabel}
    <!-- Editorial strap (announcement + recommendation) -->
    <div
      class={`${strapBgClass} text-paper border-b border-ink flex items-center justify-between gap-3 px-3.5 py-1`}
    >
      <span class="font-dmmono text-[9.5px] uppercase font-semibold tracking-[0.12em]">
        {strapLabel}
      </span>
      {#if pinned && isAnnouncement}
        <span
          class="font-dmmono text-[9.5px] uppercase font-semibold tracking-[0.12em] flex items-center gap-1"
        >
          <span aria-hidden="true">📌</span> {$t['pinned.banner.tag']}
        </span>
      {/if}
    </div>
  {/if}

  <div class={padding}>
    <!-- Top row: author byline (left) · type chip / status badge (right) -->
    <div class="flex items-start justify-between gap-3 mb-2.5">
      <div class="flex items-center gap-2 min-w-0">
        <KioskAvatar
          name={topic.author?.name ?? '·'}
          image={topic.author?.image ?? null}
          size="sm"
        />
        <div class="min-w-0 leading-tight">
          <div class={`flex items-center gap-1.5 text-[12.5px] font-bold ${authorColor}`}>
            <span class="truncate">{topic.author?.name ?? 'anonym'}</span>
            {#if team}
              <span
                class={`shrink-0 font-dmmono text-[8.5px] font-semibold uppercase tracking-[0.08em] px-1.5 py-px rounded-sm border ${
                  isAnnouncement
                    ? 'bg-ochre text-ink border-ochre'
                    : 'bg-ink text-paper border-ink'
                }`}
              >
                {$t['role.team']}
              </span>
            {/if}
          </div>
          <div class={`font-dmmono text-[9.5px] tracking-[0.05em] ${metaColor}`}>
            {relTime(topic.date)}
          </div>
        </div>
      </div>

      <!-- Right cluster: stacks vertically (kind chip on top, status badge
           below) so a 1/3-width slot can carry both without crowding the
           author byline. When only one is present, the column collapses
           to a single item and reads identically to the older single-row
           layout. Order matches the visual hierarchy: kind first, state
           below as a modifier. -->
      <div class="flex flex-col items-end gap-1.5 shrink-0">
        {#if !strapLabel}
          <PostTypeChip {kind} />
        {/if}
        {#if badgeState}
          <StatusBadge state={badgeState} size="sm" />
        {/if}
      </div>
    </div>

    {#if heroImage}
      <div class={`relative mb-3 rounded-md border-[1.5px] border-ink overflow-hidden ${imageHeight}`}>
        <img
          src={heroImage}
          alt={topic.title}
          class="w-full h-full object-cover"
          loading="lazy"
        />
        <!-- riso scanlines on top of the photo, very subtle -->
        <div
          class="pointer-events-none absolute inset-0"
          style="background: repeating-linear-gradient(0deg, transparent 0 4px, rgba(0,0,0,0.04) 4px 5px);"
          aria-hidden="true"
        ></div>
      </div>
    {/if}

    <h3
      class={`font-bricolage font-extrabold tracking-tight leading-[1.18] mb-2 text-balance ${titleColor} ${titleSize}`}
    >
      {topic.title}
    </h3>

    {#if body}
      <p class={`${bodyFontClass} ${bodyToneClass} leading-[1.5] mb-3.5 ${bodySize}`}>
        {body}
      </p>
    {/if}

    {#if tags.length}
      <div class={`flex gap-2 flex-wrap font-dmmono text-[10px] mb-2.5 ${tagColor}`}>
        {#each tags as tg (tg)}
          <span>#{tg}</span>
        {/each}
      </div>
    {/if}

    <div
      class={`flex items-center justify-between font-dmmono text-[11px] pt-2.5 border-t border-dashed ${metaBorderColor} ${metaColor}`}
    >
      <span class="flex items-center gap-3">
        <span class="flex items-center gap-1" aria-label="Likes">
          <span aria-hidden="true">♥</span> {likeCount}
        </span>
        <span class="flex items-center gap-1" aria-label="Antworten">
          <span aria-hidden="true">💬</span> {commentCount}
        </span>
        <span
          class={`flex items-center gap-1 ${bookmarked ? 'text-ochre' : ''}`}
          aria-label="Gespeichert"
        >
          <span aria-hidden="true">🔖</span>{bookmarked ? ` ${$t['card.saved']}` : ''}
        </span>
      </span>
      <span class="flex items-center gap-1">→ {$t['card.cta.read']}</span>
    </div>
  </div>
</article>
