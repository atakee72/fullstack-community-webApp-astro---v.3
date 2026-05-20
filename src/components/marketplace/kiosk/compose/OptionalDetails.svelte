<script lang="ts">
  // Optional details section (§06) — condition dropdown + 5 free-text spec fields.
  // All fields are optional; filled values appear as a spec strip on the listing.
  import { t } from '../../../../lib/kiosk-i18n';
  import type { ListingCondition } from '../../../../types/listing';

  type Specs = {
    masse?: string;
    material?: string;
    baujahr?: string;
    farbe?: string;
    gewicht?: string;
  } | null;

  let {
    condition,
    specs,
    onConditionChange,
    onSpecsChange
  }: {
    condition: ListingCondition | null;
    specs: Specs;
    onConditionChange: (c: string | null) => void;
    onSpecsChange: (s: Specs) => void;
  } = $props();

  // Condition options — enum values with i18n labels
  const CONDITIONS: { value: ListingCondition; labelKey: string }[] = [
    { value: 'like-new',   labelKey: 'market.condition.like-new' },
    { value: 'excellent',  labelKey: 'market.condition.excellent' },
    { value: 'very-good',  labelKey: 'market.condition.very-good' },
    { value: 'good',       labelKey: 'market.condition.good' },
    { value: 'fair',       labelKey: 'market.condition.fair' },
  ];

  // Spec field definitions
  type SpecKey = keyof NonNullable<Specs>;
  const SPEC_FIELDS: { key: SpecKey; labelKey: string; max: number }[] = [
    { key: 'masse',    labelKey: 'market.compose.optional.masse',    max: 80 },
    { key: 'material', labelKey: 'market.compose.optional.material', max: 80 },
    { key: 'baujahr',  labelKey: 'market.compose.optional.baujahr',  max: 20 },
    { key: 'farbe',    labelKey: 'market.compose.optional.farbe',    max: 40 },
    { key: 'gewicht',  labelKey: 'market.compose.optional.gewicht',  max: 40 },
  ];

  function handleConditionChange(e: Event) {
    const val = (e.currentTarget as HTMLSelectElement).value;
    onConditionChange(val || null);
  }

  function handleSpecChange(key: SpecKey, value: string) {
    const current = specs ?? {};
    const updated: Specs = { ...current, [key]: value || undefined };
    onSpecsChange(updated);
  }

  function specValue(key: SpecKey): string {
    return specs?.[key] ?? '';
  }
</script>

<div>
  <!-- Section intro -->
  <p
    style="
      font-family: var(--k-font-serif);
      font-style: italic;
      font-size: 13px;
      color: var(--k-ink-soft);
      margin-bottom: 12px;
      line-height: 1.4;
    "
  >{$t['market.compose.optional.intro']}</p>

  <!-- 3-col grid: condition + 5 spec fields -->
  <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">

    <!-- Condition — dropdown, first in grid -->
    <div>
      <div
        style="
          font-family: var(--k-font-mono);
          font-size: 9px;
          color: var(--k-ink-mute);
          letter-spacing: 0.1em;
          margin-bottom: 4px;
          text-transform: uppercase;
        "
      >{$t['market.detail.spec.zustand']}</div>
      <select
        value={condition ?? ''}
        onchange={handleConditionChange}
        style="
          width: 100%;
          background: {condition ? 'var(--k-paper-warm)' : 'var(--k-paper-soft)'};
          border: {condition ? '1.5px solid var(--k-ink)' : '1px dashed var(--k-rule)'};
          border-radius: var(--k-radius-sm);
          padding: 7px 10px;
          font-family: var(--k-font-display);
          font-size: 13px;
          font-weight: {condition ? 600 : 400};
          color: {condition ? 'var(--k-ink)' : 'var(--k-ink-mute)'};
          appearance: auto;
          cursor: pointer;
        "
      >
        <option value="">—</option>
        {#each CONDITIONS as opt (opt.value)}
          <option value={opt.value}>{$t[opt.labelKey as keyof typeof $t]}</option>
        {/each}
      </select>
    </div>

    <!-- 5 free-text spec fields -->
    {#each SPEC_FIELDS as field (field.key)}
      {@const val = specValue(field.key)}
      <div>
        <div
          style="
            font-family: var(--k-font-mono);
            font-size: 9px;
            color: var(--k-ink-mute);
            letter-spacing: 0.1em;
            margin-bottom: 4px;
            text-transform: uppercase;
          "
        >{$t[field.labelKey as keyof typeof $t]}</div>
        <input
          type="text"
          value={val}
          maxlength={field.max}
          oninput={(e) => handleSpecChange(field.key, (e.currentTarget as HTMLInputElement).value)}
          style="
            width: 100%;
            background: {val ? 'var(--k-paper-warm)' : 'var(--k-paper-soft)'};
            border: {val ? '1.5px solid var(--k-ink)' : '1px dashed var(--k-rule)'};
            border-radius: var(--k-radius-sm);
            padding: 7px 10px;
            font-family: var(--k-font-display);
            font-size: 13px;
            font-weight: {val ? 600 : 400};
            color: {val ? 'var(--k-ink)' : 'var(--k-ink-mute)'};
            outline: none;
            box-sizing: border-box;
          "
          placeholder="—"
        />
      </div>
    {/each}
  </div>

  <!-- Moderation note -->
  <div
    style="
      margin-top: 10px;
      padding: 8px 10px;
      background: var(--k-paper-soft);
      border: 1px solid var(--k-rule);
      border-radius: var(--k-radius-sm);
      font-family: var(--k-font-mono);
      font-size: 10px;
      color: var(--k-ink-soft);
      line-height: 1.5;
    "
  >{$t['market.compose.optional.modNote']}</div>
</div>
