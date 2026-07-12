<script lang="ts">
  // Archiv filter pill — active = ink bg / paper text, else transparent /
  // ink border. Optional mono count badge (ochre when active, ink-mute
  // otherwise). Design source: kiosk-profile.jsx (PFilterChip).

  let {
    label,
    active,
    count = null,
    onclick,
  }: {
    label: string;
    active: boolean;
    count?: number | null;
    onclick?: () => void;
  } = $props();
</script>

<button
  type="button"
  {onclick}
  aria-pressed={active}
  class="shrink-0"
  style="
    padding: 5px 13px;
    font-family: var(--k-font-display);
    font-size: 12.5px;
    font-weight: 600;
    background: {active ? 'var(--k-ink)' : 'transparent'};
    color: {active ? 'var(--k-paper)' : 'var(--k-ink)'};
    border: 1.5px solid var(--k-ink);
    border-radius: var(--k-radius-pill);
    cursor: pointer;
    display: inline-flex;
    gap: 6px;
    align-items: center;
  "
>
  {label}
  {#if count != null}
    <span style="font-family: var(--k-font-mono); font-size: 10px; color: {active ? 'var(--k-ochre)' : 'var(--k-ink-mute)'};">{count}</span>
  {/if}
</button>
