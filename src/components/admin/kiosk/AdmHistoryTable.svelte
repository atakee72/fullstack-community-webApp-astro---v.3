<script lang="ts">
  /**
   * Protokoll (history) table — 8 columns, sortable headers, decision chip
   * + color-coded sub-text. Transcribed from
   * design/handoffs/design_handoff_admin/jsx/kiosk-admin-history.jsx:91-192.
   *
   * Column visibility + ordering come from `ADM_HISTORY_COLS`
   * (src/lib/adminModeration.ts) — same source `AdmColumnMenu` uses for its
   * "last visible column" guard, so the two can't drift.
   *
   * Sortable headers: date (createdAt), flagged (maxScore — "Score" lives
   * on the "Markiert als"/"Flagged as" header per the brief), decision
   * (reviewStatus). Active header shows ↓/↑ in the page accent (plum on
   * /admin, via --k-accent).
   */
  import { t, locale } from '../../../lib/kiosk-i18n';
  import type { FlaggedItem } from '../../../lib/adminModeration';
  import AdmSourceStrap from './AdmSourceStrap.svelte';
  import AdmTypeChip from './AdmTypeChip.svelte';
  import AdmCatChip from './AdmCatChip.svelte';
  import AdmDecisionChip from './AdmDecisionChip.svelte';

  type SortKey = 'createdAt' | 'maxScore' | 'reviewStatus';

  let {
    items,
    hiddenCols,
    sortBy,
    sortOrder,
    onSort,
  }: {
    items: FlaggedItem[];
    hiddenCols: Set<string>;
    sortBy: SortKey;
    sortOrder: 'asc' | 'desc';
    onSort: (col: SortKey) => void;
  } = $props();

  function visible(id: string): boolean {
    return !hiddenCols.has(id);
  }

  function formatDate(iso: string | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    const loc = $locale === 'de' ? 'de-DE' : 'en-GB';
    const datePart = d.toLocaleDateString(loc, { day: '2-digit', month: '2-digit' });
    const timePart = d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' });
    return `${datePart} · ${timePart}`;
  }

  // Same title-or-body-excerpt convention as `computeBulkDeltas`
  // (src/lib/adminModeration.ts) — reused here for the content column.
  function contentLabel(item: FlaggedItem): string {
    if (item.title) return item.title;
    if (item.body) return `„${item.body.slice(0, 76)}…“`;
    return '—';
  }

  function decisionFor(item: FlaggedItem): 'approved' | 'warning' | 'rejected' {
    if (item.reviewStatus === 'rejected') return 'rejected';
    if (item.reviewStatus === 'approved' && item.hasWarningLabel) return 'warning';
    return 'approved';
  }

  // Priority: rejectionReason (danger) > warningText (warn) > reviewNotes
  // (ink-mute, serif-italic). Only one renders per row.
  function subText(
    item: FlaggedItem
  ): { text: string; color: string; note: boolean } | null {
    if (item.rejectionReason) return { text: item.rejectionReason, color: 'var(--k-danger)', note: false };
    if (item.warningText) return { text: item.warningText, color: 'var(--k-warn)', note: false };
    if (item.reviewNotes) return { text: item.reviewNotes, color: 'var(--k-ink-mute)', note: true };
    return null;
  }

  // Raw reason-column value (Grund / Hinweis) — same priority, no chip.
  function reasonColumnText(item: FlaggedItem): string {
    return item.rejectionReason || item.warningText || item.reviewNotes || '—';
  }

  function headerColor(key: SortKey): string {
    return sortBy === key ? 'var(--k-accent)' : 'var(--k-ink-mute)';
  }

  function sortArrow(key: SortKey): string {
    if (sortBy !== key) return '';
    return sortOrder === 'asc' ? ' ↑' : ' ↓';
  }

  const headerBtnStyle = `
    background: transparent; border: none; padding: 0; margin: 0;
    font-family: var(--k-font-mono); cursor: pointer; font-size: 10px; font-weight: 500;
    letter-spacing: 0.1em; text-transform: uppercase; white-space: nowrap;
  `;
  const headerStaticStyle = `
    font-size: 10px; font-weight: 500; letter-spacing: 0.1em;
    text-transform: uppercase; white-space: nowrap;
  `;
</script>

<div
  style="
    margin: 4px 0 0; border: var(--k-border-ink); border-radius: var(--k-radius-lg);
    overflow: hidden; background: var(--k-paper-warm); box-shadow: 2px 2px 0 var(--k-ink);
  "
>
  <div style="overflow-x: auto;">
    <table style="width: 100%; border-collapse: collapse; font-size: 12.5px;">
      <thead>
        <tr style="border-bottom: 1.5px solid var(--k-ink);">
          {#if visible('date')}
            <th style="text-align: left; padding: 10px 14px;">
              <button type="button" onclick={() => onSort('createdAt')} style="{headerBtnStyle} color: {headerColor('createdAt')};">{$t['admin.hist.col.date']}{sortArrow('createdAt')}</button>
            </th>
          {/if}
          {#if visible('source')}
            <th class="font-dmmono" style="text-align: left; padding: 10px 14px; {headerStaticStyle} color: var(--k-ink-mute);">{$t['admin.hist.col.source']}</th>
          {/if}
          {#if visible('type')}
            <th class="font-dmmono" style="text-align: left; padding: 10px 14px; {headerStaticStyle} color: var(--k-ink-mute);">{$t['admin.hist.col.type']}</th>
          {/if}
          {#if visible('content')}
            <th class="font-dmmono" style="text-align: left; padding: 10px 14px; {headerStaticStyle} color: var(--k-ink-mute);">{$t['admin.hist.col.content']}</th>
          {/if}
          {#if visible('author')}
            <th class="font-dmmono" style="text-align: left; padding: 10px 14px; {headerStaticStyle} color: var(--k-ink-mute);">{$t['admin.hist.col.author']}</th>
          {/if}
          {#if visible('flagged')}
            <th style="text-align: left; padding: 10px 14px;">
              <button type="button" onclick={() => onSort('maxScore')} style="{headerBtnStyle} color: {headerColor('maxScore')};">{$t['admin.hist.col.flagged']}{sortArrow('maxScore')}</button>
            </th>
          {/if}
          {#if visible('decision')}
            <th style="text-align: left; padding: 10px 14px;">
              <button type="button" onclick={() => onSort('reviewStatus')} style="{headerBtnStyle} color: {headerColor('reviewStatus')};">{$t['admin.hist.col.decision']}{sortArrow('reviewStatus')}</button>
            </th>
          {/if}
          {#if visible('reason')}
            <th class="font-dmmono" style="text-align: left; padding: 10px 14px; {headerStaticStyle} color: var(--k-ink-mute);">{$t['admin.hist.col.reason']}</th>
          {/if}
        </tr>
      </thead>
      <tbody>
        {#each items as item, i (item._id ?? i)}
          {@const sub = subText(item)}
          {@const cats = item.flaggedCategories ?? []}
          <tr style="border-bottom: {i < items.length - 1 ? '1px dashed var(--k-rule)' : 'none'}; vertical-align: top;">
            {#if visible('date')}
              <td class="font-dmmono" style="padding: 12px 14px; font-size: 10.5px; color: var(--k-ink-mute); white-space: nowrap;">
                <div>{formatDate(item.createdAt)}</div>
                <div style="font-size: 9px; margin-top: 2px;">{$t['admin.hist.reviewed']} {formatDate(item.reviewedAt)}</div>
              </td>
            {/if}
            {#if visible('source')}
              <td style="padding: 12px 14px;"><AdmSourceStrap {item} /></td>
            {/if}
            {#if visible('type')}
              <td style="padding: 12px 14px;"><AdmTypeChip type={item.contentType} /></td>
            {/if}
            {#if visible('content')}
              <td style="padding: 12px 14px; max-width: 260px;">
                <div class="font-bricolage" style="font-weight: 700; font-size: 13px; letter-spacing: -0.01em; line-height: 1.35;">{contentLabel(item)}</div>
              </td>
            {/if}
            {#if visible('author')}
              <td style="padding: 12px 14px; white-space: nowrap; font-size: 12.5px;">{item.authorName ?? item.authorId}</td>
            {/if}
            {#if visible('flagged')}
              <td style="padding: 12px 14px;">
                <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                  {#if item.reportReason}
                    <span class="font-dmmono" style="font-size: 10px; font-weight: 500; color: var(--k-ink); background: var(--k-ochre); padding: 2px 8px; border-radius: var(--k-radius-sm); border: 1px solid var(--k-ink);">{$t[`admin.report.${item.reportReason}` as keyof typeof $t]}</span>
                  {:else}
                    {#each cats.slice(0, 2) as cat (cat)}
                      <AdmCatChip catKey={cat} score={item.scores?.[cat] ?? 0} />
                    {/each}
                    {#if cats.length > 2}
                      <span class="font-dmmono" style="font-size: 10px; color: var(--k-ink-mute); padding: 2px 6px;">+{cats.length - 2}</span>
                    {/if}
                  {/if}
                </div>
              </td>
            {/if}
            {#if visible('decision')}
              <td style="padding: 12px 14px;">
                <AdmDecisionChip decision={decisionFor(item)} />
                {#if sub}
                  <div
                    class={sub.note ? 'font-instrument' : 'font-bricolage'}
                    style="margin-top: 5px; font-size: 11px; line-height: 1.4; max-width: 200px; color: {sub.color}; font-style: {sub.note ? 'italic' : 'normal'};"
                  >{sub.text}</div>
                {/if}
              </td>
            {/if}
            {#if visible('reason')}
              <td style="padding: 12px 14px; font-size: 11.5px; color: var(--k-ink-soft); max-width: 220px;">{reasonColumnText(item)}</td>
            {/if}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
