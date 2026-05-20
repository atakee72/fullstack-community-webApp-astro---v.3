<script lang="ts">
  // Listing-rejected panel — §11 of the state matrix.
  // Owner-only. Shown on the detail page when listing.moderationStatus === 'rejected'.
  // Replaces the normal description+actions block as the dominant UI for that state.
  //
  // Left: dimmed listing card stub with ✕ overlay.
  // Right: paper-soft panel with rejection reason + appeal/delete CTAs.

  import type { Listing } from '../../../../types/listing';

  let {
    listing,
    onAppeal,
    onDelete,
  }: {
    listing: Pick<Listing, '_id' | 'title' | 'rejectionReason'>;
    onAppeal?: () => void;
    onDelete: () => Promise<void>;
  } = $props();

  let deleting = $state(false);

  async function handleDelete() {
    deleting = true;
    try {
      await onDelete();
    } finally {
      deleting = false;
    }
  }

  function handleAppeal() {
    if (onAppeal) {
      onAppeal();
    } else {
      // Default: navigate to edit page
      window.location.href = `/marketplace/edit/${listing._id}`;
    }
  }
</script>

<div
  style="
    display: grid;
    grid-template-columns: 0.65fr 2fr;
    gap: 20px;
    padding: 20px;
    background: var(--k-paper-warm);
    border: 1.5px solid var(--k-danger, #c0392b);
    border-radius: var(--k-radius-md);
    box-shadow: 3px 3px 0 var(--k-danger, #c0392b);
  "
  role="alert"
  aria-label="Anzeige abgelehnt"
>
  <!-- Left: dimmed card stub with ✕ overlay -->
  <div
    style="
      background: var(--k-paper-soft, #ede8db);
      border: var(--k-border-ink);
      border-radius: var(--k-radius-sm);
      overflow: hidden;
      position: relative;
      opacity: 0.6;
      filter: saturate(0.5);
    "
  >
    <!-- Image placeholder -->
    <div
      style="
        aspect-ratio: 4/3;
        background: repeating-linear-gradient(
          45deg,
          rgba(14,16,51,0.1) 0 8px,
          var(--k-paper-warm) 8px 16px
        );
        border-bottom: 1px solid var(--k-rule);
        position: relative;
      "
    >
      <!-- Ink overlay with ✕ -->
      <div
        style="
          position: absolute;
          inset: 0;
          background: rgba(14,16,51,0.82);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
        "
      >
        <span
          class="font-instrument italic"
          style="font-size: 32px; color: var(--k-paper); line-height: 1;"
          aria-hidden="true"
        >✕</span>
        <span
          class="font-dmmono"
          style="font-size: 9px; color: var(--k-paper); letter-spacing: 0.15em; font-weight: 700;"
        >ABGELEHNT</span>
      </div>
    </div>

    <!-- Title stub -->
    <div style="padding: 8px 10px;">
      <p
        class="font-bricolage"
        style="
          font-size: 12px; font-weight: 700; line-height: 1.2;
          color: var(--k-ink);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          margin: 0; text-decoration: line-through;
        "
      >{listing.title}</p>
    </div>
  </div>

  <!-- Right: rejection info panel -->
  <div
    style="
      background: var(--k-paper-soft, #ede8db);
      border: var(--k-border-ink);
      border-radius: var(--k-radius-md);
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    "
  >
    <!-- Header row: VERWORFEN badge + label -->
    <div style="display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap;">
      <span
        class="font-dmmono"
        style="
          font-size: 10px; font-weight: 700;
          color: var(--k-paper);
          background: var(--k-danger, #c0392b);
          padding: 2px 7px;
          border-radius: var(--k-radius-sm);
          letter-spacing: 0.12em;
        "
      >ABGELEHNT</span>
      <span
        class="font-bricolage"
        style="font-size: 14px; font-weight: 700; letter-spacing: -0.01em; color: var(--k-ink);"
      >Deine Anzeige wurde abgelehnt</span>
    </div>

    <!-- Rejection reason -->
    {#if listing.rejectionReason}
      <blockquote
        class="font-instrument italic"
        style="
          font-size: 13px;
          color: var(--k-ink-soft, #4a4740);
          line-height: 1.5;
          margin: 0;
          padding-left: 10px;
          border-left: 2px solid var(--k-danger, #c0392b);
        "
      >
        „{listing.rejectionReason}"
      </blockquote>
    {:else}
      <p
        class="font-instrument italic"
        style="font-size: 13px; color: var(--k-ink-soft, #4a4740); line-height: 1.5; margin: 0;"
      >
        Unsere Moderation hat diese Anzeige nicht freigegeben.
        Falls du glaubst, dass das ein Fehler ist, kannst du sie korrigieren und erneut einreichen.
      </p>
    {/if}

    <!-- CTAs -->
    <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px;">
      <button
        type="button"
        onclick={handleAppeal}
        class="font-dmmono"
        style="
          font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;
          padding: 6px 14px;
          border: 1.5px solid var(--k-ink);
          border-radius: var(--k-radius-sm);
          background: var(--k-paper-warm);
          color: var(--k-ink);
          cursor: pointer;
        "
      >
        Korrektur einreichen
      </button>

      <button
        type="button"
        onclick={handleDelete}
        disabled={deleting}
        class="font-dmmono"
        style="
          font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;
          padding: 6px 14px;
          border: 1.5px solid var(--k-rule);
          border-radius: var(--k-radius-sm);
          background: transparent;
          color: var(--k-ink-mute);
          cursor: {deleting ? 'wait' : 'pointer'};
          opacity: {deleting ? '0.6' : '1'};
        "
      >
        {deleting ? 'Löschen…' : 'Anzeige löschen'}
      </button>
    </div>
  </div>
</div>
