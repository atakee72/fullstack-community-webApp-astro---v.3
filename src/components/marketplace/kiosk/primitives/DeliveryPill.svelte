<script lang="ts">
  import { t } from '../../../../lib/kiosk-i18n';

  type DeliveryKind = 'abholung' | 'versand' | 'abholungVersand';

  let { kind }: { kind?: DeliveryKind | null } = $props();

  const icon = $derived({
    abholung:        '↗',
    versand:         '✈',
    abholungVersand: '↗✈',
  }[kind ?? ''] ?? '');
</script>

{#if kind}
  <span class="delivery-pill">
    <span style="font-size: 9px; opacity: 0.7;">{icon}</span>
    {$t[`market.delivery.${kind}` as const]}
  </span>
{/if}
