<script lang="ts">
  /**
   * Full queue card anatomy — header (checkbox/strap/type/author/strikes/
   * time), body (title/body/images), flags block (report/relevance/category
   * chips), action row (approve/warn/reject or dismiss/addWarn/remove for
   * reports). Transcribed from
   * design/handoffs/design_handoff_admin/jsx/kiosk-admin.jsx:349-433.
   *
   * Urgent treatment: 2px danger border + paper-warm bg + danger print
   * shadow (the pulsing strap itself is handled by AdmSourceStrap's
   * `adm-strap-urgent` class). Optimistic overlay: `actioningLabel` dims the
   * card + shows a centered pending pill; `settling` plays the settle-out
   * animation on API success just before the parent removes the item.
   *
   * Note: the JSX seed data included a per-item `context` string for
   * comments ("Kommentar zu: „…“"). The real `FlaggedItem`/`FlaggedContent`
   * shape (src/lib/adminModeration.ts) does not carry that field — comment
   * flags only store `parentPostId`/`parentCollection` (ObjectId refs, no
   * joined title) — so that context line is intentionally omitted here
   * rather than fabricated. Comments still render distinctly via the
   * serif-italic quoted body treatment below.
   */
  import { t, locale } from '../../../lib/kiosk-i18n';
  import { isUrgent, type FlaggedItem } from '../../../lib/adminModeration';
  import { optimizeCloudinary } from '../../../utils/cloudinary';
  import AdmCheckbox from './AdmCheckbox.svelte';
  import AdmSourceStrap from './AdmSourceStrap.svelte';
  import AdmTypeChip from './AdmTypeChip.svelte';
  import AdmStrikeDots from './AdmStrikeDots.svelte';
  import AdmCatChip from './AdmCatChip.svelte';
  import AdmActionBtn from './AdmActionBtn.svelte';

  let {
    item,
    selected = false,
    onToggleSelect,
    onApprove,
    onWarn,
    onReject,
    actioningLabel = null,
    settling = false,
  }: {
    item: FlaggedItem;
    selected?: boolean;
    onToggleSelect: () => void;
    onApprove: (item: FlaggedItem) => void;
    onWarn: (item: FlaggedItem) => void;
    onReject: (item: FlaggedItem) => void;
    actioningLabel?: string | null;
    settling?: boolean;
  } = $props();

  const urgent = $derived(isUrgent(item));
  const isReport = $derived(item.source === 'user_report');
  const isNews = $derived(item.contentType === 'news');
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
    border: {urgent ? '2px solid var(--k-danger)' : selected ? '2px solid var(--k-accent)' : 'var(--k-border-ink)'};
    border-radius: var(--k-radius-lg);
    box-shadow: {urgent ? '3px 3px 0 var(--k-danger)' : selected ? '3px 3px 0 var(--k-accent)' : '2px 2px 0 var(--k-ink)'};
  "
>
  <div style="opacity: {busy ? 0.55 : 1}; pointer-events: {busy ? 'none' : 'auto'};">
    <!-- header -->
    <div style="display: flex; align-items: center; gap: 10px; padding: 12px 18px; border-bottom: 1px dashed var(--k-rule); flex-wrap: wrap;">
      <AdmCheckbox checked={selected} onclick={onToggleSelect} />
      <AdmSourceStrap {item} />
      <AdmTypeChip type={item.contentType} />
      <span style="font-size: 13px; color: var(--k-ink-soft); display: inline-flex; align-items: center; gap: 7px;">
        {$t['admin.card.by']} <b>{item.authorName ?? item.authorId}</b>
        <AdmStrikeDots n={item.authorStrikes} />
      </span>
      <span class="font-dmmono" style="font-size: 11px; color: var(--k-ink-mute); margin-left: auto;">{formatTime(item.createdAt)}</span>
    </div>

    <!-- body -->
    <div style="padding: 14px 18px 12px;">
      {#if item.title}
        <h3 class="font-bricolage" style="margin: 0 0 6px; font-size: 19px; font-weight: 700; letter-spacing: -0.015em; color: var(--k-ink);">{item.title}</h3>
      {/if}
      {#if item.body}
        <p
          class={isComment ? 'font-instrument' : 'font-bricolage'}
          style="margin: 0; font-size: 13.5px; line-height: 1.55; color: var(--k-ink-soft); font-style: {isComment ? 'italic' : 'normal'};"
        >{isComment ? `„${item.body}“` : item.body}</p>
      {/if}
      {#if item.imageUrls?.length}
        <div style="display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap;">
          {#each item.imageUrls as url (url)}
            <div class="adm-img-wrap" style="width: 84px; height: 84px; border-radius: var(--k-radius-sm); border: var(--k-border-ink); overflow: hidden; position: relative;">
              <img src={optimizeCloudinary(url)} alt="" class="adm-img" style="width: 100%; height: 100%; object-fit: cover; filter: blur(6px); transition: filter 150ms;" />
              <div class="adm-img-overlay" style="position: absolute; inset: 0; background: rgba(243,234,216,0.45); display: flex; align-items: center; justify-content: center; font-family: var(--k-font-mono); font-size: 9px; color: var(--k-ink-mute); text-align: center; padding: 4px; transition: opacity 150ms;">{$t['admin.card.imgBlur']}</div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- flags / report block -->
    <div style="padding: 0 18px 14px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
      {#if isReport}
        <div style="width: 100%;">
          <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            <span class="font-dmmono" style="font-size: 10px; color: var(--k-ink-mute); letter-spacing: 0.08em;">{$t['admin.card.reportedFor']}</span>
            {#if item.reportReason}
              <span class="font-dmmono" style="font-size: 10.5px; font-weight: 500; color: var(--k-ink); background: var(--k-ochre); padding: 3px 9px; border-radius: var(--k-radius-sm); border: 1px solid var(--k-ink);">{$t[`admin.report.${item.reportReason}` as keyof typeof $t]}</span>
            {/if}
            <span class="font-dmmono" style="font-size: 10.5px; color: var(--k-ink-mute);">
              {$t['admin.card.by']} {item.reporterName ?? ''}{item.reportCount && item.reportCount > 1 ? ` + ${item.reportCount - 1} ${$t['admin.card.more']}` : ''}
            </span>
          </div>
          {#if item.reportDetails}
            <blockquote class="font-instrument" style="margin: 8px 0 0; padding: 8px 12px; background: var(--k-paper-soft); border-radius: var(--k-radius-sm); border: 1px solid var(--k-rule); font-style: italic; font-size: 13px; color: var(--k-ink-soft);">„{item.reportDetails}“</blockquote>
          {/if}
        </div>
      {:else if isNews && typeof item.scores?.relevance === 'number'}
        <span style="display: inline-flex; align-items: baseline; gap: 6px; font-family: var(--k-font-mono); font-size: 10.5px; color: var(--k-info); background: var(--k-paper-warm); padding: 3px 9px; border-radius: var(--k-radius-sm); border: 1px solid var(--k-info);">
          {$t['admin.card.relevance']} <b style="font-size: 11px;">{Math.round(item.scores.relevance)}/100</b>
        </span>
      {:else if item.flaggedCategories.length > 0}
        <span class="font-dmmono" style="font-size: 10px; color: var(--k-ink-mute); letter-spacing: 0.08em;">{$t['admin.card.flaggedAs']}</span>
        {#each item.flaggedCategories as cat (cat)}
          <AdmCatChip catKey={cat} score={item.scores?.[cat] ?? 0} />
        {/each}
      {/if}
    </div>
  </div>

  <!-- actions -->
  <div style="padding: 12px 18px; background: var(--k-paper-soft); border-top: 1px dashed var(--k-rule); display: flex; gap: 10px; align-items: center; flex-wrap: wrap; opacity: {busy ? 0.55 : 1}; pointer-events: {busy ? 'none' : 'auto'};">
    {#if isReport}
      <AdmActionBtn variant="approve" disabled={busy} onclick={() => onApprove(item)}>✓ {$t['admin.act.dismiss']}</AdmActionBtn>
      <AdmActionBtn variant="warn" disabled={busy} onclick={() => onWarn(item)}>⚠ {$t['admin.act.addWarn']}</AdmActionBtn>
      <AdmActionBtn variant="danger" disabled={busy} onclick={() => onReject(item)}>✕ {$t['admin.act.remove']}</AdmActionBtn>
    {:else}
      <AdmActionBtn variant="approve" disabled={busy} onclick={() => onApprove(item)}>✓ {$t['admin.act.approve']}</AdmActionBtn>
      <AdmActionBtn variant="warn" disabled={busy} onclick={() => onWarn(item)}>⚠ {$t['admin.act.warn']}</AdmActionBtn>
      <AdmActionBtn variant="danger" disabled={busy} onclick={() => onReject(item)}>✕ {$t['admin.act.reject']}</AdmActionBtn>
    {/if}
    {#if item.authorStrikes === 2}
      <span class="font-dmmono" style="margin-left: auto; font-size: 10.5px; font-weight: 600; color: var(--k-danger); display: inline-flex; align-items: center; gap: 6px;">
        <AdmStrikeDots n={2} /> {$t['admin.card.banFlag']}
      </span>
    {/if}
  </div>

  {#if actioningLabel}
    <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;">
      <span class="adm-action-pending font-dmmono" style="font-size: 10.5px; font-weight: 600; background: var(--k-paper-warm); border: var(--k-border-ink); border-radius: var(--k-radius-pill); padding: 5px 13px;">{actioningLabel}</span>
    </div>
  {/if}
</article>

<style>
  .adm-img-wrap:hover .adm-img {
    filter: none;
  }
  .adm-img-wrap:hover .adm-img-overlay {
    opacity: 0;
    pointer-events: none;
  }
</style>
