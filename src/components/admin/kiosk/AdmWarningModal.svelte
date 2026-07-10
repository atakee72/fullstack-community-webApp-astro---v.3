<script lang="ts">
  /**
   * Warning modal — "Freigeben mit Hinweis" (§7.3 / NOVEL §03, live label
   * preview). Transcribed from
   * design/handoffs/design_handoff_admin/jsx/kiosk-admin-flows.jsx:187-215.
   *
   * Sibling to AdmRejectModal.svelte: same AdmModalShell scaffold, same
   * inline case-summary block (not extracted — only this + the reject modal
   * consume that shape). Simpler than reject: no Ban-Bremse branch, single
   * required field, and a live preview card that mirrors exactly how the
   * ochre warning strap renders on the approved content afterward.
   *
   * `warningText` stays local `$state` and is passed straight to
   * `onConfirm` — ModerationApp's `handleWarnConfirm` calls
   * `runSingleAction(id, 'approve_with_warning', { warningText })`, which
   * owns the optimistic dim/settle + toast, same division of labor as the
   * reject flow.
   */
  import { t, locale } from '../../../lib/kiosk-i18n';
  import type { FlaggedItem } from '../../../lib/adminModeration';
  import AdmModalShell from './AdmModalShell.svelte';
  import AdmSourceStrap from './AdmSourceStrap.svelte';
  import AdmTypeChip from './AdmTypeChip.svelte';
  import AdmStrikeDots from './AdmStrikeDots.svelte';
  import AdmActionBtn from './AdmActionBtn.svelte';

  let {
    item,
    onCancel,
    onConfirm,
  }: {
    item: FlaggedItem;
    onCancel: () => void;
    onConfirm: (warningText: string) => void;
  } = $props();

  const authorLabel = $derived(item.authorName ?? item.authorId);

  let warningText = $state('');

  const canSubmit = $derived(warningText.trim().length > 0);

  function formatCardTime(iso: string): string {
    const d = new Date(iso);
    const loc = $locale === 'de' ? 'de-DE' : 'en-GB';
    const datePart = d.toLocaleDateString(loc, { day: '2-digit', month: '2-digit' });
    const timePart = d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' });
    return `${datePart} · ${timePart}`;
  }

  const currentCaseTitle = $derived(
    item.title || (item.body ? `„${item.body.slice(0, 76)}…“` : (($t as Record<string, string>)[`admin.type.${item.contentType}`] ?? item.contentType))
  );

  function handleConfirm() {
    if (!canSubmit) return;
    onConfirm(warningText.trim());
  }
</script>

<AdmModalShell accent="var(--k-warn)" width={560} onClose={onCancel}>
  <!-- ── Head: kicker + title (page accent, not the warn accent) ── -->
  <div style="margin-bottom: 16px;">
    <div class="font-dmmono" style="font-size: 10px; letter-spacing: 0.14em; color: var(--k-accent);">
      {$t['admin.modal.warn.kicker']}
    </div>
    <h2 class="font-bricolage" style="margin: 6px 0 0; font-size: 26px; font-weight: 800; letter-spacing: -0.025em; line-height: 1.05;">
      {$t['admin.modal.warn.title']}
      <span class="font-instrument" style="font-style: italic; font-weight: 400; color: var(--k-accent);">
        {$t['admin.modal.warn.titleAccent']}
      </span>
    </h2>
  </div>

  <!-- ── Case summary ── -->
  <div style="background: var(--k-paper); border: 1px solid var(--k-rule); border-radius: var(--k-radius-md); padding: 10px 14px; margin-bottom: 16px;">
    <div style="display: flex; gap: 7px; align-items: center; flex-wrap: wrap;">
      <AdmSourceStrap {item} />
      <AdmTypeChip type={item.contentType} />
      <span class="font-dmmono" style="font-size: 10.5px; color: var(--k-ink-mute); margin-left: auto;">{formatCardTime(item.createdAt)}</span>
    </div>
    <div class="font-bricolage" style="font-size: 13.5px; font-weight: 700; margin-top: 7px; letter-spacing: -0.01em;">
      {currentCaseTitle}
    </div>
    <div style="font-size: 11.5px; color: var(--k-ink-soft); margin-top: 3px; display: flex; align-items: center; gap: 7px;">
      {$t['admin.card.by']} <b>{authorLabel}</b> <AdmStrikeDots n={item.authorStrikes} size={6} />
    </div>
  </div>

  <!-- ── Hinweistext (required) ── -->
  <div style="margin-bottom: 14px;">
    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 5px;">
      <label for="adm-warn-text" class="font-dmmono" style="font-size: 10.5px; letter-spacing: 0.1em; color: var(--k-ink-soft); text-transform: uppercase;">
        {$t['admin.modal.warn.textLabel']} <span style="color: var(--k-warn);">*</span>
      </label>
      <span class="font-dmmono" style="font-size: 9.5px; color: var(--k-ink-mute);">{$t['admin.modal.warn.textHint']}</span>
    </div>
    <textarea
      id="adm-warn-text"
      bind:value={warningText}
      maxlength="200"
      rows="3"
      class="font-bricolage"
      style="width: 100%; box-sizing: border-box; background: var(--k-paper-soft); border: {warningText ? '1.5px solid var(--k-ink)' : '1px solid var(--k-rule)'}; border-radius: var(--k-radius-md); padding: 9px 12px; font-size: 13px; line-height: 1.5; color: var(--k-ink); resize: vertical;"
    ></textarea>
    <div style="display: flex; justify-content: flex-end; margin-top: 4px;">
      <span class="font-dmmono" style="font-size: 9.5px; color: var(--k-ink-mute);">{warningText.length}/200</span>
    </div>
  </div>

  <!-- ── Live preview: exactly how the ochre label sits on the card ── -->
  <div class="font-dmmono" style="font-size: 10px; letter-spacing: 0.12em; color: var(--k-ink-mute); margin-bottom: 6px;">
    {$t['admin.modal.warn.previewLabel']}
  </div>
  <div style="background: var(--k-paper); border: var(--k-border-ink); border-radius: var(--k-radius-md); padding: 12px 14px; margin-bottom: 18px;">
    <div class="font-dmmono" style="display: inline-flex; align-items: center; gap: 7px; background: var(--k-ochre); border: 1px solid var(--k-ink); border-radius: var(--k-radius-sm); padding: 4px 10px; font-size: 10px; font-weight: 500; margin-bottom: 8px;">
      {$t['admin.modal.warn.previewStrap']}
    </div>
    <div class="font-instrument" style="font-size: 12px; font-style: italic; color: var(--k-ink-soft); line-height: 1.5;">
      {warningText || $t['admin.modal.warn.previewPlaceholder']}
    </div>
    <div class="font-bricolage" style="font-size: 13.5px; font-weight: 700; margin-top: 9px; opacity: 0.55;">
      {currentCaseTitle}
    </div>
  </div>

  <div style="display: flex; gap: 10px; justify-content: flex-end;">
    <AdmActionBtn variant="outline" onclick={onCancel}>{$t['admin.modal.cancel']}</AdmActionBtn>
    <AdmActionBtn variant="warn" disabled={!canSubmit} onclick={handleConfirm}>
      {$t['admin.modal.warn.cta']}
    </AdmActionBtn>
  </div>
</AdmModalShell>
