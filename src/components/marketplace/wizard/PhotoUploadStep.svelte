<script lang="ts">
  import ImageCropper from '../ImageCropper.svelte';
  import { ListingStep2Schema } from '../../../schemas/listing.schema';

  let { listing, updateListing, onNext, onPrev } = $props<{
    listing: { images: string[] };
    updateListing: (field: string, value: any) => void;
    onNext: () => void;
    onPrev: () => void;
  }>();

  let uploading = $state(false);
  let dragOver = $state(false);
  let error = $state<string | null>(null);
  let validationError = $state<string | null>(null);

  // Cropping state
  let cropQueue = $state<string[]>([]);  // Data URLs waiting to be cropped
  let currentCropImage = $state<string | null>(null);

  // Read file as data URL for cropping
  function readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Queue files for cropping
  async function queueFilesForCrop(files: FileList) {
    if (listing.images.length + files.length > 5) {
      error = 'Maximum 5 images allowed';
      return;
    }

    error = null;
    const dataUrls: string[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        error = 'Images must be under 10MB';
        continue;
      }

      try {
        const dataUrl = await readFileAsDataURL(file);
        dataUrls.push(dataUrl);
      } catch (e) {
        console.error('Failed to read file:', e);
      }
    }

    if (dataUrls.length > 0) {
      cropQueue = [...cropQueue, ...dataUrls];
      // Start cropping first image if not already cropping
      if (!currentCropImage) {
        currentCropImage = cropQueue[0];
        cropQueue = cropQueue.slice(1);
      }
    }
  }

  // Upload cropped blob
  async function uploadCroppedImage(blob: Blob) {
    uploading = true;
    error = null;

    try {
      const formData = new FormData();
      formData.append('file', blob, 'cropped-image.jpg');

      const response = await fetch('/api/listings/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        updateListing('images', [...listing.images, data.url]);
      } else {
        error = 'Failed to upload image';
      }
    } catch (e) {
      error = 'Failed to upload image';
    } finally {
      uploading = false;
    }
  }

  // Handle crop complete - close modal immediately, upload in background
  function handleCropComplete(croppedBlob: Blob) {
    // Move to next image or close modal FIRST (better UX)
    if (cropQueue.length > 0) {
      currentCropImage = cropQueue[0];
      cropQueue = cropQueue.slice(1);
    } else {
      currentCropImage = null;
    }

    // Upload in background (don't await)
    uploadCroppedImage(croppedBlob);
  }

  // Handle crop cancel
  function handleCropCancel() {
    // Skip current image, move to next or close
    if (cropQueue.length > 0) {
      currentCropImage = cropQueue[0];
      cropQueue = cropQueue.slice(1);
    } else {
      currentCropImage = null;
    }
  }

  function handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      queueFilesForCrop(input.files);
      // Reset input so same file can be selected again
      input.value = '';
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    if (e.dataTransfer?.files) {
      queueFilesForCrop(e.dataTransfer.files);
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    dragOver = true;
  }

  function handleDragLeave() {
    dragOver = false;
  }

  function removeImage(index: number) {
    const newImages = listing.images.filter((_, i) => i !== index);
    updateListing('images', newImages);
  }

  const canProceed = $derived(listing.images.length >= 1);

  function handleNext() {
    const result = ListingStep2Schema.safeParse({ images: listing.images });
    if (!result.success) {
      validationError = result.error.flatten().fieldErrors.images?.[0] || 'Please add at least one image';
      return;
    }
    validationError = null;
    onNext();
  }
</script>

<!-- Image Cropper Modal -->
{#if currentCropImage}
  <ImageCropper
    imageSrc={currentCropImage}
    onCropComplete={handleCropComplete}
    onCancel={handleCropCancel}
  />
{/if}

<div class="space-y-6">
  <div>
    <h2 class="text-2xl font-bold text-[#814256] mb-2">Add Photos</h2>
    <p class="text-gray-600">High-quality photos help your item sell faster. Add 1-5 photos.</p>
  </div>

  <!-- Upload Zone -->
  <div
    class="border-2 border-dashed rounded-2xl p-8 text-center transition-colors relative
      {dragOver ? 'border-[#4b9aaa] bg-[#4b9aaa]/5' : 'border-[#aca89f]/50'}
      {listing.images.length >= 5 ? 'opacity-50 pointer-events-none' : ''}"
    ondrop={handleDrop}
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
  >
    <svg class="w-16 h-16 text-[#aca89f] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>

    {#if uploading}
      <div class="flex items-center justify-center gap-2 text-[#4b9aaa]">
        <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Uploading...
      </div>
    {:else}
      <p class="text-gray-600 mb-2">Drop photos here or click to browse</p>
      <p class="text-sm text-gray-400">PNG, JPG up to 10MB each • You'll crop each photo</p>
    {/if}

    <input
      type="file"
      accept="image/*"
      multiple
      onchange={handleFileSelect}
      disabled={uploading || listing.images.length >= 5}
      class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
    />

    <button
      type="button"
      class="mt-4 bg-[#4b9aaa] text-white px-6 py-2 rounded-xl hover:bg-[#3a7a8a] transition-colors disabled:opacity-50"
      disabled={uploading || listing.images.length >= 5}
      onclick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
    >
      Choose Photos
    </button>
  </div>

  {#if error}
    <p class="text-red-500 text-sm">{error}</p>
  {/if}

  <!-- Pending crops indicator -->
  {#if cropQueue.length > 0}
    <p class="text-sm text-[#4b9aaa]">
      {cropQueue.length} more {cropQueue.length === 1 ? 'photo' : 'photos'} waiting to crop...
    </p>
  {/if}

  <!-- Image Preview Grid -->
  {#if listing.images.length > 0}
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
      {#each listing.images as image, index}
        <div class="relative aspect-square rounded-xl overflow-hidden border border-[#aca89f]/30 group">
          <img src={image} alt="Upload {index + 1}" class="w-full h-full object-cover" />

          {#if index === 0}
            <span class="absolute top-2 left-2 bg-[#4b9aaa] text-white text-xs px-2 py-1 rounded">
              Main
            </span>
          {/if}

          <button
            onclick={() => removeImage(index)}
            class="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      {/each}
    </div>
    <p class="text-sm text-gray-500">{listing.images.length}/5 photos added</p>
  {/if}

  {#if validationError}
    <p class="text-red-500 text-sm">{validationError}</p>
  {/if}

  <!-- Navigation Buttons -->
  <div class="flex justify-between pt-4">
    <button
      onclick={onPrev}
      class="text-gray-600 px-6 py-3 rounded-xl hover:bg-gray-100 transition-colors font-medium flex items-center gap-2"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      Back
    </button>
    <button
      onclick={handleNext}
      disabled={!canProceed || uploading}
      class="bg-[#4b9aaa] text-white px-8 py-3 rounded-xl hover:bg-[#3a7a8a] transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      Next: Set Price
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  </div>
</div>
