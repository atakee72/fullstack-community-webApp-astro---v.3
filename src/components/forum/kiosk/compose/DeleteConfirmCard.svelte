<script lang="ts">
  // Type-to-confirm delete card. Per JSX ForumEditDesktop sidebar (line 925).
  //
  // The "endgültig löschen" button stays disabled until the user types
  // the locale-correct target word ("LÖSCHEN" in DE, "DELETE" in EN).
  // Case-insensitive match. This intentional friction protects long
  // threads from accidental deletes; the right-side cancel button stays
  // active throughout so the user can always back out cheaply.
  //
  // Body lists what gets lost — the JSX uses specific neighbour names
  // ("Tarıks Tipp, Ayşegüls Aushang"), but for real data we just say
  // "{n} Antworten gehen verloren". The friction copy stays the same.

  import KioskBtn from '../KioskBtn.svelte';
  import { t, tStr } from '../../../../lib/kiosk-i18n';

  let {
    replyCount = 0,
    deleting = false,
    onConfirm,
    onCancel
  } = $props<{
    replyCount?: number;
    deleting?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
  }>();

  let typed = $state('');
  // Compare against the locale's target word. `$t` is reactive so
  // switching DE↔EN mid-typing re-evaluates this naturally.
  const target = $derived(($t['delete.confirm.target']).toLowerCase());
  const matches = $derived(typed.trim().toLowerCase() === target);

  const bodyText = $derived(
    replyCount > 0
      ? tStr($t['delete.body'], { replies: replyCount })
      : $t['delete.body.zero']
  );
</script>

<div class="px-5 py-5">
  <p class="font-dmmono text-[10px] uppercase tracking-[0.12em] text-danger mb-2">
    ◆ {$t['delete.kicker']}
  </p>

  <div
    class="bg-paper border-2 border-danger rounded-md p-4 shadow-[3px_3px_0_var(--k-danger)]"
  >
    <h3 class="font-bricolage font-extrabold tracking-tight text-[18px] leading-[1.15] text-ink m-0 mb-1.5">
      {$t['delete.title.prefix']}
      <span class="font-instrument italic font-normal text-danger">
        {$t['delete.title.accent']}
      </span>{$t['delete.title.suffix']}
    </h3>
    <p class="font-bricolage text-[12.5px] text-ink-soft leading-relaxed mb-3">
      {bodyText}
    </p>

    <!-- Type-to-confirm input -->
    <div class="mb-2.5">
      <p class="font-dmmono text-[9.5px] uppercase tracking-[0.08em] text-ink-mute mb-1">
        {$t['delete.confirm.label']}
      </p>
      <input
        type="text"
        bind:value={typed}
        placeholder={$t['delete.confirm.placeholder']}
        autocomplete="off"
        class="w-full bg-paper-soft border-[1.5px] border-danger rounded-sm px-2.5 py-1.5 font-dmmono text-[12px] text-ink outline-none placeholder:text-ink-mute"
      />
    </div>

    <div class="flex gap-2">
      <KioskBtn
        variant="danger"
        size="sm"
        disabled={!matches || deleting}
        onclick={onConfirm}
      >
        {$t['delete.cta.confirm']}
      </KioskBtn>
      <KioskBtn variant="secondary" size="sm" onclick={onCancel} disabled={deleting}>
        {$t['delete.cta.cancel']}
      </KioskBtn>
    </div>
  </div>

  <p class="font-instrument italic text-[11.5px] text-ink-mute leading-[1.5] mt-3.5">
    {$t['delete.friction']}
  </p>
</div>
