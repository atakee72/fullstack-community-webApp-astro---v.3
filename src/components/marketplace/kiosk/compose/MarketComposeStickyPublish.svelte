<script lang="ts">
  // Mobile-only sticky bottom publish bar.
  // Parked above the bottom mobile nav (bottom-16) — matches kiosk FAB vocabulary.
  // Desktop equivalent is the inline action row in MarketComposeInner.

  let {
    disabled = false,
    publishing = false,
    savingDraft = false,
    onPublish,
    onPreview,
    onSaveDraft,
    draftLabel = 'Entwurf',
  }: {
    disabled?: boolean;
    publishing?: boolean;
    savingDraft?: boolean;
    onPublish: () => void;
    onPreview: () => void;
    /** When provided, renders a "save as draft" button (create mode only). */
    onSaveDraft?: () => void;
    draftLabel?: string;
  } = $props();
</script>

<!-- Mobile-only: lg:hidden. Fixed above bottom-nav (bottom-16 = 64px). -->
<div
  class="lg:hidden"
  style="
    position: fixed;
    bottom: 64px;
    left: 0;
    right: 0;
    z-index: 30;
    display: flex;
    gap: 10px;
    padding: 10px 16px;
    background: var(--k-paper-warm);
    border-top: 1.5px solid var(--k-ink);
    box-shadow: 0 -2px 0 var(--k-ink);
  "
>
  <!-- Preview button (ghost) -->
  <button
    type="button"
    onclick={onPreview}
    style="
      flex: 0 0 auto;
      padding: 9px 18px;
      background: transparent;
      border: 1.5px solid var(--k-ink);
      border-radius: var(--k-radius-pill, 999px);
      font-family: var(--k-font-mono);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--k-ink);
      cursor: pointer;
    "
  >
    vorschau
  </button>

  <!-- Save-as-draft button (ghost; create mode only) -->
  {#if onSaveDraft}
    <button
      type="button"
      onclick={onSaveDraft}
      disabled={savingDraft || publishing}
      style="
        flex: 0 0 auto;
        padding: 9px 14px;
        background: transparent;
        border: 1.5px solid var(--k-ink);
        border-radius: var(--k-radius-pill, 999px);
        font-family: var(--k-font-mono);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--k-ink);
        cursor: {savingDraft || publishing ? 'not-allowed' : 'pointer'};
        opacity: {savingDraft || publishing ? 0.5 : 1};
      "
      aria-busy={savingDraft}
    >
      {savingDraft ? '◐' : draftLabel}
    </button>
  {/if}

  <!-- Publish button (primary wine) -->
  <button
    type="button"
    onclick={onPublish}
    disabled={disabled || publishing}
    style="
      flex: 1;
      padding: 9px 18px;
      background: {disabled || publishing ? 'var(--k-rule)' : 'var(--k-wine)'};
      border: {disabled || publishing ? '2px solid transparent' : '2px solid var(--k-ink)'};
      border-radius: var(--k-radius-pill, 999px);
      font-family: var(--k-font-display);
      font-size: 14px;
      font-weight: 700;
      color: {disabled || publishing ? 'var(--k-ink-mute)' : 'var(--k-paper)'};
      cursor: {disabled || publishing ? 'not-allowed' : 'pointer'};
      box-shadow: {disabled || publishing ? 'none' : '2px 2px 0 var(--k-ink)'};
      text-align: center;
      transition: background 0.15s;
    "
    aria-busy={publishing}
  >
    {#if publishing}
      ◐ bitte warten…
    {:else}
      veröffentlichen →
    {/if}
  </button>
</div>
