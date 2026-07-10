<script lang="ts">
  /**
   * Bulk-reject "Folgen-Vorschau" (NOVEL §02) — the design's second novel
   * guard, mirroring the Ban-Bremse discipline from AdmRejectModal.svelte:
   * "Sperren passiert nie beiläufig." Shows the per-author strike deltas
   * for the WHOLE selection BEFORE confirming, and if any of those deltas
   * produces a ban, the confirm CTA stays disabled until the admin ticks
   * an explicit acknowledgment checkbox. Transcribed from
   * design/handoffs/design_handoff_admin/jsx/kiosk-admin-flows.jsx:220-269
   * (AdmBulkPreview) — DE-only copy contract, same as AdmRejectModal.
   *
   * `items` MUST be in the same order the caller will POST as
   * `flaggedContentIds` — `computeBulkDeltas` (src/lib/adminModeration.ts)
   * does sequential per-author summation that mirrors the API's own
   * sequential processing, so a mismatched order here would show deltas
   * that don't match what the server actually does.
   *
   * The confirm button is a bespoke <button> (not AdmActionBtn) so it can
   * match the design's exact disabled treatment — opacity 0.4 / not-allowed
   * — rather than AdmActionBtn's baked-in 0.5. AdmActionBtn's danger
   * variant already ships 0.5 for the single-item reject/Ban-Bremse CTAs
   * (approved in Task 5/6 review); changing that default would silently
   * change those, so the bulk CTA is styled locally instead.
   */
  import { t, tStr } from '../../../lib/kiosk-i18n';
  import { computeBulkDeltas, type FlaggedItem } from '../../../lib/adminModeration';
  import AdmModalShell from './AdmModalShell.svelte';
  import AdmStrikeDots from './AdmStrikeDots.svelte';
  import AdmActionBtn from './AdmActionBtn.svelte';
  import AdmCheckbox from './AdmCheckbox.svelte';

  let {
    items,
    onCancel,
    onConfirm,
  }: {
    items: FlaggedItem[];
    onCancel: () => void;
    onConfirm: (reason: string) => void;
  } = $props();

  const n = $derived(items.length);
  const rows = $derived(computeBulkDeltas(items));
  const banCount = $derived(rows.filter((r) => r.ban).length);

  let reason = $state('');
  let acked = $state(false);

  const canSubmit = $derived(reason.trim().length > 0 && (banCount === 0 || acked));

  function handleConfirm() {
    if (!canSubmit) return;
    onConfirm(reason.trim());
  }
</script>

<AdmModalShell accent="var(--k-danger)" width={620} onClose={onCancel}>
  <!-- ── Head: kicker + title (page accent, not the danger accent) ── -->
  <div style="margin-bottom: 16px;">
    <div class="font-dmmono" style="font-size: 10px; letter-spacing: 0.14em; color: var(--k-accent);">
      {tStr($t['admin.modal.bulk.kicker'], { n })}
    </div>
    <h2 class="font-bricolage" style="margin: 6px 0 0; font-size: 26px; font-weight: 800; letter-spacing: -0.025em; line-height: 1.05;">
      {$t['admin.modal.bulk.title']}
      <span class="font-instrument" style="font-style: italic; font-weight: 400; color: var(--k-accent);">
        {$t['admin.modal.bulk.titleAccent']}
      </span>
    </h2>
  </div>

  <!-- ── Gemeinsamer Grund (required, applies to the whole selection) ── -->
  <div style="margin-bottom: 14px;">
    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 5px;">
      <label for="adm-bulk-reason" class="font-dmmono" style="font-size: 10.5px; letter-spacing: 0.1em; color: var(--k-ink-soft); text-transform: uppercase;">
        {$t['admin.modal.bulk.reasonLabel']} <span style="color: var(--k-danger);">*</span>
      </label>
      <span class="font-dmmono" style="font-size: 9.5px; color: var(--k-ink-mute);">{tStr($t['admin.modal.bulk.reasonHint'], { n })}</span>
    </div>
    <textarea
      id="adm-bulk-reason"
      bind:value={reason}
      maxlength="500"
      rows="2"
      class="font-bricolage"
      style="width: 100%; box-sizing: border-box; background: var(--k-paper-soft); border: {reason ? '1.5px solid var(--k-ink)' : '1px solid var(--k-rule)'}; border-radius: var(--k-radius-md); padding: 9px 12px; font-size: 13px; line-height: 1.5; color: var(--k-ink); resize: vertical;"
    ></textarea>
  </div>

  <!-- ── FOLGEN FÜR DIE STRIKE-KONTEN ── -->
  <div class="font-dmmono" style="font-size: 10px; letter-spacing: 0.12em; color: var(--k-ink-mute); margin: 4px 0 6px;">
    {$t['admin.modal.bulk.consequencesTitle']}
  </div>
  <div style="border: var(--k-border-ink); border-radius: var(--k-radius-md); overflow: hidden; background: var(--k-paper); margin-bottom: 14px;">
    {#each rows as r, i (r.id)}
      <div
        style="
          display: flex; align-items: center; gap: 12px; padding: 10px 14px;
          border-bottom: {i < rows.length - 1 ? '1px dashed var(--k-rule)' : 'none'};
          background: {r.ban ? 'rgba(168,50,69,0.08)' : 'transparent'};
        "
      >
        <div style="flex: 1;">
          <div style="font-size: 12.5px; font-weight: 700; letter-spacing: -0.01em;">{r.title}</div>
          <div class="font-dmmono" style="font-size: 10px; color: var(--k-ink-mute); margin-top: 2px;">{r.author}{r.note ? ` · ${r.note}` : ''}</div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; white-space: nowrap;">
          <AdmStrikeDots n={r.from} size={7} />
          <span class="font-dmmono" style="font-size: 10px; color: var(--k-ink-mute);">→</span>
          <AdmStrikeDots n={r.to} size={7} />
          {#if r.ban}
            <span class="font-dmmono" style="font-size: 9.5px; font-weight: 600; color: var(--k-paper); background: var(--k-danger); padding: 2px 8px; border-radius: var(--k-radius-sm); border: 1px solid var(--k-ink);">{$t['admin.modal.bulk.banBadge']}</span>
          {/if}
        </div>
      </div>
    {/each}
  </div>

  {#if banCount > 0}
    <!-- ── Ban-Bremse-style acknowledgment: gates the CTA ── -->
    <div style="display: flex; align-items: flex-start; gap: 10px; background: rgba(168,50,69,0.08); border: 1.5px solid var(--k-danger); border-radius: var(--k-radius-md); padding: 11px 14px; margin-bottom: 18px;">
      <AdmCheckbox checked={acked} onclick={() => (acked = !acked)} />
      <div style="font-size: 12.5px; line-height: 1.45;">
        <b>{tStr($t['admin.modal.bulk.ackLead'], { n: banCount })}</b>
        {$t['admin.modal.bulk.ackBody']}
      </div>
    </div>
  {/if}

  <div style="display: flex; gap: 10px; justify-content: flex-end; align-items: center;">
    <span class="font-dmmono" style="font-size: 10px; color: var(--k-ink-mute); margin-right: auto;">{$t['admin.modal.bulk.footnote']}</span>
    <AdmActionBtn variant="outline" onclick={onCancel}>{$t['admin.modal.cancel']}</AdmActionBtn>
    <button
      type="button"
      disabled={!canSubmit}
      onclick={canSubmit ? handleConfirm : undefined}
      class="font-bricolage"
      style="
        background: var(--k-danger); color: var(--k-paper); border: 1.5px solid var(--k-ink);
        border-radius: var(--k-radius-pill); padding: 8px 16px; font-size: 13px; font-weight: 700;
        opacity: {canSubmit ? 1 : 0.4}; cursor: {canSubmit ? 'pointer' : 'not-allowed'};
      "
    >{tStr($t['admin.modal.bulk.cta'], { n })}</button>
  </div>
</AdmModalShell>
