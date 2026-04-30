<script lang="ts">
  // Ochre top banner shown above the post title when the author enters
  // edit mode on the detail page. Per JSX ForumEditDesktop (line 814).
  //
  // The ESC keyboard handler lives on the parent page, not here — this
  // component is purely presentational. The cancel button on the right
  // side is decorative copy ("ESC = abbrechen"); the parent already has
  // an explicit cancel button in the right rail.

  import { t } from '../../../../lib/kiosk-i18n';
</script>

<div
  class="bg-ochre text-ink border-y-2 border-ink px-5 md:px-9 py-2 flex justify-between items-center font-dmmono text-[11px] tracking-[0.08em] font-semibold uppercase"
  role="status"
>
  <span class="truncate normal-case">{$t['edit.banner.left']}</span>
  <span class="shrink-0 ml-3">{$t['edit.banner.right']}</span>
</div>
