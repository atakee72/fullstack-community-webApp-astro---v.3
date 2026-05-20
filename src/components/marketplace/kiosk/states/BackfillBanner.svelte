<script lang="ts">
  import type { Listing } from '../../../../types/listing';

  let { listing }: { listing: Pick<Listing, '_id'> } = $props();
</script>

<aside class="market-backfill-banner">
  <strong>Diese Anzeige stammt aus der alten Marktplatz-Version.</strong>
  <p>Auffrischen, um sie sichtbarer zu machen — neue Kategorie + Versandoption + optionale Details.</p>
  <a href="/marketplace/edit/{listing._id}?from=backfill" class="kiosk-btn">↗ Auffrischen</a>
</aside>

<style>
  .market-backfill-banner {
    background: var(--k-paper-warm, #f3ead8);
    border-left: 4px solid var(--k-ochre, #d4a843);
    padding: 14px 18px;
    border-radius: var(--k-radius-md, 8px);
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 14px;
  }

  .market-backfill-banner strong {
    font-family: var(--k-font-display, 'Bricolage Grotesque', sans-serif);
    font-size: 14px;
    color: var(--k-ink, #1a1a18);
  }

  .market-backfill-banner p {
    font-family: var(--k-font-mono, 'DM Mono', monospace);
    font-size: 12px;
    color: var(--k-ink-soft, #4a4740);
    margin: 0;
  }

  .market-backfill-banner .kiosk-btn {
    align-self: flex-start;
    margin-top: 4px;
    padding: 5px 12px;
    background: var(--k-ochre, #d4a843);
    color: var(--k-ink, #1a1a18);
    border: 2px solid var(--k-ink, #1a1a18);
    border-radius: var(--k-radius-md, 8px);
    font-family: var(--k-font-mono, 'DM Mono', monospace);
    font-size: 11px;
    text-decoration: none;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
</style>
