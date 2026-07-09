<script lang="ts">
  /**
   * Flagged-category chip with severity color + score. Transcribed from
   * design/handoffs/design_handoff_admin/jsx/kiosk-admin.jsx:146-161.
   *
   * News `relevance` is a special case: score arrives already 0–100 and
   * renders as `N/100`. Every other category renders `Math.round(score*100)%`.
   * Unknown catKey falls back to the raw key + mid severity.
   */
  import { t } from '../../../lib/kiosk-i18n';
  import { ADM_CATS, ADM_SEV_COLOR } from '../../../lib/adminModeration';

  let { catKey, score }: { catKey: string; score: number } = $props();

  const cat = $derived(ADM_CATS[catKey] ?? { sev: 'mid' as const });
  const color = $derived(ADM_SEV_COLOR[cat.sev]);
  const label = $derived((($t as Record<string, string>)[`admin.cat.${catKey}`] ?? catKey));
  const isRelevance = $derived(catKey === 'relevance');
  const scoreText = $derived(isRelevance ? `${Math.round(score)}/100` : `${Math.round(score * 100)}%`);
</script>

<span
  style="
    display: inline-flex; align-items: baseline; gap: 6px;
    font-family: var(--k-font-mono); font-size: 10.5px; font-weight: 500;
    color: {color}; background: var(--k-paper-warm);
    padding: 3px 9px; border-radius: var(--k-radius-sm); border: 1px solid color-mix(in srgb, {color} 40%, transparent);
  "
>
  <span>{label}</span>
  <b style="font-size: 11px;">{scoreText}</b>
</span>
