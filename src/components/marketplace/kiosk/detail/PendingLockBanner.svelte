<script lang="ts">
  // No props — pure visual indicator shown when listing is under moderation.
</script>

<div class="pending-lock-banner market-pending-strap">
  <span class="pending-icon">◐</span>
  <span class="pending-label">KI-CHECK LÄUFT</span>
  <p class="pending-body">
    Diese Anzeige wird gerade geprüft. Du kannst sie bearbeiten oder löschen,
    sobald die Prüfung abgeschlossen ist.
  </p>
</div>

<style>
  .pending-lock-banner {
    background: var(--k-ochre, #d4a843);
    border: 1.5px solid var(--k-ink, #1a1a18);
    border-radius: var(--k-radius-sm, 4px);
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .pending-icon {
    font-size: 14px;
    line-height: 1;
    color: var(--k-ink, #1a1a18);
  }

  .pending-label {
    font-family: var(--k-font-mono, 'DM Mono', monospace);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.12em;
    color: var(--k-ink, #1a1a18);
  }

  .pending-body {
    font-family: var(--k-font-mono, 'DM Mono', monospace);
    font-size: 10.5px;
    font-weight: 500;
    line-height: 1.5;
    color: var(--k-ink, #1a1a18);
    margin: 2px 0 0;
  }
</style>
