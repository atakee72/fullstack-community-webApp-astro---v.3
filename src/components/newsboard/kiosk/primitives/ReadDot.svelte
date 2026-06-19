<script lang="ts">
  let { read = false }: { read?: boolean } = $props();
</script>

<span
  class="inline-block shrink-0"
  style="width:8px; height:8px; border-radius:50%;
         background:{read ? 'transparent' : 'var(--k-wine)'};
         border:1.5px solid {read ? 'var(--k-ink-mute)' : 'var(--k-wine)'};"
></span>
