<script lang="ts">
  /**
   * Bulk action bar — appears when ≥1 item selected (queue view only).
   * Transcribed from
   * design/handoffs/design_handoff_admin/jsx/kiosk-admin.jsx:325-344
   * (AdmBulkBar). Plum-accent (`ADM_ACCENT` in the JSX → `var(--k-accent)`,
   * which resolves to `--k-plum` under `[data-page="admin"]`).
   *
   * Pure presentational — ModerationApp owns the selection Set and the
   * approve/reject/clear handlers. `busy` disables the two action buttons
   * while a bulk request is in flight (mirrors AdmActionBtn's per-card
   * `busy` treatment so the bar can't be double-fired).
   */
  import { t } from '../../../lib/kiosk-i18n';
  import AdmActionBtn from './AdmActionBtn.svelte';

  let {
    count,
    busy = false,
    onApproveAll,
    onRejectAll,
    onClear,
  }: {
    count: number;
    busy?: boolean;
    onApproveAll: () => void;
    onRejectAll: () => void;
    onClear: () => void;
  } = $props();
</script>

<div
  style="
    margin: 0 36px 16px; padding: 12px 18px;
    background: color-mix(in srgb, var(--k-accent) 8%, transparent);
    border: 1.5px solid var(--k-accent); border-radius: var(--k-radius-md);
    display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
  "
>
  <span class="font-dmmono" style="font-size: 12px; font-weight: 600; color: var(--k-accent);">
    {count} {$t['admin.bulk.selected']}
  </span>
  <AdmActionBtn variant="approve" small disabled={busy} onclick={onApproveAll}>✓ {$t['admin.bulk.approveAll']}</AdmActionBtn>
  <AdmActionBtn variant="danger" small disabled={busy} onclick={onRejectAll}>✕ {$t['admin.bulk.rejectAll']}</AdmActionBtn>
  <AdmActionBtn variant="outline" small disabled={busy} onclick={onClear}>{$t['admin.bulk.clear']}</AdmActionBtn>
  <span class="font-dmmono" style="font-size: 10.5px; color: var(--k-ink-mute); margin-left: auto;">{$t['admin.bulk.hint']}</span>
</div>
