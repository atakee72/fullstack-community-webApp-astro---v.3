<script lang="ts">
  import { t } from '../../../../lib/kiosk-i18n';
  import type { Listing, ListingCondition } from '../../../../types/listing';

  let {
    listing,
  }: {
    listing: Pick<Listing, 'condition' | 'specs'>;
  } = $props();

  const hasAnySpec = $derived(
    (listing.condition !== null && listing.condition !== undefined) ||
    (listing.specs != null && Object.values(listing.specs).some((v) => v && v.trim()))
  );

  // Condition label from i18n (market.condition.{value})
  const conditionLabel = $derived(
    listing.condition
      ? $t[`market.condition.${listing.condition}` as `market.condition.${ListingCondition}`]
      : null
  );

  // Spec-strip pairs — label from i18n, value from listing.specs
  const specPairs = $derived.by(() => {
    const pairs: Array<{ labelKey: string; label: string; value: string }> = [];

    if (conditionLabel) {
      pairs.push({ labelKey: 'market.detail.spec.zustand', label: $t['market.detail.spec.zustand'], value: conditionLabel });
    }
    const specs = listing.specs;
    if (specs) {
      if (specs.masse?.trim())    pairs.push({ labelKey: 'market.detail.spec.masse',    label: $t['market.detail.spec.masse'],    value: specs.masse });
      if (specs.material?.trim()) pairs.push({ labelKey: 'market.detail.spec.material', label: $t['market.detail.spec.material'], value: specs.material });
      if (specs.baujahr?.trim())  pairs.push({ labelKey: 'market.detail.spec.baujahr',  label: $t['market.detail.spec.baujahr'],  value: specs.baujahr });
      if (specs.farbe?.trim())    pairs.push({ labelKey: 'market.detail.spec.farbe',    label: $t['market.detail.spec.farbe'],    value: specs.farbe });
      if (specs.gewicht?.trim())  pairs.push({ labelKey: 'market.detail.spec.gewicht',  label: $t['market.detail.spec.gewicht'],  value: specs.gewicht });
    }
    return pairs;
  });
</script>

{#if hasAnySpec}
  <div
    style="
      display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 0;
      padding: 12px 14px;
      background: var(--k-paper-soft, var(--k-paper));
      border: 1px solid var(--k-rule);
      border-radius: var(--k-radius-md);
    "
  >
    {#each specPairs as pair, i}
      {#if i > 0}
        <span
          style="
            font-family: var(--k-font-mono); font-size: 10px;
            color: var(--k-ink-mute); padding: 0 8px;
          "
          aria-hidden="true"
        >·</span>
      {/if}
      <div style="display: inline-flex; flex-direction: column; gap: 1px;">
        <span
          style="
            font-family: var(--k-font-mono); font-size: 10px;
            color: var(--k-ink-mute); text-transform: uppercase;
            letter-spacing: 0.12em; line-height: 1.2;
          "
        >{pair.label}</span>
        <span
          style="
            font-family: var(--k-font-display); font-size: 14px;
            color: var(--k-ink); font-weight: 600; line-height: 1.2;
          "
        >{pair.value}</span>
      </div>
    {/each}
  </div>
{/if}
