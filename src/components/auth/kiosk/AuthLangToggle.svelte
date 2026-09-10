<script lang="ts">
  import { locale, setLocale } from '../../../lib/kiosk-i18n';
</script>

<!-- Same anatomy as KioskNav's DE/EN pill: fixed painted height, no
     `overflow:hidden` (the buttons spill past it vertically), `.kiosk-tap-box`
     buttons for a 44px touch target, paint on inner spans that fill the button
     (`width:100%`). Below lg the pill therefore widens to two equal 44px
     halves exactly like the app masthead's; desktop keeps the compact size. -->
<div class="flex items-center font-dmmono" style="height:29.5px; border:1.5px solid var(--k-ink); border-radius:999px; font-size:11px; font-weight:600;" role="group" aria-label="Language">
  <button type="button" onclick={() => setLocale('de')}
    class="kiosk-tap-box inline-flex items-center justify-center"
    aria-pressed={$locale === 'de'}
    style="background:none; border:none; padding:0; cursor:pointer;">
    <span class="inline-flex items-center justify-center" style="width:100%; height:26.5px; padding:0 11px; border-radius:999px 0 0 999px; background:{$locale === 'de' ? 'var(--k-ink)' : 'transparent'}; color:{$locale === 'de' ? 'var(--k-paper)' : 'var(--k-ink)'};">DE</span>
  </button>
  <button type="button" onclick={() => setLocale('en')}
    class="kiosk-tap-box inline-flex items-center justify-center"
    aria-pressed={$locale === 'en'}
    style="background:none; border:none; padding:0; cursor:pointer;">
    <!-- divider lives on the span, not the button: the button is 44px tall on
         touch viewports and a border there would paint past the pill. -->
    <span class="inline-flex items-center justify-center" style="width:100%; height:26.5px; padding:0 11px; border-left:1.5px solid var(--k-ink); border-radius:0 999px 999px 0; background:{$locale === 'en' ? 'var(--k-ink)' : 'transparent'}; color:{$locale === 'en' ? 'var(--k-paper)' : 'var(--k-ink)'};">EN</span>
  </button>
</div>
