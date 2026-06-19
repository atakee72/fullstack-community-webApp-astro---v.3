<script lang="ts">
  import { t } from '../../../../lib/kiosk-i18n';
  import KioskBtn from '../../../forum/kiosk/KioskBtn.svelte';
  let { onRetry = () => {} }: { onRetry?: () => void } = $props();
</script>

<div style="padding:24px 36px;">
  <div style="padding:16px; border:1.5px solid var(--k-danger); background:var(--k-paper-soft); border-radius:var(--k-radius-md);">
    <div class="font-dmmono" style="font-size:10px; color:var(--k-danger); letter-spacing:0.12em; margin-bottom:6px;">
      ⚠ {$t['news.state.error.kicker']}
    </div>
    <div class="font-bricolage" style="font-size:14px; font-weight:700; margin-bottom:6px;">{$t['news.state.error.title']}</div>
    <div class="font-instrument italic" style="font-size:12px; color:var(--k-ink-soft); line-height:1.4; margin-bottom:10px;">
      {$t['news.state.error.body']}
    </div>
    <KioskBtn size="sm" onclick={onRetry}>{$t['news.state.error.retry']}</KioskBtn>
  </div>
</div>
