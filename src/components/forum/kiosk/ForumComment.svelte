<script lang="ts">
  // Single threaded comment — Editorial Kiosk treatment.
  //   ┌─────────────────────────────────────────────────────┐
  //   │ [avatar] Lena K. [OP]   · vor 4 min · bearbeitet ✎🗑 │
  //   │ ♥ 3                                                  │
  //   │ Body text (1-2 lines)                                │
  //   └─────────────────────────────────────────────────────┘
  //
  // Actions row (pencil + trash) is visible only when the viewer is the
  // author. Pencil is gated by:
  //   • isLatest — this is the newest comment on the thread (no later
  //     comment from anyone has landed yet).
  //   • inTimeWindow — under 15 min since `comment.date`.
  //   • isApproved — `moderationStatus === 'approved'` AND not warning-
  //     labelled (admin-set; editing around moderation is blocked).
  // Trash is visible whenever the viewer is the author (no time window).

  import KioskAvatar from './KioskAvatar.svelte';
  import { t } from '../../../lib/kiosk-i18n';

  let {
    comment,
    isOP = false,
    isLatest = false,
    currentUserId = null,
    onEdit,
    onDelete
  } = $props<{
    comment: {
      _id: string;
      body?: string;
      content?: string;
      author?: { name?: string; image?: string | null; _id?: string } | string | null;
      date?: string | number;
      likes?: number;
      editedAt?: string | Date | null;
      moderationStatus?: 'approved' | 'pending' | 'rejected';
      hasWarningLabel?: boolean;
    };
    isOP?: boolean;
    isLatest?: boolean;
    currentUserId?: string | null;
    onEdit?: (newBody: string) => Promise<void>;
    onDelete?: () => Promise<void>;
  }>();

  const EDIT_WINDOW_MS = 15 * 60 * 1000;

  function authorIdOf(v: any): string | null {
    if (!v) return null;
    if (typeof v === 'string') return v;
    if (typeof v === 'object' && v._id) return String(v._id);
    return null;
  }

  function commentDateMs(d?: string | number): number {
    if (d == null) return 0;
    if (typeof d === 'number') return d;
    return new Date(d).getTime();
  }

  function relTime(d?: string | number): string {
    const ms = commentDateMs(d);
    if (!ms) return '';
    const min = Math.floor((Date.now() - ms) / 60_000);
    if (min < 1) return 'gerade eben';
    if (min < 60) return `vor ${min} min`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `vor ${hr} std`;
    return `vor ${Math.floor(hr / 24)} t`;
  }

  // Different schemas use `body` vs `content` — accept both.
  const body = $derived(comment.body ?? comment.content ?? '');
  const likeCount = $derived(comment.likes ?? 0);
  const isEdited = $derived(!!comment.editedAt);

  const isAuthor = $derived(
    !!currentUserId && authorIdOf(comment.author) === currentUserId
  );
  const inTimeWindow = $derived(
    Date.now() - commentDateMs(comment.date) < EDIT_WINDOW_MS
  );
  const isApproved = $derived(
    (comment.moderationStatus ?? 'approved') === 'approved' && !comment.hasWarningLabel
  );
  const canEdit = $derived(isAuthor && isLatest && inTimeWindow && isApproved && !!onEdit);
  const canDelete = $derived(isAuthor && !!onDelete);

  // ─── Edit mode ──────────────────────────────────────────────────────
  let editing = $state(false);
  let draft = $state('');
  let saving = $state(false);

  function enterEdit() {
    draft = body;
    editing = true;
  }
  function cancelEdit() {
    editing = false;
    draft = '';
  }

  async function saveEdit() {
    if (saving || !onEdit) return;
    const trimmed = draft.trim();
    if (trimmed.length === 0) return;
    if (trimmed === body.trim()) {
      // No-op: skip the moderation API call entirely.
      cancelEdit();
      return;
    }
    // Re-check the time window at save time (no reactive timer; the user
    // could have sat in edit mode after the window closed). Server enforces
    // this too, but the client check avoids a wasted round-trip.
    if (Date.now() - commentDateMs(comment.date) >= EDIT_WINDOW_MS) {
      // Parent shows the toast via its error handler; we just close edit mode
      // and let the parent's onEdit catch the rejection. Simpler: ask parent
      // to handle by passing the body — parent sees the rejection via the
      // server response. But we already know it'll fail, so short-circuit.
      cancelEdit();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('app:toast', {
            detail: { type: 'warning', message: $t['comment.toast.edit.window'] }
          })
        );
      }
      return;
    }
    saving = true;
    try {
      await onEdit(trimmed);
      editing = false;
    } catch {
      // Parent surfaces the toast; keep edit mode open so user can retry.
    } finally {
      saving = false;
    }
  }

  // ESC cancels edit mode.
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

  // Cmd/Ctrl-Enter saves.
  function onTextareaKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    }
  }

  async function handleDeleteClick() {
    if (!onDelete) return;
    await onDelete();
  }
</script>

<article class="flex gap-3 py-3.5 border-t border-dashed border-rule first:border-t-0">
  <!-- Avatar column with heart count below -->
  <div class="flex flex-col items-center gap-1.5 shrink-0">
    <KioskAvatar
      name={typeof comment.author === 'object' ? (comment.author?.name ?? '·') : '·'}
      image={typeof comment.author === 'object' ? (comment.author?.image ?? null) : null}
      size="sm"
      isOP={isOP}
    />
    {#if likeCount > 0}
      <span class="font-dmmono text-[9.5px] tracking-[0.05em] text-ink-mute flex items-center gap-0.5">
        <span aria-hidden="true">♥</span> {likeCount}
      </span>
    {/if}
  </div>

  <!-- Body column -->
  <div class="flex-1 min-w-0">
    <header class="flex items-center flex-wrap gap-2 mb-1">
      <span class="font-bricolage font-bold text-sm text-ink">
        {typeof comment.author === 'object' ? (comment.author?.name ?? 'anonym') : 'anonym'}
      </span>
      {#if isOP}
        <span class="inline-flex items-center px-1.5 py-0.5 rounded font-dmmono text-[9px] uppercase tracking-[0.1em] bg-wine text-paper font-medium">
          OP
        </span>
      {/if}
      <span class="font-dmmono text-[10px] uppercase tracking-[0.08em] text-ink-mute">
        · {relTime(comment.date)}
      </span>
      {#if isEdited}
        <span class="font-instrument italic text-[11px] text-ink-mute">
          · {$t['comment.edited']}
        </span>
      {/if}
      {#if (canEdit || canDelete) && !editing}
        <span class="ml-auto inline-flex items-center gap-2.5">
          {#if canEdit}
            <button
              type="button"
              onclick={enterEdit}
              class="font-dmmono text-[10.5px] uppercase tracking-[0.08em] text-ink-mute hover:text-ink underline-offset-2 hover:underline"
              aria-label={$t['comment.actions.edit']}
            >
              ✎ {$t['comment.actions.edit']}
            </button>
          {/if}
          {#if canDelete}
            <button
              type="button"
              onclick={handleDeleteClick}
              class="font-dmmono text-[10.5px] uppercase tracking-[0.08em] text-ink-mute hover:text-danger underline-offset-2 hover:underline"
              aria-label={$t['comment.actions.delete']}
            >
              🗑 {$t['comment.actions.delete']}
            </button>
          {/if}
        </span>
      {/if}
    </header>

    {#if editing}
      <textarea
        bind:value={draft}
        onkeydown={onTextareaKeydown}
        maxlength="1000"
        rows="3"
        class="w-full bg-paper-soft border-[1.5px] border-ink rounded-md px-3 py-2 font-bricolage text-sm leading-relaxed text-ink outline-none focus:border-wine resize-y min-h-[72px]"
      ></textarea>
      <div class="mt-2 flex items-center gap-2">
        <button
          type="button"
          onclick={saveEdit}
          disabled={saving || draft.trim().length === 0}
          class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-ink text-paper border-2 border-ink font-dmmono text-[10.5px] uppercase tracking-[0.08em] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {#if saving}
            <span class="k-spin" aria-hidden="true">◐</span>
          {/if}
          {$t['comment.edit.save']}
        </button>
        <button
          type="button"
          onclick={cancelEdit}
          disabled={saving}
          class="inline-flex items-center px-3 py-1 rounded-full bg-transparent border-2 border-ink text-ink font-dmmono text-[10.5px] uppercase tracking-[0.08em] disabled:opacity-50"
        >
          {$t['comment.edit.cancel']}
        </button>
      </div>
    {:else}
      <p class="font-bricolage text-sm text-ink leading-relaxed whitespace-pre-line">
        {body}
      </p>
    {/if}
  </div>
</article>
