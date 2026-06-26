<script lang="ts">
  import { locale, setLocale } from '../../../lib/kiosk-i18n';
</script>

<div class="flex font-dmmono" style="border:1.5px solid var(--k-ink); border-radius:999px; overflow:hidden; font-size:11px; font-weight:600;">
  <button type="button" onclick={() => setLocale('de')}
    style="padding:5px 11px; background:{$locale === 'de' ? 'var(--k-ink)' : 'transparent'}; color:{$locale === 'de' ? 'var(--k-paper)' : 'var(--k-ink)'}; border:none; cursor:pointer;">DE</button>
  <button type="button" onclick={() => setLocale('en')}
    style="padding:5px 11px; background:{$locale === 'en' ? 'var(--k-ink)' : 'transparent'}; color:{$locale === 'en' ? 'var(--k-paper)' : 'var(--k-ink)'}; border:none; border-left:1.5px solid var(--k-ink); cursor:pointer;">EN</button>
</div>
