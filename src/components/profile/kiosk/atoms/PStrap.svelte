<script lang="ts">
  // Moderation-status strap for the profile surface — reuses the shared
  // `.kiosk-strap` geometry (tokens.css) but with profile-specific per-kind
  // colors (not the marketplace strap variant classes — those map to
  // different semantics, e.g. `bildAbgelehnt` vs plain `abgelehnt`).
  // Design source: kiosk-profile.jsx (PStrap).

  import { t } from '../../../../lib/kiosk-i18n';

  type StrapKind = 'pruefung' | 'reserviert' | 'abgelehnt';

  let { kind }: { kind: StrapKind } = $props();

  const COLORS: Record<StrapKind, { bg: string; fg: string }> = {
    pruefung: { bg: 'var(--k-ochre)', fg: 'var(--k-ink)' },
    reserviert: { bg: 'var(--k-plum)', fg: 'var(--k-paper)' },
    abgelehnt: { bg: 'var(--k-danger)', fg: 'var(--k-paper)' },
  };

  const c = $derived(COLORS[kind]);
  const label = $derived($t[`profile.strap.${kind}` as keyof typeof $t]);
</script>

<span
  class="kiosk-strap kiosk-strap--small"
  style="background: {c.bg}; color: {c.fg};"
>{label}</span>
