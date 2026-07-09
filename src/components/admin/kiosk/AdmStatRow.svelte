<script lang="ts">
  /**
   * Setzkasten stat row — 5 cards mapping the API's `counts` object.
   * Transcribed from design/handoffs/design_handoff_admin/jsx/kiosk-admin.jsx:237-260.
   *
   * `counts` is null before the first successful fetch — every card renders
   * 0 rather than blocking on a separate loading treatment (the queue list
   * below carries the skeleton state).
   */
  import { t } from '../../../lib/kiosk-i18n';

  let {
    counts,
  }: {
    counts: { pending: number; approved: number; approvedWithWarning: number; rejected: number; urgent: number } | null;
  } = $props();

  const stats = $derived([
    { n: counts?.urgent ?? 0, labelKey: 'admin.stat.urgent', c: 'var(--k-danger)' },
    { n: counts?.pending ?? 0, labelKey: 'admin.stat.pending', c: 'var(--k-ochre)' },
    { n: counts?.approved ?? 0, labelKey: 'admin.stat.approved', c: 'var(--k-success)' },
    { n: counts?.approvedWithWarning ?? 0, labelKey: 'admin.stat.warning', c: 'var(--k-warn)' },
    { n: counts?.rejected ?? 0, labelKey: 'admin.stat.rejected', c: 'var(--k-ink-mute)' },
  ]);
</script>

<div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; padding: 18px 36px 0;">
  {#each stats as s (s.labelKey)}
    <div
      style="
        background: var(--k-paper-warm); border: var(--k-border-ink); border-radius: var(--k-radius-md);
        border-top: 4px solid {s.c}; padding: 12px 16px 10px;
        box-shadow: 2px 2px 0 var(--k-ink);
      "
    >
      <div class="font-bricolage" style="font-size: 34px; font-weight: 800; letter-spacing: -0.03em; line-height: 1;">{s.n}</div>
      <div class="font-dmmono" style="font-size: 10px; color: var(--k-ink-mute); letter-spacing: 0.1em; margin-top: 4px; text-transform: uppercase;">{$t[s.labelKey as keyof typeof $t]}</div>
    </div>
  {/each}
</div>
