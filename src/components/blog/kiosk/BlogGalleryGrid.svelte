<script lang="ts">
  // Bildstrecke grid — image 01 spans full width, the rest sit 2-up.
  // Renders nothing for an empty array: the shipped gallery post has zero
  // galleryImages (MDX body carries the real content, Task 4 brief) so this
  // must stay silent rather than leave an empty frame artifact.
  import { t } from '../../../lib/kiosk-i18n';

  let { images }: { images: Array<{ src: string; alt?: string }> } = $props();
</script>

{#if images.length > 0}
  <div class="grid md:grid-cols-2" style="gap: 26px 24px; margin-top: 24px;">
    {#each images as img, i (img.src)}
      <div class={i === 0 ? 'md:col-span-2' : ''}>
        <div
          style="border: 1.5px solid var(--k-ink); border-radius: var(--k-radius-lg); overflow: hidden; box-shadow: 2px 2px 0 var(--k-ink);"
        >
          <img
            src={img.src}
            alt={img.alt ?? ''}
            class="w-full object-cover {i === 0 ? 'h-[300px]' : 'h-[190px]'}"
            loading={i === 0 ? undefined : 'lazy'}
          />
        </div>
        <div class="flex items-baseline" style="gap: 10px; margin-top: 8px;">
          <span
            class="font-dmmono"
            style="font-size: 9.5px; letter-spacing: 0.1em; color: var(--k-rust); white-space: nowrap;"
          >{$t['blog.caption.image']} {String(i + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}</span>
          {#if img.alt}
            <span style="font-size: 12px; line-height: 1.45; color: var(--k-ink-soft);">{img.alt}</span>
          {/if}
        </div>
      </div>
    {/each}
  </div>
{/if}
