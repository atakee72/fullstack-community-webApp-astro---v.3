<script lang="ts">
  import { t } from '../../../../lib/kiosk-i18n';
  import type { Listing } from '../../../../types/listing';
  import ListingImagePlaceholder from '../primitives/ListingImagePlaceholder.svelte';
  import MarketStrap from '../primitives/MarketStrap.svelte';

  let {
    listing,
  }: {
    listing: Pick<Listing, 'images' | 'category' | 'isBumped'>;
  } = $props();

  let currentIndex = $state(0);
  let lightboxOpen = $state(false);
  let dialogEl: HTMLDialogElement | undefined = $state();

  const images = $derived(listing.images ?? []);
  const count = $derived(images.length);

  function nav(direction: 1 | -1) {
    if (count === 0) return;
    currentIndex = (currentIndex + direction + count) % count;
  }

  function openLightbox() {
    if (count === 0) return;
    lightboxOpen = true;
    dialogEl?.showModal();
  }

  function closeLightbox() {
    lightboxOpen = false;
    dialogEl?.close();
  }

  function handleKey(e: KeyboardEvent) {
    if (!lightboxOpen) return;
    if (e.key === 'ArrowLeft') nav(-1);
    if (e.key === 'ArrowRight') nav(1);
    // Esc is handled natively by <dialog>; sync our state on close
  }

  function handleDialogClose() {
    lightboxOpen = false;
  }
</script>

<svelte:window onkeydown={handleKey} />

<div style="position: relative;">
  <!-- Lead image -->
  <div
    style="position: relative; cursor: {count > 0 ? 'pointer' : 'default'};"
    onclick={openLightbox}
    role={count > 0 ? 'button' : undefined}
    tabindex={count > 0 ? 0 : undefined}
    onkeypress={(e) => { if (e.key === 'Enter' || e.key === ' ') openLightbox(); }}
    aria-label={count > 0 ? 'Lightbox öffnen' : undefined}
  >
    {#if count > 0}
      <img
        src={images[currentIndex]}
        alt="Anzeige Bild {currentIndex + 1}"
        style="
          width: 100%;
          aspect-ratio: 16/10;
          object-fit: cover;
          border-radius: var(--k-radius-md);
          border: var(--k-border-ink);
          display: block;
        "
      />
    {:else}
      <ListingImagePlaceholder
        category={listing.category}
        ratio="16/10"
        lead={true}
      />
    {/if}

    <!-- Image counter — bottom-right -->
    {#if count > 0}
      <span
        style="
          position: absolute; bottom: 14px; right: 14px;
          font-family: var(--k-font-mono); font-size: 11px; font-weight: 600;
          background: var(--k-ink); color: var(--k-paper);
          padding: 4px 10px; border-radius: 4px; letter-spacing: 0.08em;
          pointer-events: none;
        "
      >📷 {currentIndex + 1} / {count}</span>
    {/if}

    <!-- Bump strap — top-left (only bump on detail hero per spec) -->
    {#if listing.isBumped === true}
      <div
        style="position: absolute; top: 14px; left: 14px; display: flex; flex-direction: column; gap: 4px; pointer-events: none;"
      >
        <MarketStrap kind="bump" small={true} />
      </div>
    {/if}

    <!-- Nav buttons — only when count > 1 -->
    {#if count > 1}
      <button
        onclick={(e) => { e.stopPropagation(); nav(-1); }}
        style="
          position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
          width: 36px; height: 36px; border-radius: 50%;
          background: color-mix(in srgb, var(--k-paper) 93%, transparent);
          border: var(--k-border-ink);
          display: flex; align-items: center; justify-content: center;
          font-family: var(--k-font-serif); font-style: italic; font-size: 22px;
          box-shadow: 1px 1px 0 var(--k-ink);
          cursor: pointer; line-height: 1;
        "
        aria-label="Vorheriges Bild"
      >‹</button>
      <button
        onclick={(e) => { e.stopPropagation(); nav(1); }}
        style="
          position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
          width: 36px; height: 36px; border-radius: 50%;
          background: color-mix(in srgb, var(--k-paper) 93%, transparent);
          border: var(--k-border-ink);
          display: flex; align-items: center; justify-content: center;
          font-family: var(--k-font-serif); font-style: italic; font-size: 22px;
          box-shadow: 1px 1px 0 var(--k-ink);
          cursor: pointer; line-height: 1;
        "
        aria-label="Nächstes Bild"
      >›</button>
    {/if}
  </div>

  <!-- Thumb strip -->
  <div style="display: flex; gap: 6px; margin-top: 10px;">
    {#each images as img, i}
      <button
        onclick={() => { currentIndex = i; }}
        style="
          flex: 1; aspect-ratio: 1/1;
          border: {i === currentIndex ? `2px solid var(--k-ink)` : `1px solid var(--k-rule)`};
          border-radius: 4px;
          background: {i === currentIndex
            ? 'color-mix(in srgb, var(--k-teal) 25%, var(--k-paper-warm))'
            : 'transparent'};
          padding: 0; cursor: pointer; overflow: hidden;
          position: relative;
        "
        aria-label="Bild {i + 1} anzeigen"
      >
        <img
          src={img}
          alt="Vorschau {i + 1}"
          style="width: 100%; height: 100%; object-fit: cover; display: block;"
        />
        {#if i === currentIndex}
          <span
            style="
              position: absolute; inset: 0;
              display: flex; align-items: center; justify-content: center;
              font-family: var(--k-font-mono); font-size: 9px;
              color: var(--k-ink); font-weight: 700;
            "
          >●</span>
        {/if}
      </button>
    {:else}
      <!-- No images: show 3 placeholder thumbs -->
      {#each [0, 1, 2] as i}
        <div
          style="
            flex: 1; aspect-ratio: 1/1;
            border: {i === 0 ? `2px solid var(--k-ink)` : `1px solid var(--k-rule)`};
            border-radius: 4px;
            background: repeating-linear-gradient(
              45deg,
              color-mix(in srgb, var(--k-ink-mute) 18%, transparent) 0 5px,
              var(--k-paper-warm) 5px 10px
            );
          "
        ></div>
      {/each}
    {/each}
  </div>

  <!-- Footer hint -->
  <div
    style="
      font-family: var(--k-font-mono); font-size: 9.5px;
      color: var(--k-ink-mute); margin-top: 8px; letter-spacing: 0.05em;
    "
  >↗ {$t['market.detail.gallery.hint']}</div>
</div>

<!-- Lightbox dialog -->
<dialog
  bind:this={dialogEl}
  onclose={handleDialogClose}
  style="
    background: var(--k-ink); color: var(--k-paper);
    border: none; border-radius: var(--k-radius-md);
    padding: 0; max-width: min(90vw, 1100px); width: 100%;
    position: fixed;
  "
>
  <div style="position: relative; display: flex; flex-direction: column; align-items: center; padding: 16px;">
    <!-- Close button -->
    <button
      onclick={closeLightbox}
      style="
        position: absolute; top: 12px; right: 12px;
        background: none; border: 1px solid var(--k-paper);
        color: var(--k-paper); border-radius: 50%;
        width: 28px; height: 28px;
        font-family: var(--k-font-mono); font-size: 14px;
        cursor: pointer; display: flex; align-items: center; justify-content: center;
        line-height: 1;
      "
      aria-label="Schließen"
    >✕</button>

    <!-- Full-size image -->
    {#if count > 0}
      <img
        src={images[currentIndex]}
        alt="Anzeige Bild {currentIndex + 1}"
        style="
          max-height: 80vh; max-width: 100%;
          object-fit: contain; border-radius: var(--k-radius-sm);
          display: block; margin-top: 8px;
        "
      />
    {/if}

    <!-- Nav row -->
    {#if count > 1}
      <div style="display: flex; align-items: center; gap: 16px; margin-top: 12px;">
        <button
          onclick={() => nav(-1)}
          style="
            background: none; border: 1px solid var(--k-paper);
            color: var(--k-paper); border-radius: 50%;
            width: 36px; height: 36px;
            font-family: var(--k-font-serif); font-style: italic; font-size: 22px;
            cursor: pointer; display: flex; align-items: center; justify-content: center;
            line-height: 1;
          "
          aria-label="Vorheriges Bild"
        >‹</button>
        <span
          style="font-family: var(--k-font-mono); font-size: 11px; letter-spacing: 0.08em;"
        >{currentIndex + 1} / {count}</span>
        <button
          onclick={() => nav(1)}
          style="
            background: none; border: 1px solid var(--k-paper);
            color: var(--k-paper); border-radius: 50%;
            width: 36px; height: 36px;
            font-family: var(--k-font-serif); font-style: italic; font-size: 22px;
            cursor: pointer; display: flex; align-items: center; justify-content: center;
            line-height: 1;
          "
          aria-label="Nächstes Bild"
        >›</button>
      </div>
    {/if}
  </div>
</dialog>
