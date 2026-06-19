<script lang="ts">
  let { label }: { label: string } = $props();
</script>

<div class="flex items-center" style="gap:12px; margin:10px 0 4px;">
  <div class="flex-1" style="height:1px; border-top:1px dashed var(--k-rule);"></div>
  <span
    class="font-dmmono uppercase"
    style="font-size:10px; font-weight:700; color:var(--k-ink-mute); letter-spacing:0.18em;"
  >{label}</span>
  <div class="flex-1" style="height:1px; border-top:1px dashed var(--k-rule);"></div>
</div>
