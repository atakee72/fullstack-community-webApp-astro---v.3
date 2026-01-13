<script lang="ts">
  import Cropper from 'svelte-easy-crop';

  let {
    imageSrc,
    onCropComplete,
    onCancel
  } = $props<{
    imageSrc: string;
    onCropComplete: (croppedBlob: Blob) => void;
    onCancel: () => void;
  }>();

  let crop = $state({ x: 0, y: 0 });
  let zoom = $state(1);
  let pixelCrop = $state<{ x: number; y: number; width: number; height: number } | null>(null);
  let processing = $state(false);

  // Library passes crop data directly as callback argument (not CustomEvent)
  function handleCropChange(event: { percent: any; pixels: { x: number; y: number; width: number; height: number } }) {
    pixelCrop = event.pixels;
  }

  async function getCroppedImage(): Promise<Blob> {
    const image = new Image();
    image.crossOrigin = 'anonymous'; // Required for Canvas with external URLs
    image.src = imageSrc;

    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No canvas context');

    // Use crop data or fallback to square center crop
    const cropData = pixelCrop || {
      x: 0,
      y: 0,
      width: Math.min(image.width, image.height),
      height: Math.min(image.width, image.height)
    };

    // Set canvas size to cropped area
    canvas.width = cropData.width;
    canvas.height = cropData.height;

    // Draw cropped image
    ctx.drawImage(
      image,
      cropData.x,
      cropData.y,
      cropData.width,
      cropData.height,
      0,
      0,
      cropData.width,
      cropData.height
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create blob'));
        },
        'image/jpeg',
        0.9
      );
    });
  }

  async function handleConfirm() {
    if (processing) return;
    processing = true;

    try {
      const croppedBlob = await getCroppedImage();
      onCropComplete(croppedBlob);
    } catch (e) {
      console.error('Crop failed:', e);
      alert('Failed to crop image. Please try again.');
    } finally {
      processing = false;
    }
  }
</script>

<!-- Modal Backdrop -->
<div class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
  <div class="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
    <!-- Header -->
    <div class="p-4 border-b border-gray-200">
      <h3 class="text-lg font-semibold text-[#814256]">Crop Image</h3>
      <p class="text-sm text-gray-500">Drag to reposition, scroll to zoom</p>
    </div>

    <!-- Cropper Area -->
    <div class="relative h-80 bg-gray-900">
      <Cropper
        image={imageSrc}
        bind:crop
        bind:zoom
        aspect={1}
        oncropcomplete={handleCropChange}
      />
    </div>

    <!-- Zoom Slider -->
    <div class="p-4 border-t border-gray-200">
      <div class="flex items-center gap-4">
        <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
        </svg>
        <input
          type="range"
          min="1"
          max="3"
          step="0.1"
          bind:value={zoom}
          class="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#4b9aaa]"
        />
        <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
        </svg>
      </div>
    </div>

    <!-- Actions -->
    <div class="p-4 border-t border-gray-200 flex justify-end gap-3">
      <button
        type="button"
        onclick={onCancel}
        disabled={processing}
        class="px-6 py-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="button"
        onclick={handleConfirm}
        disabled={processing}
        class="px-6 py-2 rounded-xl bg-[#4b9aaa] text-white hover:bg-[#3a7a8a] transition-colors disabled:opacity-50 flex items-center gap-2"
      >
        {#if processing}
          <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          Processing...
        {:else}
          Apply Crop
        {/if}
      </button>
    </div>
  </div>
</div>
