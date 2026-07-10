<script lang="ts">
  /**
   * Mobile triage card — one case at a time, thumb-sized actions. Transcribed
   * from design/handoffs/design_handoff_admin/jsx/kiosk-admin.jsx:494-524
   * (the `AdminQueueMobile` article anatomy).
   *
   * Deliberately NOT `AdmQueueCard` cut down — no checkbox (mobile never
   * selects for bulk), no images block, no relevance/flagged-categories
   * label prefix, and the report-reason chip skips the "GEMELDET WEGEN"
   * label + reporter name + report-count + details blockquote that the
   * desktop card carries. Per the handoff rule "mobil wird triagiert,
   * nicht verwaltet" — this card shows exactly enough to decide, not the
   * full case file.
   *
   * Action labels are fixed to the 3 mobile keys (admin.mobile.act.*)
   * regardless of `item.source` — the JSX seed for mobile triage doesn't
   * branch report vs. AI-flagged wording the way the desktop card does.
   * The handlers themselves are shared with the desktop card (`onApprove`
   * → 'approve' for both dismiss-report and approve-content — same API
   * action either way), so behavior is identical; only the label is
   * simplified for the compact surface.
   *
   * Optimistic-state contract mirrors AdmQueueCard exactly: `actioningLabel`
   * dims the card + shows a centered pending pill (pointer-events disabled
   * while busy), `settling` plays the settle-out animation just before the
   * parent removes the item post-success.
   */
  import { t, locale } from '../../../lib/kiosk-i18n';
  import { isUrgent, type FlaggedItem } from '../../../lib/adminModeration';
  import AdmSourceStrap from './AdmSourceStrap.svelte';
  import AdmTypeChip from './AdmTypeChip.svelte';
  import AdmStrikeDots from './AdmStrikeDots.svelte';
  import AdmCatChip from './AdmCatChip.svelte';

  let {
    item,
    onApprove,
    onWarn,
    onReject,
    actioningLabel = null,
    settling = false,
  }: {
    item: FlaggedItem;
    onApprove: (item: FlaggedItem) => void;
    onWarn: (item: FlaggedItem) => void;
    onReject: (item: FlaggedItem) => void;
    actioningLabel?: string | null;
    settling?: boolean;
  } = $props();

  const urgent = $derived(isUrgent(item));
  const isReport = $derived(item.source === 'user_report');
  const isComment = $derived(item.contentType === 'comment');
  const busy = $derived(!!actioningLabel);

  function formatTime(iso: string): string {
    const d = new Date(iso);
    const loc = $locale === 'de' ? 'de-DE' : 'en-GB';
    const datePart = d.toLocaleDateString(loc, { day: '2-digit', month: '2-digit' });
    const timePart = d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' });
    return `${datePart} · ${timePart}`;
  }
</script>

<article
  class={settling ? 'adm-card-settle' : ''}
  style="
    position: relative; overflow: hidden;
    background: {urgent ? 'var(--k-paper-warm)' : 'var(--k-paper)'};
    border: {urgent ? '2px solid var(--k-danger)' : 'var(--k-border-ink)'};
    border-radius: var(--k-radius-lg);
    box-shadow: {urgent ? '3px 3px 0 var(--k-danger)' : '2px 2px 0 var(--k-ink)'};
  "
>
  <div style="opacity: {busy ? 0.55 : 1}; pointer-events: {busy ? 'none' : 'auto'};">
    <!-- header -->
    <div style="display: flex; align-items: center; gap: 7px; padding: 10px 14px; flex-wrap: wrap; border-bottom: 1px dashed var(--k-rule);">
      <AdmSourceStrap {item} />
      <AdmTypeChip type={item.contentType} />
      <span class="font-dmmono" style="font-size: 10px; color: var(--k-ink-mute); margin-left: auto;">{formatTime(item.createdAt)}</span>
    </div>

    <!-- body -->
    <div style="padding: 12px 14px;">
      {#if item.title}
        <h3 class="font-bricolage" style="margin: 0 0 5px; font-size: 15.5px; font-weight: 700; letter-spacing: -0.01em;">{item.title}</h3>
      {/if}
      {#if item.body}
        <p
          class={isComment ? 'font-instrument' : 'font-bricolage'}
          style="margin: 0; font-size: 12.5px; line-height: 1.5; color: var(--k-ink-soft); font-style: {isComment ? 'italic' : 'normal'}; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;"
        >{isComment ? `„${item.body}“` : item.body}</p>
      {/if}

      <!-- chips row: report reason (report) or flagged categories (AI) + author + strikes -->
      <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; align-items: center;">
        {#if isReport}
          {#if item.reportReason}
            <span class="font-dmmono" style="font-size: 10px; font-weight: 500; color: var(--k-ink); background: var(--k-ochre); padding: 2px 8px; border-radius: var(--k-radius-sm); border: 1px solid var(--k-ink);">{$t[`admin.report.${item.reportReason}` as keyof typeof $t]}</span>
          {/if}
        {:else}
          {#each item.flaggedCategories as cat (cat)}
            <AdmCatChip catKey={cat} score={item.scores?.[cat] ?? 0} />
          {/each}
        {/if}
        <span style="font-size: 11.5px; color: var(--k-ink-soft); display: inline-flex; align-items: center; gap: 5px; margin-left: auto;">
          {item.authorName ?? item.authorId} <AdmStrikeDots n={item.authorStrikes} size={6} />
        </span>
      </div>
    </div>
  </div>

  <!-- 48px 3-button triage grid -->
  <div
    style="
      display: grid; grid-template-columns: 1fr 1fr 1fr; border-top: 1px dashed var(--k-rule);
      opacity: {busy ? 0.55 : 1}; pointer-events: {busy ? 'none' : 'auto'};
    "
  >
    <button
      type="button"
      disabled={busy}
      onclick={() => onApprove(item)}
      class="font-bricolage"
      style="min-height: 48px; background: transparent; border: none; border-right: 1px dashed var(--k-rule); font-size: 13px; font-weight: 700; color: var(--k-success); cursor: {busy ? 'not-allowed' : 'pointer'};"
    >✓ {$t['admin.mobile.act.ok']}</button>
    <button
      type="button"
      disabled={busy}
      onclick={() => onWarn(item)}
      class="font-bricolage"
      style="min-height: 48px; background: transparent; border: none; border-right: 1px dashed var(--k-rule); font-size: 13px; font-weight: 700; color: var(--k-warn); cursor: {busy ? 'not-allowed' : 'pointer'};"
    >⚠ {$t['admin.mobile.act.warn']}</button>
    <button
      type="button"
      disabled={busy}
      onclick={() => onReject(item)}
      class="font-bricolage"
      style="min-height: 48px; background: transparent; border: none; font-size: 13px; font-weight: 700; color: var(--k-danger); cursor: {busy ? 'not-allowed' : 'pointer'};"
    >✕ {$t['admin.mobile.act.reject']}</button>
  </div>

  {#if actioningLabel}
    <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;">
      <span class="adm-action-pending font-dmmono" style="font-size: 10.5px; font-weight: 600; background: var(--k-paper-warm); border: var(--k-border-ink); border-radius: var(--k-radius-pill); padding: 5px 13px;">{actioningLabel}</span>
    </div>
  {/if}
</article>
