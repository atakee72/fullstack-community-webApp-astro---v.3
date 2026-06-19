<script lang="ts">
  import { t } from '../../../../lib/kiosk-i18n';
  import KioskBtn from '../../../forum/kiosk/KioskBtn.svelte';
  let { onBack = () => {} }: { onBack?: () => void } = $props();
</script>

<div class="text-center" style="padding:46px 16px;">
  <div class="font-bricolage" style="font-size:56px; line-height:1; color:var(--k-ink-mute); margin-bottom:14px;">☐</div>
  <div class="font-bricolage" style="font-size:15px; font-weight:700; margin-bottom:6px;">{$t['news.state.emptySaved.title']}</div>
  <div class="font-instrument italic" style="font-size:12.5px; color:var(--k-ink-soft); line-height:1.45; max-width:28ch; margin:0 auto 14px;">
    {$t['news.state.emptySaved.body']}
  </div>
  <KioskBtn size="sm" variant="secondary" onclick={onBack}>{$t['news.state.emptySaved.cta']}</KioskBtn>
</div>
