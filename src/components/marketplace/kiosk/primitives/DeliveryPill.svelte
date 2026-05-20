<script lang="ts">
  import { t } from '../../../../lib/kiosk-i18n';

  type DeliveryKind = 'abholung' | 'versand' | 'abholungVersand';
  const ICONS: Record<DeliveryKind, string> = {
    abholung:        '↗',
    versand:         '✈',
    abholungVersand: '↗✈',
  };

  let { kind }: { kind?: string | null } = $props();

  // Guard against legacy/unknown delivery strings (pre-A3 data). The pill renders
  // nothing for anything outside the 3-value enum — matches A3's "nullable on read,
  // omitted from filter rail" rule.
  const validKind = $derived(
    kind != null && (kind in ICONS) ? (kind as DeliveryKind) : null
  );
</script>

{#if validKind}
  <span class="delivery-pill">
    <span style="font-size: 9px; opacity: 0.7;">{ICONS[validKind]}</span>
    {$t[`market.delivery.${validKind}` as const]}
  </span>
{/if}
