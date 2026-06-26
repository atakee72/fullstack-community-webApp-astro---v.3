<script lang="ts">
  let {
    kind = 'warn',
    title,
    body = '',
    action = '',
    onaction = () => {},
  }: {
    kind?: 'warn' | 'danger' | 'success' | 'info';
    title: string; body?: string; action?: string; onaction?: () => void;
  } = $props();

  const map = {
    warn:    { bg: '#fbf1d8', bd: 'var(--k-warn)',    ic: '◐' },
    danger:  { bg: '#f7e2e2', bd: 'var(--k-danger)',  ic: '✕' },
    success: { bg: '#e7f0dd', bd: 'var(--k-success)', ic: '✓' },
    info:    { bg: '#dbeaee', bd: 'var(--k-info)',    ic: 'i' },
  } as const;
  const m = $derived(map[kind]);
</script>

<div class="flex" style="gap:11px; margin-top:18px; padding:12px 14px; background:{m.bg}; border:1.5px solid {m.bd}; border-radius:12px;">
  <span style="width:20px; height:20px; flex-shrink:0; border-radius:50%; background:{m.bd}; color:var(--k-paper); display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; margin-top:1px;">{m.ic}</span>
  <div>
    <div class="font-bricolage" style="font-weight:700; font-size:13.5px; color:var(--k-ink);">{title}</div>
    {#if body}
      <div class="font-bricolage" style="font-size:12.5px; color:var(--k-ink-soft); line-height:1.45; margin-top:2px;">{body}</div>
    {/if}
    {#if action}
      <div style="margin-top:7px;">
        <button type="button" class="font-dmmono" style="font-size:11px; color:var(--k-ink); font-weight:600; background:none; border:none; border-bottom:2px solid {m.bd}; cursor:pointer; padding:0;" onclick={onaction}>{action} →</button>
      </div>
    {/if}
  </div>
</div>
