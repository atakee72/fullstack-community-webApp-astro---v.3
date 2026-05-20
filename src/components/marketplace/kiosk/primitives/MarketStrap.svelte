<script lang="ts">
  import { t } from '../../../../lib/kiosk-i18n';

  type StrapKind =
    | 'gratis' | 'tausch' | 'bump' | 'altpapier' | 'altbestand'
    | 'pruefung' | 'bildAbgelehnt' | 'reserviert' | 'verkauft' | 'entwurf';

  let { kind, small = false }: { kind: StrapKind; small?: boolean } = $props();

  const label = $derived($t[`market.strap.${kind}` as const]);

  const variantClass = $derived({
    gratis:        'kiosk-strap--gratis',
    tausch:        'kiosk-strap--tausch',
    bump:          'kiosk-strap--bump',
    altpapier:     'kiosk-strap--altpapier kiosk-strap--faded',
    altbestand:    'kiosk-strap--altbestand',
    pruefung:      'kiosk-strap--pruefung',
    bildAbgelehnt: 'kiosk-strap--bildAbgelehnt',
    reserviert:    'kiosk-strap--reserviert',
    verkauft:      'kiosk-strap--verkauft kiosk-strap--struck kiosk-strap--faded',
    entwurf:       'kiosk-strap--entwurf kiosk-strap--outline',
  }[kind]);
</script>

<span class="kiosk-strap {small ? 'kiosk-strap--small' : ''} {variantClass}">{label}</span>
