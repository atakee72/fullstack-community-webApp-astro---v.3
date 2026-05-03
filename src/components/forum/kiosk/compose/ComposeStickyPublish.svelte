<script lang="ts">
  // Mobile-only sticky publish bar for /topics/create.
  // Sits above the kiosk mobile nav (bottom-0 h-12), respects iOS
  // safe-area. Hidden on lg+ where the desktop sidebar's publish button
  // already covers this surface.
  //
  // Wired by ComposePageInner: receives onPublish + submitting from the
  // same handlers/state the desktop ComposePreview consumes.

  import KioskBtn from '../KioskBtn.svelte';
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
    {$t['compose.cta.publish']}
  </KioskBtn>
</div>
