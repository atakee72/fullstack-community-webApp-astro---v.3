<script lang="ts">
  // Layout badge — renders nothing for 'standard'. Shared atom reused by
  // column cards, the lead card context, and Task 3/4/5 surfaces.
  import { t } from '../../../lib/kiosk-i18n';
  import type { BeilagePost } from '../../../lib/blog/beilage';

  let { layout }: { layout: BeilagePost['layout'] } = $props();
</script>

{#if layout !== 'standard'}
  <span
    class="font-dmmono tracking-wide"
    style="
      font-size: 9px;
      color: var(--k-rust-deep);
      border: 1px solid color-mix(in srgb, var(--k-rust) 40%, transparent);
      border-radius: var(--k-radius-sm);
      padding: 1px 6px;
    "
  >{layout === 'hero' ? $t['blog.badge.hero'] : $t['blog.badge.gallery']}</span>
{/if}
