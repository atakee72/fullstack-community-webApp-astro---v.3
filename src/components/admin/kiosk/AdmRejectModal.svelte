<script lang="ts">
  /**
   * Reject modal — normal mode (§7.1) + Ban-Bremse escalation (NOVEL §01,
   * 3rd-strike guard). Transcribed from
   * design/handoffs/design_handoff_admin/jsx/kiosk-admin-flows.jsx:100-182.
   *
   * Ban-Bremse is the design's central guard: "Sperren passiert nie
   * beiläufig" (READMEFIRST.md non-negotiables) — a ban may only ever
   * happen after the admin explicitly reads the strike ledger AND ticks
   * the danger-tinted confirmation checkbox. The CTA stays disabled
   * (opacity 0.4 / not-allowed via AdmActionBtn's disabled styling) until
   * both the reason and (in Ban-Bremse mode) the checkbox are satisfied —
   * this is enforced purely client-side in `canSubmit`; the server still
   * owns the actual strike/ban decision in `reviewAction.ts`, this modal
   * only gates the UI action that triggers it.
   *
   * Case-summary block + AdmModalHead-equivalent markup are written
   * inline here rather than extracted to their own files — the brief's
   * file list for this task is AdmModalShell + AdmRejectModal only, and
   * the head/case-summary shapes are only consumed by this one modal (the
   * queue card already has its own header markup in AdmQueueCard.svelte).
   */
  import { onMount } from 'svelte';
  import { t, tStr, locale } from '../../../lib/kiosk-i18n';
  import type { FlaggedItem } from '../../../lib/adminModeration';
  import AdmModalShell from './AdmModalShell.svelte';
  import AdmSourceStrap from './AdmSourceStrap.svelte';
  import AdmTypeChip from './AdmTypeChip.svelte';
  import AdmStrikeDots from './AdmStrikeDots.svelte';
  import AdmActionBtn from './AdmActionBtn.svelte';
  import AdmCheckbox from './AdmCheckbox.svelte';

  let {
    item,
    onCancel,
    onConfirm,
  }: {
    item: FlaggedItem;
    onCancel: () => void;
    onConfirm: (reason: string, notes: string) => void;
  } = $props();

  const isBanBremse = $derived(item.authorStrikes >= 2);
  const newStrikeN = $derived(Math.min(item.authorStrikes + 1, 3));
  const authorLabel = $derived(item.authorName ?? item.authorId);

  let reason = $state('');
  let notes = $state('');
  let checked = $state(false);

  const canSubmit = $derived(reason.trim().length > 0 && (!isBanBremse || checked));

  // ── Ban-Bremse ledger fetch (Task 2 API) ────────────────────────────────
  type LedgerEntry = { date: string; contentType: string; reason: string; title: string | null };
  let ledger = $state<LedgerEntry[] | null>(null);
  let ledgerError = $state(false);
  let ledgerLoading = $state(false);

  onMount(() => {
    if (!isBanBremse) return;
    void fetchLedger();
  });

  async function fetchLedger() {
    ledgerLoading = true;
    ledgerError = false;
    try {
      const res = await fetch(`/api/admin/moderation/author-strikes?authorId=${encodeURIComponent(item.authorId)}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      ledger = Array.isArray(json.history) ? json.history : [];
    } catch {
      ledgerError = true;
      ledger = null;
    } finally {
      ledgerLoading = false;
    }
  }

  // API returns newest-first (max 10); the ledger card reads oldest → newest
  // so roundel numbers count up toward "this case" (the design's ordering).
  const orderedHistory = $derived(ledger ? [...ledger].reverse() : []);

  function formatCardTime(iso: string): string {
    const d = new Date(iso);
    const loc = $locale === 'de' ? 'de-DE' : 'en-GB';
    const datePart = d.toLocaleDateString(loc, { day: '2-digit', month: '2-digit' });
    const timePart = d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' });
    return `${datePart} · ${timePart}`;
  }

  function formatLedgerDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}.${mm}.${d.getFullYear()}`;
  }

  function ledgerTitle(entry: LedgerEntry): string {
    return entry.title ?? (($t as Record<string, string>)[`admin.type.${entry.contentType}`] ?? entry.contentType);
  }

  const currentCaseTitle = $derived(
    item.title || (item.body ? `„${item.body.slice(0, 76)}…“` : (($t as Record<string, string>)[`admin.type.${item.contentType}`] ?? item.contentType))
  );

  function handleConfirm() {
    if (!canSubmit) return;
    onConfirm(reason.trim(), notes.trim());
  }
</script>

<AdmModalShell accent="var(--k-danger)" width={isBanBremse ? 600 : 560} onClose={onCancel}>
  {#if isBanBremse}
    <div
      class="font-dmmono"
      style="position: absolute; top: -14px; left: 24px; background: var(--k-danger); color: var(--k-paper); font-size: 10px; letter-spacing: 0.12em; padding: 4px 12px; border-radius: var(--k-radius-sm); border: var(--k-border-ink); box-shadow: 2px 2px 0 var(--k-ink);"
    >{$t['admin.modal.ban.badge']}</div>
  {/if}

  <!-- ── Head: kicker + title (page accent, not the danger accent) ── -->
  <div style="margin-bottom: 16px;">
    <div class="font-dmmono" style="font-size: 10px; letter-spacing: 0.14em; color: var(--k-accent);">
      {isBanBremse ? $t['admin.modal.ban.kicker'] : $t['admin.modal.reject.kicker']}
    </div>
    <h2 class="font-bricolage" style="margin: 6px 0 0; font-size: 26px; font-weight: 800; letter-spacing: -0.025em; line-height: 1.05;">
      {isBanBremse ? $t['admin.modal.ban.title'] : $t['admin.modal.reject.title']}
      <span class="font-instrument" style="font-style: italic; font-weight: 400; color: var(--k-accent);">
        {isBanBremse ? $t['admin.modal.ban.titleAccent'] : $t['admin.modal.reject.titleAccent']}
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

  <!-- ── Ban-Bremse: inline strike ledger ── -->
  {#if isBanBremse}
    <div style="border: var(--k-border-ink); border-radius: var(--k-radius-md); overflow: hidden; margin-bottom: 14px; background: var(--k-paper);">
      <div class="font-dmmono" style="padding: 8px 14px; border-bottom: 1px dashed var(--k-rule); font-size: 10px; letter-spacing: 0.12em; color: var(--k-ink-mute); text-transform: uppercase;">
        {tStr($t['admin.modal.ban.ledgerTitle'], { author: authorLabel })}
      </div>

      {#if ledgerLoading}
        <div class="font-dmmono" style="padding: 12px 14px; font-size: 11px; color: var(--k-ink-mute);">…</div>
      {:else if ledgerError}
        <div class="font-dmmono" style="padding: 12px 14px; font-size: 11px; color: var(--k-danger);">{$t['admin.modal.ban.ledgerUnavailable']}</div>
      {:else}
        {#each orderedHistory as entry, i (i)}
          <div style="display: flex; align-items: center; gap: 12px; padding: 9px 14px; border-bottom: 1px dashed var(--k-rule);">
            <span class="font-dmmono" style="width: 22px; height: 22px; border-radius: 50%; background: var(--k-ink-mute); color: var(--k-paper); display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex: 0 0 22px;">{i + 1}</span>
            <div style="flex: 1;">
              <div style="font-size: 12.5px; font-weight: 700; letter-spacing: -0.01em;">{ledgerTitle(entry)}</div>
              <div class="font-dmmono" style="font-size: 10px; color: var(--k-ink-mute); margin-top: 2px;">{formatLedgerDate(entry.date)} · {entry.reason}</div>
            </div>
          </div>
        {/each}
      {/if}

      <!-- current case — always rendered, danger tint, "← DIESE" -->
      <div style="display: flex; align-items: center; gap: 12px; padding: 9px 14px; background: rgba(168,50,69,0.08);">
        <span class="font-dmmono" style="width: 22px; height: 22px; border-radius: 50%; background: var(--k-danger); color: var(--k-paper); display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex: 0 0 22px;">{orderedHistory.length + 1}</span>
        <div style="flex: 1;">
          <div style="font-size: 12.5px; font-weight: 700; letter-spacing: -0.01em;">{currentCaseTitle}</div>
          <div class="font-dmmono" style="font-size: 10px; color: var(--k-ink-mute); margin-top: 2px;">{$t['admin.modal.ban.ledgerToday']} · {reason.trim() || '—'}</div>
        </div>
        <span class="font-dmmono" style="font-size: 9.5px; font-weight: 600; color: var(--k-danger);">{$t['admin.modal.ban.ledgerNow']}</span>
      </div>
    </div>
  {/if}

  <!-- ── Grund der Ablehnung (required) ── -->
  <div style="margin-bottom: 14px;">
    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 5px;">
      <label for="adm-reject-reason" class="font-dmmono" style="font-size: 10.5px; letter-spacing: 0.1em; color: var(--k-ink-soft); text-transform: uppercase;">
        {$t['admin.modal.reject.reasonLabel']} <span style="color: var(--k-danger);">*</span>
      </label>
      <span class="font-dmmono" style="font-size: 9.5px; color: var(--k-ink-mute);">{$t['admin.modal.reject.reasonHint']}</span>
    </div>
    <textarea
      id="adm-reject-reason"
      bind:value={reason}
      maxlength="500"
      rows="3"
      class="font-bricolage"
      style="width: 100%; box-sizing: border-box; background: var(--k-paper-soft); border: {reason ? '1.5px solid var(--k-ink)' : '1px solid var(--k-rule)'}; border-radius: var(--k-radius-md); padding: 9px 12px; font-size: 13px; line-height: 1.5; color: var(--k-ink); resize: vertical;"
    ></textarea>
  </div>

  <!-- ── Interne Notiz (optional) ── -->
  <div style="margin-bottom: 14px;">
    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 5px;">
      <label for="adm-reject-notes" class="font-dmmono" style="font-size: 10.5px; letter-spacing: 0.1em; color: var(--k-ink-soft); text-transform: uppercase;">
        {$t['admin.modal.reject.notesLabel']}
      </label>
      <span class="font-dmmono" style="font-size: 9.5px; color: var(--k-ink-mute);">{$t['admin.modal.reject.notesHint']}</span>
    </div>
    <textarea
      id="adm-reject-notes"
      bind:value={notes}
      maxlength="1000"
      rows="2"
      placeholder={$t['admin.modal.reject.notesPlaceholder']}
      class="font-bricolage"
      style="width: 100%; box-sizing: border-box; background: var(--k-paper-soft); border: {notes ? '1.5px solid var(--k-ink)' : '1px solid var(--k-rule)'}; border-radius: var(--k-radius-md); padding: 9px 12px; font-size: 13px; line-height: 1.5; color: var(--k-ink); resize: vertical;"
    ></textarea>
  </div>

  {#if !isBanBremse}
    <!-- ── Strike consequence box (normal mode) ── -->
    <div style="background: rgba(200,136,30,0.08); border: 1.5px solid var(--k-warn); border-radius: var(--k-radius-md); padding: 10px 14px; margin-bottom: 18px; display: flex; align-items: center; gap: 12px;">
      <span style="display: inline-flex; gap: 3px; align-items: center;">
        {#each [0, 1, 2] as i (i)}
          <span
            class={i === newStrikeN - 1 ? 'adm-strike-new' : ''}
            style="width: 10px; height: 10px; border-radius: 50%; background: {i < newStrikeN ? 'var(--k-danger)' : 'transparent'}; border: 1.5px solid {i < newStrikeN ? 'var(--k-danger)' : 'var(--k-rule)'};"
          ></span>
        {/each}
      </span>
      <div style="font-size: 12.5px; line-height: 1.45;">
        <b>{tStr($t['admin.modal.reject.consequence'], { n: newStrikeN, author: authorLabel })}</b>
        {#if newStrikeN === 2}
          {$t['admin.modal.reject.consequenceNext']}
        {/if}
      </div>
    </div>
  {:else}
    <!-- ── Ban-Bremse: deliberate second step ── -->
    <div style="display: flex; align-items: flex-start; gap: 10px; background: rgba(168,50,69,0.08); border: 1.5px solid var(--k-danger); border-radius: var(--k-radius-md); padding: 11px 14px; margin-bottom: 18px;">
      <AdmCheckbox {checked} onclick={() => (checked = !checked)} />
      <div style="font-size: 12.5px; line-height: 1.45;">
        <b>{tStr($t['admin.modal.ban.checkboxLead'], { author: authorLabel })}</b>
        {$t['admin.modal.ban.checkboxBody']}
      </div>
    </div>
  {/if}

  <div style="display: flex; gap: 10px; justify-content: flex-end;">
    <AdmActionBtn variant="outline" onclick={onCancel}>{$t['admin.modal.cancel']}</AdmActionBtn>
    <AdmActionBtn variant="danger" disabled={!canSubmit} onclick={handleConfirm}>
      {isBanBremse ? $t['admin.modal.ban.cta'] : $t['admin.modal.reject.cta']}
    </AdmActionBtn>
  </div>
</AdmModalShell>
