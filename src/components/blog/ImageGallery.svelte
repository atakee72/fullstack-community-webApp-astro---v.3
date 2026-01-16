<script lang="ts">
  interface GalleryImage {
    src: string;
    width: number;
    height: number;
    alt: string;
  }

  interface Props {
    images: GalleryImage[];
  }

  let { images }: Props = $props();

  let lightboxOpen = $state(false);
  let currentIndex = $state(0);

  function openLightbox(index: number) {
    currentIndex = index;
    lightboxOpen = true;
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightboxOpen = false;
    document.body.style.overflow = '';
  }

  function nextImage() {
    currentIndex = (currentIndex + 1) % images.length;
  }

  function prevImage() {
    currentIndex = (currentIndex - 1 + images.length) % images.length;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (!lightboxOpen) return;

    if (event.key === 'Escape') closeLightbox();
    if (event.key === 'ArrowRight') nextImage();
    if (event.key === 'ArrowLeft') prevImage();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Gallery Grid -->
<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
  {#each images as image, index}
    <button
      onclick={() => openLightbox(index)}
      class="relative aspect-square overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer group"
    >
      <img
        src={image.src}
        alt={image.alt}
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        loading="lazy"
      />
      <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
        <svg class="w-10 h-10 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
        </svg>
      </div>
    </button>
  {/each}
</div>

<!-- Lightbox -->
{#if lightboxOpen}
  <div
    class="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
    role="dialog"
    aria-modal="true"
  >
    <!-- Close button -->
    <button
      onclick={closeLightbox}
      class="absolute top-4 right-4 text-white/80 hover:text-white p-2 z-10"
      aria-label="Close lightbox"
    >
      <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>

    <!-- Previous button -->
    {#if images.length > 1}
      <button
        onclick={prevImage}
        class="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-2 z-10"
        aria-label="Previous image"
      >
        <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
    {/if}

    <!-- Image -->
    <div class="max-w-[90vw] max-h-[90vh] relative">
      <img
        src={images[currentIndex].src}
        alt={images[currentIndex].alt}
        class="max-w-full max-h-[85vh] object-contain"
      />
      <div class="absolute bottom-0 left-0 right-0 text-center py-2 text-white/80 text-sm">
        {currentIndex + 1} / {images.length}
      </div>
    </div>

    <!-- Next button -->
    {#if images.length > 1}
      <button
        onclick={nextImage}
        class="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-2 z-10"
        aria-label="Next image"
      >
        <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    {/if}

    <!-- Click outside to close -->
    <button
      class="absolute inset-0 -z-10"
      onclick={closeLightbox}
      aria-label="Close lightbox"
    ></button>
  </div>
{/if}
