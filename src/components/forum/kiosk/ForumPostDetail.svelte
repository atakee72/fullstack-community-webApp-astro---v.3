<script lang="ts">
  // Forum post detail — Editorial Kiosk read view (per kiosk-forum-compose.jsx).
  //
  // Layout (desktop):
  //   ┌──────────────────────────────────────────────────────┐
  //   │ ← FORUM · DISKUSSION · #firstTag    ↻ live · 47 mitlesend │
  //   ├──────────────────────────────────┬───────────────────┤
  //   │ Type chip + age + tags           │ ◆ DEINE ANTWORT  │
  //   │ Big bold title                   │  composer stub    │
  //   │ Avatar · name · seit · ✓ verified│                   │
  //   │ Body paragraphs                  │ ◆ WER MITREDET   │
  //   │ Engagement strip (filled pills)  │  avatar grid      │
  //   │ ──────────────────────────       │                   │
  //   │ N Antworten · neueste zuerst     │ ◆ ÄHNLICHE       │
  //   │ Comment list                     │  related list     │
  //   │                                  │ trust note quote  │
  //   └──────────────────────────────────┴───────────────────┘
  //
  // The right rail is 280px and holds 4 sections; on mobile it's hidden
  // and a sticky bottom composer shows instead. Phase 5a builds them all
  // as visual stubs; Phase 5b wires people, related topics, real composer
  // + mutations.

  import { t, locale } from '../../../lib/kiosk-i18n';
  import KioskAvatar from './KioskAvatar.svelte';
  import PostTypeChip from './PostTypeChip.svelte';
  import StatusBadge from './StatusBadge.svelte';
  import ForumCommentList from './ForumCommentList.svelte';
  import { optimizeCloudinary } from '../../../utils/cloudinary';

  let { initialTopic, initialComments = [], currentUserId = null } = $props<{
    initialTopic: any;
    initialComments?: any[];
    currentUserId?: string | null;
  }>();

  const topic = $derived(initialTopic);
  const comments = $derived(initialComments);

  // For now everything served by /topics is a discussion. Phase 4b/5b
  // handles announcements/recommendations when those routes ship.
  const kind: 'discussion' | 'recommendation' | 'announcement' = 'discussion';
  const kindLabel = $derived($t['chip.discussion'].toUpperCase());

  // Live datetime tracker for any consumer that needs it. The detail
  // breadcrumb itself uses kind label + first tag, not date/time.
  let now = $state(new Date());
  $effect(() => {
    const id = setInterval(() => (now = new Date()), 60_000);
    return () => clearInterval(id);
  });

  function relTime(iso?: string): string {
    if (!iso) return '';
    const ms = Date.now() - new Date(iso).getTime();
    const min = Math.floor(ms / 60_000);
    if (min < 1) return 'gerade eben';
    if (min < 60) return `vor ${min} min`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `vor ${hr} std`;
    const d = Math.floor(hr / 24);
    if (d < 7) return `vor ${d} t`;
    return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
  }

  const memberSince = $derived.by(() => {
    const created = topic.author?.createdAt;
    if (!created) return '';
    const y = new Date(created).getFullYear();
    return Number.isFinite(y) ? ($locale === 'de' ? `seit ${y}` : `since ${y}`) : '';
  });

  // Body paragraphs — preserve user-authored breaks. Split on double
  // newlines, then render each as its own <p>. First paragraph leads
  // (17px ink), continuations soften (16px ink-soft) — matches the
  // source's "Update: …" pattern without forcing an explicit label.
  const paragraphs = $derived(
    (topic.body ?? topic.description ?? '')
      .split(/\n{2,}/)
      .map((p: string) => p.trim())
      .filter(Boolean)
  );

  // Stub presence count — Phase 5b wires real "X mitlesend" via WebSocket
  // or polling. Until then we approximate with view count / 10 (capped).
  const presenceCount = $derived(
    Math.min(Math.max(Math.floor((topic.views ?? 0) / 10), 1), 200)
  );

  const badgeState = $derived(
    topic.moderationStatus === 'pending' ? 'pending'
    : topic.moderationStatus === 'rejected' ? 'rejected'
    : topic.isUserReported ? 'reported'
    : topic.hasWarningLabel ? 'warning'
    : null
  );

  const likeCount = $derived(topic.likes ?? 0);
  const replyCount = $derived(comments.length);
  const bookmarked = $derived(false); // Phase 5b wires real save state.

  const heroImage = $derived(
    topic.images?.[0]?.url ? optimizeCloudinary(topic.images[0].url) : null
  );
  const firstTag = $derived(topic.tags?.[0] ?? null);

  // Verified-in-kiez badge: only shown if the schema actually carries the
  // flag. Don't fabricate.
  const isVerified = $derived(topic.author?.verified === true);
</script>

<main class="max-w-7xl mx-auto px-4 md:px-8 lg:px-10 py-5 md:py-8">
  <!-- ── Breadcrumb + presence row ─────────────────────────────── -->
  <div
    class="flex items-center justify-between gap-4 mb-5 pb-2.5 border-b border-dashed border-rule font-dmmono text-[10.5px] uppercase tracking-[0.05em] text-ink-mute"
  >
    <a href="/" class="inline-flex items-center gap-2 hover:text-ink transition-colors">
      <span aria-hidden="true">←</span>
      <span>FORUM</span>
      <span aria-hidden="true">·</span>
      <span class="underline decoration-dashed underline-offset-[3px]">{kindLabel}</span>
      {#if firstTag}
        <span aria-hidden="true">·</span>
        <span class="text-ink lowercase normal-case">#{firstTag}</span>
      {/if}
    </a>
    <span class="inline-flex items-center gap-1.5 text-wine">
      <span aria-hidden="true">↻</span>
      <span class="lowercase">{$t['detail.crumb.live']}</span>
      <span aria-hidden="true">·</span>
      <span>{presenceCount} <span class="lowercase">{$t['detail.crumb.reading']}</span></span>
    </span>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-8 lg:gap-10">
    <!-- ── Main column ──────────────────────────────────────────── -->
    <article>
      <!-- Type chip + age + tags + status -->
      <div class="flex items-center flex-wrap gap-2.5 mb-3">
        <PostTypeChip {kind} />
        <span class="font-dmmono text-[10.5px] uppercase tracking-[0.05em] text-ink-mute">
          · {relTime(topic.date)}
        </span>
        {#if topic.tags?.length}
          <span class="font-dmmono text-[10.5px] tracking-[0.04em] text-ink-mute lowercase">
            · {topic.tags.map((tg: string) => `#${tg}`).join(' ')}
          </span>
        {/if}
        {#if badgeState}
          <StatusBadge state={badgeState} size="sm" />
        {/if}
      </div>

      <!-- Title -->
      <h1
        class="font-bricolage font-extrabold text-3xl md:text-4xl tracking-tight leading-[1.05] text-ink mb-3.5 max-w-[760px] text-balance"
      >
        {topic.title}
      </h1>

      <!-- Author byline + optional verified badge -->
      <div class="flex items-center gap-2.5 mb-5">
        <KioskAvatar
          name={topic.author?.name ?? '·'}
          image={topic.author?.image ?? null}
          size="md"
        />
        <div class="flex flex-col leading-tight">
          <span class="font-bricolage font-bold text-[13px] text-ink">
            {topic.author?.name ?? 'anonym'}
          </span>
          {#if memberSince}
            <span class="font-dmmono text-[10px] uppercase tracking-[0.05em] text-ink-mute">
              {memberSince}
            </span>
          {/if}
        </div>
        {#if isVerified}
          <span
            class="ml-3 inline-flex items-center gap-1 font-dmmono text-[10px] uppercase tracking-[0.08em] text-success"
          >
            <span aria-hidden="true">●</span> {$t['detail.verified']}
          </span>
        {/if}
      </div>

      {#if heroImage}
        <div class="mb-5 rounded-md border-[1.5px] border-ink overflow-hidden max-w-prose">
          <img src={heroImage} alt={topic.title} class="w-full h-auto" loading="lazy" />
        </div>
      {/if}

      <!-- Body — first paragraph leads, continuations soften -->
      <div class="space-y-3.5 mb-5 max-w-prose">
        {#each paragraphs as para, i (i)}
          {#if i === 0}
            <p
              class="font-bricolage text-[17px] leading-[1.55] text-ink whitespace-pre-line"
            >{para}</p>
          {:else}
            <p
              class="font-bricolage text-[16px] leading-[1.55] text-ink-soft whitespace-pre-line"
            >{para}</p>
          {/if}
        {/each}
      </div>

      <!-- Engagement strip -->
      <div
        class="flex items-center gap-3 py-2.5 mb-7 border-t border-b border-dashed border-rule font-dmmono text-[11px] text-ink-soft tracking-[0.04em]"
      >
        <button
          type="button"
          class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-paper-warm border-2 border-ink hover:bg-paper transition-colors font-semibold"
          aria-label="Like"
        >
          <span aria-hidden="true">♥</span>
          <span>{likeCount} {$t['detail.engagement.thanks']}</span>
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-transparent border-2 border-ink hover:bg-paper-warm transition-colors font-semibold"
          aria-label="Antworten"
        >
          <span aria-hidden="true">💬</span>
          <span>{replyCount} {$t['detail.engagement.replies']}</span>
        </button>
        <button
          type="button"
          class={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border-2 border-ink transition-colors font-semibold ${
            bookmarked ? 'bg-ochre' : 'bg-transparent hover:bg-paper-warm'
          }`}
          aria-label={$t['detail.engagement.saved']}
        >
          <span aria-hidden="true">🔖</span>
          <span>{$t['detail.engagement.saved']}</span>
        </button>
        <span class="ml-auto flex gap-3.5 text-ink-mute">
          <button
            type="button"
            class="inline-flex items-center gap-1 hover:text-ink transition-colors"
          >
            <span aria-hidden="true">↗</span> {$t['detail.share']}
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1 hover:text-ink transition-colors"
          >
            <span aria-hidden="true">⚑</span> {$t['detail.report']}
          </button>
        </span>
      </div>

      <!-- Comments -->
      <ForumCommentList
        comments={comments}
        topicAuthorId={topic.author?._id ?? null}
        {currentUserId}
        unreadCount={0}
      />
    </article>

    <!-- ── Right rail (4 sections @ 280px) ─────────────────────── -->
    <aside class="hidden lg:block">
      <div
        class="sticky top-24 space-y-5 bg-paper-soft border-l border-dashed border-rule pl-5 -ml-5 py-5"
      >
        <!-- ◆ DEINE ANTWORT (composer stub) -->
        <section>
          <p
            class="font-dmmono text-[10px] uppercase tracking-[0.12em] text-wine mb-2 flex items-center gap-1.5"
          >
            <span aria-hidden="true">◆</span> {$t['detail.compose.heading']}
          </p>
          {#if currentUserId}
            <div
              class="bg-paper border-[1.5px] border-ink rounded-md px-3 py-2.5 min-h-[88px] font-bricolage text-[13px] leading-[1.5] text-ink-mute"
            >
              {$t['detail.compose.placeholder']}
            </div>
            <div
              class="flex items-center justify-between mt-2 font-dmmono text-[10px] text-ink-mute"
            >
              <span>📎 {$t['detail.compose.attach']} · 0/3</span>
              <button
                type="button"
                class="inline-flex items-center gap-1 px-3.5 py-1 rounded-full bg-ink text-paper border-2 border-ink shadow-[2px_2px_0_var(--k-wine)] font-bricolage font-semibold text-[12px] disabled:opacity-50"
                disabled
              >
                {$t['detail.compose.submit']}
              </button>
            </div>
            <p
              class="font-dmmono text-[9.5px] text-ink-mute mt-2 leading-[1.4] tracking-[0.03em]"
            >
              {$t['detail.compose.modNote']}
            </p>
          {:else}
            <p class="font-bricolage text-sm text-ink-mute">
              <a href="/login" class="text-wine hover:underline">{$t['detail.composeLogin']}</a>
            </p>
          {/if}
        </section>

        <!-- ◆ WER MITREDET — for now we draw avatars from the comments
             list as a placeholder; Phase 5b wires real presence. -->
        <section>
          <p
            class="font-dmmono text-[10px] uppercase tracking-[0.12em] text-teal mb-2 flex items-center gap-1.5"
          >
            <span aria-hidden="true">◆</span> {$t['detail.people.heading']} · {comments.length}
          </p>
          {#if comments.length}
            <div class="flex flex-wrap gap-1.5">
              {#each comments.slice(0, 8) as c (c._id)}
                <KioskAvatar
                  name={c.author?.name ?? '·'}
                  image={c.author?.image ?? null}
                  size="sm"
                />
              {/each}
              {#if comments.length > 8}
                <div
                  class="w-7 h-7 rounded-full border-[1.5px] border-dashed border-ink-mute flex items-center justify-center font-dmmono text-[9.5px] text-ink-mute"
                >
                  +{comments.length - 8}
                </div>
              {/if}
            </div>
          {:else}
            <p class="font-dmmono text-[10px] text-ink-mute">—</p>
          {/if}
        </section>

        <!-- ◆ ÄHNLICHE THEMEN (Phase 5b wires real related topics) -->
        <section>
          <p
            class="font-dmmono text-[10px] uppercase tracking-[0.12em] text-moss mb-2 flex items-center gap-1.5"
          >
            <span aria-hidden="true">◆</span> {$t['detail.related.heading']}
          </p>
          <p class="font-dmmono text-[10px] text-ink-mute leading-[1.5]">
            {$locale === 'de'
              ? 'Verwandte Themen folgen in Phase 5b.'
              : 'Related topics ship in Phase 5b.'}
          </p>
        </section>

        <!-- Trust-note serif italic quote (per kiosk-forum-compose.jsx) -->
        <section
          class="bg-paper border border-dashed border-rule rounded-sm px-3 py-2.5 font-instrument italic text-[11.5px] text-ink-soft leading-[1.5]"
        >
          {$t['detail.trust.quote']}
        </section>
      </div>
    </aside>
  </div>
</main>
