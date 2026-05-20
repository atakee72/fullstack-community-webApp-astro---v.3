<script lang="ts">
  // Filtered-empty state — §03. Filters active but zero results.
  // Per A8: saved-search alert CTA removed (v1.1). Only shows active
  // filter chips (dismissible) + headline + ← Filter zurücksetzen anchor.

  import { t } from '../../../../lib/kiosk-i18n';

  let {
    activeFilters,
    onClearAll,
    onRemoveFilter,
  }: {
    activeFilters: Array<{ key: string; label: string }>;
    onClearAll: () => void;
    onRemoveFilter: (key: string) => void;
  } = $props();
</script>

<div
  style="
    margin: 24px 20px;
    padding: 28px 24px;
    background: var(--k-paper-warm);
    border: 1px dashed var(--k-rule);
    border-radius: var(--k-radius-md);
  "
>
  <!-- Active filter label -->
  {#if activeFilters.length > 0}
    <p
      class="font-dmmono"
      style="font-size: 9px; color: var(--k-ink-mute); letter-spacing: 0.1em; text-transform: uppercase; margin: 0 0 8px;"
    >
      {$t['market.state.empty.filtered.activeFilters']}
    </p>

    <!-- Dismissible chips -->
    <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 20px;">
      {#each activeFilters as chip (chip.key)}
        <span
          style="
            display: inline-flex; align-items: center; gap: 5px;
            padding: 3px 10px;
            background: var(--k-ink); color: var(--k-paper);
            border-radius: var(--k-radius-pill, 999px);
            font-family: var(--k-font-mono); font-size: 10px; font-weight: 600;
          "
        >
          {chip.label}
          <button
            type="button"
            onclick={() => onRemoveFilter(chip.key)}
            aria-label="Filter entfernen"
            style="
              background: none; border: none;
              color: inherit; cursor: pointer;
              padding: 0; line-height: 1;
              opacity: 0.75;
            "
          >✕</button>
        </span>
      {/each}
    </div>
  {/if}

  <!-- Headline + clear link -->
  <div style="text-align: center; display: flex; flex-direction: column; align-items: center; gap: 10px;">
    <p
      class="font-instrument italic"
      style="font-size: 17px; color: var(--k-ink); line-height: 1.3; margin: 0;"
    >
      {$t['market.state.empty.filtered.body']}
    </p>

    <!-- A8: anchor, not button — supports middle-click / right-click -->
    <a
      href="/marketplace"
      onclick={(e) => { e.preventDefault(); onClearAll(); }}
      class="font-dmmono"
      style="
        font-size: 11px; letter-spacing: 0.03em;
        color: var(--k-ink-soft);
        text-decoration: underline;
        text-decoration-style: dashed;
      "
    >
      {$t['market.state.empty.filtered.clear']}
    </a>
  </div>
</div>
