<script lang="ts">
  import { t } from '../../../../lib/kiosk-i18n';
</script>

<div style="padding:20px 36px 40px;">
  {#each [0, 1, 2] as i (i)}
    <div style="margin-bottom:16px; opacity:{1 - i * 0.18};">
      <div class="flex" style="gap:6px; margin-bottom:6px;">
        <div style="width:40px; height:12px; background:var(--k-paper-soft); border-radius:3px;"></div>
        <div style="width:70px; height:12px; background:var(--k-paper-soft); border-radius:3px;"></div>
      </div>
      <div style="height:20px; background:var(--k-paper-soft); border-radius:3px; margin-bottom:6px; width:85%;"></div>
      <div style="height:20px; background:var(--k-paper-soft); border-radius:3px; margin-bottom:8px; width:60%;"></div>
      <div style="height:11px; background:var(--k-paper-soft); border-radius:3px; margin-bottom:4px; width:95%;"></div>
      <div style="height:11px; background:var(--k-paper-soft); border-radius:3px; width:70%;"></div>
    </div>
  {/each}
  <div class="font-dmmono text-center" style="font-size:10px; color:var(--k-ink-mute); letter-spacing:0.1em; margin-top:8px;">
    ↻ {$t['news.state.loading']}
  </div>
</div>
