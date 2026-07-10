<script lang="ts">
  /**
   * Column-visibility menu for the Protokoll table — self-contained toggle
   * button + floating panel (owns its own open/close state; the parent only
   * hands down `hidden`/`onToggle`). Transcribed from
   * design/handoffs/design_handoff_admin/jsx/kiosk-admin-history.jsx:66-89
   * (button chrome lifted from the inline JSX in `AdminHistoryDesktop`).
   *
   * Guard: refuses to hide the last visible column — computed against
   * `ADM_HISTORY_COLS` (the single source of truth also used by
   * `AdmHistoryTable`), so the two components can't drift on column count.
   */
  import { t } from '../../../lib/kiosk-i18n';
  import { ADM_HISTORY_COLS, type AdmHistoryColId } from '../../../lib/adminModeration';

  let {
    hidden,
    onToggle,
  }: {
    hidden: Set<string>;
    onToggle: (id: AdmHistoryColId) => void;
  } = $props();

  let open = $state(false);
  let wrapperEl: HTMLDivElement | undefined;

  const COL_LABEL_KEY: Record<AdmHistoryColId, string> = {
    date: 'admin.hist.col.date',
    source: 'admin.hist.col.source',
    type: 'admin.hist.col.type',
    content: 'admin.hist.col.content',
    author: 'admin.hist.col.author',
    flagged: 'admin.hist.col.flagged',
    decision: 'admin.hist.col.decision',
    reason: 'admin.hist.col.reason',
  };

  function handleToggle(id: AdmHistoryColId) {
    const isHidden = hidden.has(id);
    const visibleCount = ADM_HISTORY_COLS.length - hidden.size;
    // Refuse to hide the last visible column — clicking an already-hidden
    // column (to re-show it) is always allowed.
    if (!isHidden && visibleCount <= 1) return;
    onToggle(id);
  }

  function handleWindowClick(e: MouseEvent) {
    if (!open) return;
    if (wrapperEl && e.target instanceof Node && !wrapperEl.contains(e.target)) {
      open = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') open = false;
  }
</script>

<svelte:window onclick={handleWindowClick} onkeydown={handleKeydown} />

<div bind:this={wrapperEl} style="position: relative;">
  <button
    type="button"
    onclick={() => (open = !open)}
    class="font-bricolage"
    style="
      padding: 6px 14px; font-size: 12.5px; font-weight: 700;
      border: var(--k-border-ink); border-radius: var(--k-radius-pill);
      background: {open ? 'var(--k-ink)' : 'transparent'};
      color: {open ? 'var(--k-paper)' : 'var(--k-ink)'};
      cursor: pointer;
    "
  >{$t['admin.hist.columns']}</button>

  {#if open}
    <div
      style="
        position: absolute; top: 40px; right: 0; z-index: 6; min-width: 180px;
        background: var(--k-paper-warm); border: var(--k-border-ink); border-radius: var(--k-radius-md);
        box-shadow: 3px 3px 0 var(--k-ink); padding: 8px 0;
      "
    >
      {#each ADM_HISTORY_COLS as id (id)}
        {@const checked = !hidden.has(id)}
        <div
          role="menuitemcheckbox"
          aria-checked={checked}
          tabindex="0"
          onclick={() => handleToggle(id)}
          onkeydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleToggle(id);
            }
          }}
          class="font-bricolage"
          style="
            display: flex; align-items: center; gap: 9px; padding: 5px 14px;
            font-size: 12.5px; font-weight: 600; cursor: pointer;
            color: {checked ? 'var(--k-ink)' : 'var(--k-ink-mute)'};
          "
        >
          <span
            style="
              width: 16px; height: 16px; flex: 0 0 16px; border-radius: 4px;
              border: var(--k-border-ink); display: inline-flex; align-items: center; justify-content: center;
              background: {checked ? 'var(--k-accent)' : 'transparent'};
              color: var(--k-paper); font-size: 11px; font-weight: 700; line-height: 1;
            "
          >{checked ? '✓' : ''}</span>
          <span>{$t[COL_LABEL_KEY[id]]}</span>
        </div>
      {/each}
      <div
        class="font-dmmono"
        style="font-size: 9.5px; color: var(--k-ink-mute); padding: 6px 14px 0; border-top: 1px dashed var(--k-rule); margin-top: 6px;"
      >{$t['admin.hist.minCol']}</div>
    </div>
  {/if}
</div>
