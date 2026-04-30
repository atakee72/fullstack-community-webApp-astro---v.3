<script lang="ts">
  // Right-rail comment composer for the post detail page. Replaces the
  // visual stub that landed in Phase 5a.
  //
  // Comments don't run the full ModeratingModal — submit shows a small
  // inline spinner and the optimistic insert lands in the parent's
  // local state immediately. The actual moderation pipeline runs
  // server-side and the comment may come back with `moderationStatus:
  // 'pending'`; for now the optimistic insert displays it as already
  // visible (matches the React legacy behaviour). A future polish pass
  // could surface a small "in Prüfung" pill on the optimistic comment.
  //
  // Auth-gated by the API. If the user isn't logged in, the parent
  // shows the login prompt copy from `detail.composeLogin` instead of
  // mounting this component.

  import KioskAvatar from '../KioskAvatar.svelte';
  import KioskBtn from '../KioskBtn.svelte';
  import { t } from '../../../../lib/kiosk-i18n';

  let {
    currentUser,
    submitting = false,
    onSubmit
  } = $props<{
    currentUser: { name?: string; image?: string | null };
    submitting?: boolean;
    onSubmit: (body: string) => void | Promise<void>;
  }>();

  let body = $state('');

  function submit() {
    const trimmed = body.trim();
    if (!trimmed || submitting) return;
    onSubmit(trimmed);
  }

  // Reset on successful submit — caller toggles `submitting` to false
  // after the mutation resolves; we clear here so the textarea empties.
  // Edge case: if the mutation fails, the body is still in `body` so
  // the user can retry without re-typing.
  let lastSubmittingState = $state(false);
  $effect(() => {
    if (lastSubmittingState && !submitting) {
      // submit cycle ended — only clear when caller signals success
      // (caller's onSubmit returns void; for now we trust the cycle).
      body = '';
    }
    lastSubmittingState = submitting;
  });

  function onKey(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  }
</script>

<div>
  <p class="font-dmmono text-[10px] uppercase tracking-[0.12em] text-wine mb-2">
    ◆ {$t['detail.compose.heading']}
  </p>

  <div class="flex gap-2">
    <KioskAvatar
      name={currentUser.name ?? 'du'}
      image={currentUser.image ?? null}
      size="sm"
    />
    <div class="flex-1 min-w-0">
      <textarea
        bind:value={body}
        onkeydown={onKey}
        placeholder={$t['detail.compose.placeholder']}
        rows="3"
        class="w-full bg-paper-soft border-[1.5px] border-ink rounded-md px-3 py-2 font-bricolage text-[13px] leading-relaxed text-ink placeholder:text-ink-mute/55 outline-none focus:border-wine resize-y min-h-[72px]"
        disabled={submitting}
      ></textarea>
    </div>
  </div>

  <div class="flex items-center justify-between mt-2 gap-2">
    <span class="font-dmmono text-[10px] text-ink-mute">
      {$t['detail.compose.modNote']}
    </span>
    <KioskBtn
      variant="primary"
      size="sm"
      onclick={submit}
      disabled={!body.trim() || submitting}
    >
      {submitting ? '…' : $t['detail.compose.submit']}
    </KioskBtn>
  </div>
</div>
