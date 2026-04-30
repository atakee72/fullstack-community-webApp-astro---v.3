<script lang="ts">
  // Forum post detail — Editorial Kiosk read view with Phase 5b inline
  // edit + delete + comment composer wiring.
  //
  // Why no @tanstack QueryClient here: the topics cache lives on `/`
  // (ForumIndex's own provider). When we delete from this page we
  // navigate back, and the home page does an SSR fetch — no client
  // cache to keep in sync. Edit + delete use plain fetch; the comment
  // composer prepends to a local `comments` state.
  //
  // Edit mode is gated on the viewer being the topic author. ESC and
  // the cancel button both use the global confirmAction() to confirm
  // discarding unsaved changes — same pattern as the React legacy
  // forum, no new dialog.

  import { t, locale } from '../../../lib/kiosk-i18n';
  import KioskAvatar from './KioskAvatar.svelte';
  import KioskBtn from './KioskBtn.svelte';
  import PostTypeChip from './PostTypeChip.svelte';
  import StatusBadge from './StatusBadge.svelte';
  import ForumCommentList from './ForumCommentList.svelte';
  import EditModeBanner from './compose/EditModeBanner.svelte';
  import DeleteConfirmCard from './compose/DeleteConfirmCard.svelte';
  import CommentComposer from './compose/CommentComposer.svelte';
  import { confirmAction } from '../../../utils/toast';
  import { optimizeCloudinary } from '../../../utils/cloudinary';

  let { initialTopic, initialComments = [], currentUserId = null } = $props<{
    initialTopic: any;
    initialComments?: any[];
    currentUserId?: string | null;
  }>();

  let topic = $state(initialTopic);
  let comments = $state<any[]>(initialComments);

  function authorIdOf(v: any): string | null {
    if (!v) return null;
    if (typeof v === 'string') return v;
    if (typeof v === 'object' && v._id) return String(v._id);
    return null;
  }

  const isAuthor = $derived(
    !!currentUserId && authorIdOf(topic.author) === currentUserId
  );

  const kind: 'discussion' | 'recommendation' | 'announcement' = 'discussion';
  const kindLabel = $derived($t['chip.discussion'].toUpperCase());

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

  const paragraphs = $derived(
    (topic.body ?? topic.description ?? '')
      .split(/\n{2,}/)
      .map((p: string) => p.trim())
      .filter(Boolean)
  );

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
  const bookmarked = $derived(false);

  const heroImage = $derived(
    topic.images?.[0]?.url ? optimizeCloudinary(topic.images[0].url) : null
  );
  const firstTag = $derived(topic.tags?.[0] ?? null);
  const isVerified = $derived(topic.author?.verified === true);
  const editHistoryCount = $derived(topic.editHistory?.length ?? 0);

  // ─── Edit mode ──────────────────────────────────────────────────────
  let editing = $state(false);
  let deleteOpen = $state(false);
  let editTitle = $state('');
  let editBody = $state('');
  let saving = $state(false);
  let deleting = $state(false);
  let editError = $state<string | null>(null);

  const isDirty = $derived(
    editing && (editTitle !== topic.title || editBody !== (topic.body ?? topic.description ?? ''))
  );

  function enterEdit() {
    editTitle = topic.title;
    editBody = topic.body ?? topic.description ?? '';
    editError = null;
    editing = true;
  }

  async function cancelEdit(skipConfirm = false) {
    if (!skipConfirm && isDirty) {
      const ok = await confirmAction($t['edit.confirm.discard'], {
        confirmLabel: $t['edit.cta.cancel'],
        variant: 'warning'
      });
      if (!ok) return;
    }
    editing = false;
    deleteOpen = false;
    editError = null;
  }

  async function saveEdit() {
    if (saving) return;
    if (editTitle.trim().length < 5 || editBody.trim().length < 10) {
      editError = 'Titel mind. 5, Text mind. 10 Zeichen.';
      return;
    }
    saving = true;
    editError = null;
    try {
      const res = await fetch(`/api/topics/edit/${topic._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: editTitle.trim(),
          body: editBody.trim(),
          tags: topic.tags ?? [],
          images: topic.images ?? []
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || 'Speichern fehlgeschlagen.');
      }
      const json = await res.json();
      topic = { ...topic, ...json.topic };
      editing = false;
    } catch (err) {
      editError = err instanceof Error ? err.message : 'Speichern fehlgeschlagen.';
    } finally {
      saving = false;
    }
  }

  async function confirmDelete() {
    if (deleting) return;
    deleting = true;
    try {
      const res = await fetch(`/api/topics/delete/${topic._id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Löschen fehlgeschlagen.');
      }
      if (typeof window !== 'undefined') window.location.href = '/';
    } catch (err) {
      editError = err instanceof Error ? err.message : 'Löschen fehlgeschlagen.';
      deleting = false;
    }
  }

  // ESC cancels edit mode (with dirty-check confirm).
  $effect(() => {
    if (!editing) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelEdit();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  // ─── Comment composer ───────────────────────────────────────────────
  let postingComment = $state(false);
  async function submitComment(body: string) {
    if (postingComment) return;
    postingComment = true;
    try {
      const res = await fetch('/api/comments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ body, topicId: topic._id, collectionType: 'topics' })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Kommentar fehlgeschlagen.');
      }
      const json = await res.json();
      // Optimistically prepend (matches API sort order — newest first).
      comments = [json.comment, ...comments];
    } catch (err) {
      // Surface as page-level alert. Comment errors are rare; a toast
      // would normally be ideal — kept minimal in 5b.
      if (typeof window !== 'undefined') alert((err as Error).message);
    } finally {
      postingComment = false;
    }
  }
</script>

<main class="max-w-7xl mx-auto px-4 md:px-8 lg:px-10 py-5 md:py-8">
  {#if editing}
    <EditModeBanner />
  {/if}

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
      <!-- Type chip + age + tags + status + edit button -->
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
        {#if isAuthor && !editing}
          <button
            type="button"
            onclick={enterEdit}
            class="ml-auto font-dmmono text-[10.5px] uppercase tracking-[0.08em] text-ink-mute hover:text-ink underline-offset-2 hover:underline"
          >
            ✎ Bearbeiten
          </button>
        {/if}
      </div>

      <!-- Title (read or editable) -->
      {#if editing}
        <input
          type="text"
          bind:value={editTitle}
          maxlength="80"
          class="w-full bg-paper-warm border-[1.5px] border-ink rounded-md px-4 py-2.5 mb-3 font-bricolage font-extrabold text-2xl md:text-3xl tracking-tight leading-[1.1] text-ink outline-none focus:border-wine"
        />
      {:else}
        <h1
          class="font-bricolage font-extrabold text-3xl md:text-4xl tracking-tight leading-[1.05] text-ink mb-3.5 max-w-[760px] text-balance"
        >
          {topic.title}
        </h1>
      {/if}

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

      {#if heroImage && !editing}
        <div class="mb-5 rounded-md border-[1.5px] border-ink overflow-hidden max-w-prose">
          <img src={heroImage} alt={topic.title} class="w-full h-auto" loading="lazy" />
        </div>
      {/if}

      <!-- Body (read or editable) -->
      {#if editing}
        <textarea
          bind:value={editBody}
          maxlength="2000"
          rows="10"
          class="w-full bg-paper-soft border-[1.5px] border-ink rounded-md px-4 py-3.5 mb-5 font-bricolage text-[16px] leading-[1.55] text-ink outline-none focus:border-wine resize-y min-h-[180px]"
        ></textarea>
        {#if editHistoryCount > 0}
          <div class="mb-4">
            <p class="font-dmmono text-[10px] uppercase tracking-[0.1em] text-ink-mute mb-1.5">
              {$t['edit.versions.label']}
            </p>
            <p
              class="font-dmmono text-[11px] text-ink-soft px-3 py-1.5 bg-paper-warm border border-rule rounded-sm inline-block"
            >
              {$t['edit.versions.count'].replace('{n}', String(editHistoryCount))}
            </p>
          </div>
        {/if}
        {#if editError}
          <p class="font-bricolage text-sm text-danger mb-3" role="alert">{editError}</p>
        {/if}
      {:else}
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
      {/if}

      {#if !editing}
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
      {/if}
    </article>

    <!-- ── Right rail (switches between read mode + edit mode) ──── -->
    <aside class="hidden lg:block">
      <div
        class="sticky top-24 space-y-5 bg-paper-soft border-l border-dashed border-rule pl-5 -ml-5 py-5"
      >
        {#if editing}
          <!-- Edit mode: action row + delete confirm -->
          <section class="px-5">
            <div class="flex flex-wrap gap-2 mb-4">
              <KioskBtn variant="primary" size="md" onclick={saveEdit} disabled={saving || !isDirty}>
                {saving ? '…' : $t['edit.cta.save']}
              </KioskBtn>
              <KioskBtn variant="secondary" size="md" onclick={() => cancelEdit()} disabled={saving}>
                {$t['edit.cta.cancel']}
              </KioskBtn>
            </div>
            {#if !deleteOpen}
              <KioskBtn variant="danger" size="sm" onclick={() => (deleteOpen = true)}>
                {$t['edit.cta.delete']}
              </KioskBtn>
            {/if}
          </section>

          {#if deleteOpen}
            <DeleteConfirmCard
              replyCount={replyCount}
              deleting={deleting}
              onConfirm={confirmDelete}
              onCancel={() => (deleteOpen = false)}
            />
          {/if}
        {:else}
          <!-- ◆ DEINE ANTWORT — wired CommentComposer -->
          <section>
            {#if currentUserId}
              <CommentComposer
                currentUser={{
                  name: 'du',
                  image: null
                }}
                submitting={postingComment}
                onSubmit={submitComment}
              />
            {:else}
              <p class="font-bricolage text-sm text-ink-mute">
                <a href="/login" class="text-wine hover:underline">{$t['detail.composeLogin']}</a>
              </p>
            {/if}
          </section>

          <!-- ◆ WER MITREDET -->
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

          <!-- ◆ ÄHNLICHE THEMEN -->
          <section>
            <p
              class="font-dmmono text-[10px] uppercase tracking-[0.12em] text-moss mb-2 flex items-center gap-1.5"
            >
              <span aria-hidden="true">◆</span> {$t['detail.related.heading']}
            </p>
            <p class="font-dmmono text-[10px] text-ink-mute leading-[1.5]">
              {$locale === 'de'
                ? 'Verwandte Themen folgen in einer späteren Phase.'
                : 'Related topics ship in a later phase.'}
            </p>
          </section>

          <!-- Trust-note serif italic quote -->
          <section
            class="bg-paper border border-dashed border-rule rounded-sm px-3 py-2.5 font-instrument italic text-[11.5px] text-ink-soft leading-[1.5]"
          >
            {$t['detail.trust.quote']}
          </section>
        {/if}
      </div>
    </aside>
  </div>
</main>
