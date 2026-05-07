<script lang="ts">
  // Mobile-only sticky publish bar for /events/create.
  // Mirrors `forum/kiosk/compose/ComposeStickyPublish.svelte` (same
  // bottom-12 + safe-area-inset pattern) so the user doesn't have to
  // scroll past the 6 form sections to reach the publish CTA.
  // Hidden on lg+ — the desktop preview rail covers that surface.

  import KioskBtn from '../../../forum/kiosk/KioskBtn.svelte';
  import { t } from '../../../../lib/kiosk-i18n';

  let { onPublish, submitting = false } = $props<{
    onPublish: () => void;
    submitting?: boolean;
  }>();
</script>

<div
  class="fixed bottom-12 inset-x-0 z-30 lg:hidden bg-paper border-t-[1.5px] border-ink px-4 pt-2.5"
  style="padding-bottom: max(0.625rem, env(safe-area-inset-bottom));"
>
  <KioskBtn
    variant="primary"
    size="lg"
    onclick={onPublish}
    disabled={submitting}
    class="w-full"
  >
    {$t['cal.compose.cta.publish']}
  </KioskBtn>
</div>
