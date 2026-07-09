<script lang="ts">
  /**
   * Source strap — top badge on a queue card, one of urgent / user-report /
   * submitted-news / default-AI. Transcribed from
   * design/handoffs/design_handoff_admin/jsx/kiosk-admin.jsx:119-133.
   *
   * Precedence (highest first): urgent (item.decision === 'urgent_review')
   * > user report (source === 'user_report', appends ` ×N` when
   * reportCount > 1, ink text on ochre) > user-submitted news
   * (contentType === 'news' && authorId !== 'system', moss) > default AI
   * (accent/plum, paper text).
   */
  import { t } from '../../../lib/kiosk-i18n';
  import { isUrgent, type FlaggedItem } from '../../../lib/adminModeration';

  let { item }: { item: FlaggedItem } = $props();

  const urgent = $derived(isUrgent(item));
  const isReport = $derived(item.source === 'user_report');
  const isSubmittedNews = $derived(item.contentType === 'news' && item.authorId !== 'system');

  const bg = $derived(
    urgent
      ? 'var(--k-danger)'
      : isReport
        ? 'var(--k-ochre)'
        : isSubmittedNews
          ? 'var(--k-moss)'
          : 'var(--k-accent)'
  );

  const label = $derived.by(() => {
    if (urgent) return $t['admin.strap.urgent'];
    if (isReport) {
      const base = $t['admin.strap.reported'];
      return item.reportCount && item.reportCount > 1 ? `${base} ×${item.reportCount}` : base;
    }
    if (isSubmittedNews) return $t['admin.strap.news'];
    return $t['admin.strap.ai'];
  });

  // JSX branches color only on source === "report" (ink on ochre); every
  // other case — including urgent — stays paper text.
  const fg = $derived(isReport ? 'var(--k-ink)' : 'var(--k-paper)');
</script>

<span
  class={urgent ? 'adm-strap-urgent' : ''}
  style="
    font-family: var(--k-font-mono); font-size: 10px; font-weight: 500; letter-spacing: 0.08em;
    background: {bg}; color: {fg};
    padding: 3px 9px; border-radius: var(--k-radius-sm); border: 1px solid var(--k-ink);
  "
>{label}</span>
