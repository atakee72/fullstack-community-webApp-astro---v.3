<script lang="ts">
  /**
   * Selection checkbox for queue cards + bulk-select rows.
   * Transcribed from design/handoffs/design_handoff_admin/jsx/kiosk-admin.jsx:107-117
   * (token mapping: ADM_ACCENT → var(--k-accent), k.border.ink → var(--k-border-ink),
   * k.color.paper → var(--k-paper)).
   */
  let { checked, onclick }: { checked: boolean; onclick?: () => void } = $props();

  function handleKeydown(e: KeyboardEvent) {
    if (!onclick) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onclick();
    }
  }
</script>

<span
  role="checkbox"
  aria-checked={checked}
  tabindex="0"
  onclick={onclick}
  onkeydown={handleKeydown}
  style="
    width: 18px; height: 18px; flex: 0 0 18px; border-radius: 4px;
    border: var(--k-border-ink);
    display: inline-flex; align-items: center; justify-content: center;
    background: {checked ? 'var(--k-accent)' : 'transparent'};
    color: var(--k-paper); font-size: 12px; font-weight: 700; line-height: 1;
    cursor: {onclick ? 'pointer' : 'default'};
  "
>{checked ? '✓' : ''}</span>
