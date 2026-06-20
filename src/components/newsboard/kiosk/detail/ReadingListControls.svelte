<script lang="ts">
  import { t } from '../../../../lib/kiosk-i18n';
  import SaveToggle from '../primitives/SaveToggle.svelte';

  let {
    saved = false,
    canSave = false,
    onSave = () => {},
  }: { saved?: boolean; canSave?: boolean; onSave?: () => void } = $props();
</script>

<div class="flex flex-col" style="gap:8px; padding:14px; background:var(--k-paper-soft);
     border:1px solid var(--k-rule); border-radius:var(--k-radius-md);">
  <div class="font-dmmono uppercase" style="font-size:10px; color:var(--k-ink-mute); letter-spacing:0.12em;">
    {$t['news.readinglist.heading']}
  </div>
  {#if canSave}
    <button type="button" onclick={onSave}
      class="flex items-center font-bricolage" style="gap:8px; padding:8px 10px; font-size:13px; font-weight:600;
        background:{saved ? 'var(--k-ink)' : 'transparent'}; color:{saved ? 'var(--k-paper)' : 'var(--k-ink)'};
        border:var(--k-border-ink); border-radius:var(--k-radius-sm); text-align:left; cursor:pointer;">
      <span>{saved ? '■' : '□'}</span>
      {saved ? $t['news.readinglist.saved'] : $t['news.readinglist.save']}
    </button>
  {/if}
  <!-- Mark-as-read: Phase 3 (needs read-state). Rendered disabled. -->
  <button type="button" disabled title={$t['news.readinglist.markreadSoon']}
    class="flex items-center font-bricolage opacity-50 cursor-not-allowed" style="gap:8px; padding:8px 10px;
      font-size:13px; background:transparent; color:var(--k-ink-soft);
      border:1px dashed var(--k-rule); border-radius:var(--k-radius-sm); text-align:left;">
    <span>○</span>{$t['news.readinglist.markread']}
  </button>
</div>
