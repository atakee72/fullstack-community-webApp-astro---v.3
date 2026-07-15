<script lang="ts">
  /**
   * Announcement card — ink treatment while pinned (teal "AM BRETT" strap,
   * paper-on-ink footer actions), paper treatment in the archive. Pinned-
   * ness is derived internally via `isPinned(item)` (server invariant: at
   * most one item ever satisfies it) rather than passed in, so callers
   * just hand over the raw item. Transcribed from
   * design/handoffs/design_handoff_announce/jsx/kiosk-admin-announce.jsx:122-163.
   *
   * One deliberate deviation from the JSX: the pinned card's "✎ bearbeiten"
   * ghost button there renders with the default (ink) tone, which would be
   * invisible ink-on-ink text against the pinned card's dark background —
   * almost certainly a copy/paste miss, since the adjacent unpin button on
   * the same row is correctly given a paper-tinted override. Both buttons
   * use the paper-tinted ("onInk") tone here instead, matching the rest of
   * the card's ink/paper treatment split.
   *
   * `pending` (Task 4): an optimistically-created item shows the pulsing
   * "WIRD ANGEPINNT…" chip and renders with the pinned (ink) treatment
   * even before the server confirms — action buttons/callbacks land now,
   * wired to no-ops until Task 4.
   */
  import { t, tStr, locale } from '../../../../lib/kiosk-i18n';
  import { isPinned, fmtPinDate, fmtCreated, type AnnLang } from './annFormat';

  let {
    item,
    compact = false,
    pending = false,
    onEdit,
    onUnpin,
    onRepin,
    onDelete,
  }: {
    item: any;
    compact?: boolean;
    pending?: boolean;
    onEdit: (item: any) => void;
    onUnpin: (item: any) => void;
    onRepin: (item: any) => void;
    onDelete: (item: any) => void;
  } = $props();

  const lang = $derived(($locale === 'de' ? 'DE' : 'EN') as AnnLang);
  const pinned = $derived(isPinned(item));
  // pending items are drawn with the pinned (ink) treatment even before
  // the server has actually set pinnedUntil.
  const inkTreatment = $derived(pending || pinned);

  const fg = $derived(inkTreatment ? 'var(--k-paper)' : 'var(--k-ink)');
  const fgSoft = $derived(inkTreatment ? 'rgba(243,234,216,0.72)' : 'var(--k-ink-soft)');
  const fgMute = $derived(inkTreatment ? 'rgba(243,234,216,0.5)' : 'var(--k-ink-mute)');
  const dash = $derived(inkTreatment ? 'rgba(243,234,216,0.25)' : 'var(--k-rule)');

  type Tone = 'ink' | 'accent' | 'danger' | 'onInk';
  function toneStyle(tone: Tone): { fg: string; border: string } {
    switch (tone) {
      case 'accent':
        return { fg: 'var(--k-accent)', border: 'var(--k-accent)' };
      case 'danger':
        return { fg: 'var(--k-danger)', border: 'var(--k-danger)' };
      case 'onInk':
        return { fg: 'var(--k-paper)', border: 'rgba(243,234,216,0.5)' };
      default:
        return { fg: 'var(--k-ink)', border: 'var(--k-ink)' };
    }
  }
</script>

{#snippet ghostBtn(label: string, tone: Tone, onclick: () => void)}
  {@const s = toneStyle(tone)}
  <button
    type="button"
    {onclick}
    class="font-bricolage"
    style="
      background: transparent; color: {s.fg}; border: 1.5px solid {s.border};
      border-radius: var(--k-radius-pill); padding: 6px 13px;
      font-size: 12px; font-weight: 700; cursor: pointer;
    "
  >{label}</button>
{/snippet}

<article
  style="
    position: relative;
    background: {inkTreatment ? 'var(--k-ink)' : 'var(--k-paper)'};
    color: {fg};
    border: var(--k-border-ink);
    border-radius: var(--k-radius-lg);
    overflow: hidden;
    box-shadow: {inkTreatment ? '3px 3px 0 var(--k-teal)' : '2px 2px 0 var(--k-ink)'};
    opacity: {inkTreatment ? 1 : 0.92};
  "
>
  {#if inkTreatment}
    <div
      class="font-dmmono"
      style="background: var(--k-teal); color: var(--k-paper); padding: 5px 16px; font-size: 10px; font-weight: 600; letter-spacing: 0.1em; display: flex; justify-content: space-between; align-items: center;"
    >
      <span>{$t['admin.ann.strap.left']}</span>
      <span>{$t['admin.ann.strap.right']}</span>
    </div>
  {/if}

  <div style="padding: {compact ? '13px 15px 11px' : '15px 18px 12px'};">
    <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 8px;">
      {#if pending}
        <span
          class="font-dmmono ann-pending-chip"
          style="font-size: 10px; font-weight: 600; letter-spacing: 0.06em; background: var(--k-ochre); color: var(--k-ink); padding: 3px 9px; border-radius: var(--k-radius-sm); border: 1px solid var(--k-ink);"
        >{$t['admin.ann.chip.pending']}</span>
      {:else if pinned}
        <span
          class="font-dmmono"
          style="font-size: 10px; font-weight: 600; letter-spacing: 0.06em; background: var(--k-ochre); color: var(--k-ink); padding: 3px 9px; border-radius: var(--k-radius-sm); border: 1px solid var(--k-ink);"
        >{tStr($t['admin.ann.chip.pinned'], { date: fmtPinDate(item.pinnedUntil, lang) })}</span>
      {:else if item.pinnedUntil}
        <span
          class="font-dmmono"
          style="font-size: 10px; letter-spacing: 0.06em; color: var(--k-ink-mute); padding: 3px 9px; border-radius: var(--k-radius-sm); border: 1px dashed var(--k-rule);"
        >{tStr($t['admin.ann.chip.expired'], { date: fmtPinDate(item.pinnedUntil, lang) })}</span>
      {:else}
        <span
          class="font-dmmono"
          style="font-size: 10px; letter-spacing: 0.06em; color: var(--k-ink-mute); padding: 3px 9px; border-radius: var(--k-radius-sm); border: 1px dashed var(--k-rule);"
        >{$t['admin.ann.chip.unpinned']}</span>
      {/if}
      <span class="font-dmmono" style="font-size: 10px; color: {fgMute}; margin-left: auto;">
        {fmtCreated(item.createdAt, lang)}{(item.editCount ?? 0) >= 1 ? ` · ${tStr($t['admin.ann.meta.edited'], { n: item.editCount })}` : ''}
      </span>
    </div>
    <h3
      class="font-bricolage"
      style="margin: 0 0 6px; font-size: {compact ? '16px' : '19px'}; font-weight: 700; letter-spacing: -0.015em; line-height: 1.25; overflow-wrap: anywhere;"
    >{item.title}</h3>
    <p
      class="font-bricolage"
      style="margin: 0; font-size: {compact ? '12.5px' : '13.5px'}; line-height: 1.55; color: {fgSoft}; overflow-wrap: anywhere;"
    >{item.body}</p>
  </div>

  <div style="padding: {compact ? '10px 15px' : '11px 18px'}; border-top: 1px dashed {dash}; display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
    {#if inkTreatment}
      {@render ghostBtn($t['admin.ann.action.edit'], 'onInk', () => onEdit(item))}
      {@render ghostBtn($t['admin.ann.action.unpin'], 'onInk', () => onUnpin(item))}
      <span class="font-dmmono" style="font-size: 10px; color: {fgMute}; margin-left: auto;">PATCH pinnedUntil: null</span>
    {:else}
      {@render ghostBtn($t['admin.ann.action.repin'], 'accent', () => onRepin(item))}
      {@render ghostBtn($t['admin.ann.action.edit'], 'ink', () => onEdit(item))}
      {@render ghostBtn($t['admin.ann.action.delete'], 'danger', () => onDelete(item))}
      <span class="font-dmmono" style="font-size: 10px; color: {fgMute}; margin-left: auto;">{$t['admin.ann.micro.displace']}</span>
    {/if}
  </div>
</article>
