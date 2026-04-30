<script lang="ts">
  // Single threaded comment — Editorial Kiosk treatment.
  //   ┌─────────────────────────────────────────────────────┐
  //   │ [avatar] Lena K. [OP]   · vor 4 min                 │
  //   │ ♥ 3                                                  │
  //   │ Body text (1-2 lines)                                │
  //   └─────────────────────────────────────────────────────┘

  import KioskAvatar from './KioskAvatar.svelte';

  let { comment, isOP = false } = $props<{
    comment: {
      _id: string;
      body?: string;
      content?: string;
      author?: { name?: string; image?: string | null; _id?: string } | null;
      date?: string;
      likes?: number;
    };
    isOP?: boolean;
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

  // Different schemas use `body` vs `content` — accept both.
  const body = $derived(comment.body ?? comment.content ?? '');
  const likeCount = $derived(comment.likes ?? 0);
</script>

<article class="flex gap-3 py-3.5 border-t border-dashed border-rule first:border-t-0">
  <!-- Avatar column with heart count below (canvas pattern) -->
  <div class="flex flex-col items-center gap-1.5 shrink-0">
    <KioskAvatar
      name={comment.author?.name ?? '·'}
      image={comment.author?.image ?? null}
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
        {comment.author?.name ?? 'anonym'}
      </span>
      {#if isOP}
        <span class="inline-flex items-center px-1.5 py-0.5 rounded font-dmmono text-[9px] uppercase tracking-[0.1em] bg-wine text-paper font-medium">
          OP
        </span>
      {/if}
      <span class="font-dmmono text-[10px] uppercase tracking-[0.08em] text-ink-mute">
        · {relTime(comment.date)}
      </span>
    </header>
    <p class="font-bricolage text-sm text-ink leading-relaxed whitespace-pre-line">
      {body}
    </p>
  </div>
</article>
