<script lang="ts">
  /**
   * Decision chip — the Protokoll table's per-row verdict badge. One of
   * approved / warning / rejected. Transcribed from
   * design/handoffs/design_handoff_admin/jsx/kiosk-admin-history.jsx:48-64.
   *
   * `warning` is a derived state, not a `reviewStatus` value — callers
   * compute it as `reviewStatus === 'approved' && hasWarningLabel` (see
   * `AdmHistoryTable`'s `decisionFor()`), matching the API's actual shape
   * (there is no separate "approved_with_warning" reviewStatus).
   */
  import { t } from '../../../lib/kiosk-i18n';

  let { decision }: { decision: 'approved' | 'warning' | 'rejected' } = $props();

  const MAP = {
    approved: { labelKey: 'admin.dec.approved', color: 'var(--k-success)' },
    warning: { labelKey: 'admin.dec.warning', color: 'var(--k-warn)' },
    rejected: { labelKey: 'admin.dec.rejected', color: 'var(--k-danger)' },
  } as const;

  const m = $derived(MAP[decision]);
</script>

<span
  class="font-dmmono"
  style="
    font-size: 10.5px; font-weight: 500; white-space: nowrap;
    color: {m.color}; background: var(--k-paper-warm);
    padding: 3px 9px; border-radius: var(--k-radius-sm);
    border: 1px solid color-mix(in srgb, {m.color} 40%, transparent);
  "
>{$t[m.labelKey]}</span>
