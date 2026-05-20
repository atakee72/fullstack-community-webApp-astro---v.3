<script lang="ts">
  // 3-radio delivery option selector.
  // Enum values: abholung / versand / abholungVersand
  import { t } from '../../../../lib/kiosk-i18n';
  import type { ListingDelivery } from '../../../../types/listing';

  let {
    value,
    onChange
  }: {
    value: ListingDelivery | null;
    onChange: (v: ListingDelivery) => void;
  } = $props();

  type DeliveryOption = {
    id: ListingDelivery;
    labelKey: string;
    icon: string;
    noteKey: string;
  };

  const OPTIONS: DeliveryOption[] = [
    {
      id: 'abholung',
      labelKey: 'market.delivery.abholung',
      icon: '↗',
      noteKey: 'market.compose.delivery.abholung',
    },
    {
      id: 'versand',
      labelKey: 'market.delivery.versand',
      icon: '✈',
      noteKey: 'market.compose.delivery.versand',
    },
    {
      id: 'abholungVersand',
      labelKey: 'market.delivery.abholungVersand',
      icon: '↗✈',
      noteKey: 'market.compose.delivery.abholungVersand',
    },
  ];
</script>

<div style="display: flex; flex-direction: column; gap: 4px;">
  {#each OPTIONS as opt (opt.id)}
    {@const active = value === opt.id}
    <label
      style="
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 12px;
        background: {active ? 'var(--k-paper-warm)' : 'transparent'};
        border: {active ? '1.5px solid var(--k-ink)' : '1px solid var(--k-rule)'};
        border-radius: var(--k-radius-sm);
        font-size: 13px;
        font-weight: {active ? 600 : 500};
        cursor: pointer;
        user-select: none;
      "
    >
      <!-- Hidden native radio -->
      <input
        type="radio"
        name="delivery"
        value={opt.id}
        checked={active}
        onchange={() => onChange(opt.id)}
        style="position: absolute; opacity: 0; width: 0; height: 0;"
      />

      <!-- Custom radio circle -->
      <span
        style="
          width: 16px; height: 16px;
          border-radius: 50%;
          border: 2px solid {active ? 'var(--k-ink)' : 'var(--k-ink-mute)'};
          background: {active ? 'var(--k-ink)' : 'transparent'};
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        "
      >
        {#if active}
          <span
            style="
              position: absolute;
              inset: 3px;
              border-radius: 50%;
              background: var(--k-paper);
            "
          ></span>
        {/if}
      </span>

      <!-- Icon -->
      <span
        style="
          font-family: var(--k-font-mono);
          font-size: 12px;
          color: {active ? 'var(--k-ink)' : 'var(--k-ink-mute)'};
          flex-shrink: 0;
        "
      >{opt.icon}</span>

      <!-- Label -->
      <span style="flex: 1; color: {active ? 'var(--k-ink)' : 'var(--k-ink-soft)'};">
        {$t[opt.labelKey as keyof typeof $t]}
      </span>

      <!-- Small note (italic) -->
      <span
        style="
          font-family: var(--k-font-serif);
          font-style: italic;
          font-size: 11px;
          color: var(--k-ink-mute);
        "
      >{$t[opt.noteKey as keyof typeof $t]}</span>
    </label>
  {/each}
</div>
