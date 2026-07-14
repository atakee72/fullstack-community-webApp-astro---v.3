<script lang="ts">
  import { t } from '../../../lib/kiosk-i18n';
  // Sources line is a literal, per kiosk-kiezdaten.jsx:546 — not i18n (institution
  // names don't translate). ⎙ print route lands in Task 10; dead link until then.
</script>

<footer class="flex flex-col items-start gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-9 lg:py-6">
  <div class="font-mono text-[10px] leading-relaxed text-[var(--k-ink-mute)]">
    {$t['kiez.footer.sources']}: Amt für Statistik Berlin-Brandenburg · Monitoring Soziale Stadtentwicklung · BLUME-Messnetz (mc042)<br />
    † {$t['kiez.footer.loggerNote']}
  </div>
  <a
    href="/schillerkiez/druck"
    class="inline-flex min-h-[44px] items-center whitespace-nowrap rounded-full border-[1.5px] border-[var(--k-ink)] px-4 py-2 font-mono text-[11.5px] font-semibold text-[var(--k-ink)] shadow-[2px_2px_0_var(--k-ink)]"
  >{$t['kiez.footer.print']}</a>
</footer>
