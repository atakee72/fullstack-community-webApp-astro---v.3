<script lang="ts">
  // 3-card radio grid for listing kind selection.
  // Uses GERMAN rail keys (verkaufen / tausch / verschenken).
  // The orchestrator (compose page) translates to API enum (sell/exchange/gift).
  import { t } from '../../../../lib/kiosk-i18n';

  type Kind = 'verkaufen' | 'tausch' | 'verschenken';

  let {
    value,
    onChange
  }: {
    value: Kind | null;
    onChange: (k: Kind) => void;
  } = $props();

  const kinds: {
    id: Kind;
    labelKey: string;
    noteKey: string;
    icon: string;
    colorVar: string;
  }[] = [
    {
      id: 'verkaufen',
      labelKey: 'market.compose.kind.verkaufen',
      noteKey: 'market.compose.kind.verkaufen.note',
      icon: '€',
      colorVar: '--k-wine',
    },
    {
      id: 'tausch',
      labelKey: 'market.compose.kind.tausch',
      noteKey: 'market.compose.kind.tausch.note',
      icon: '↔',
      colorVar: '--k-teal',
    },
    {
      id: 'verschenken',
      labelKey: 'market.compose.kind.verschenken',
      noteKey: 'market.compose.kind.verschenken.note',
      icon: '✦',
      colorVar: '--k-moss',
    },
  ];
</script>

<div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
  {#each kinds as k (k.id)}
    {@const active = value === k.id}
    <button
      type="button"
      onclick={() => onChange(k.id)}
      style="
        background: {active ? `var(${k.colorVar})` : 'var(--k-paper-warm)'};
        color: {active ? 'var(--k-paper)' : 'var(--k-ink)'};
        border: {active ? '2px solid var(--k-ink)' : '1px solid var(--k-rule)'};
        border-radius: var(--k-radius-md);
        padding: 14px 16px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        cursor: pointer;
        box-shadow: {active ? '2px 2px 0 var(--k-ink)' : 'none'};
        text-align: left;
        width: 100%;
      "
    >
      <!-- Icon + radio row -->
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <!-- Icon — Instrument Serif italic -->
        <span
          style="
            font-family: var(--k-font-serif);
            font-style: italic;
            font-size: 28px;
            line-height: 1;
            color: {active ? 'var(--k-paper)' : `var(${k.colorVar})`};
          "
        >{k.icon}</span>

        <!-- Radio circle -->
        <span
          style="
            width: 18px; height: 18px;
            border-radius: 50%;
            border: 2px solid {active ? 'var(--k-paper)' : 'var(--k-ink-mute)'};
            background: {active ? 'var(--k-paper)' : 'transparent'};
            position: relative;
            display: inline-block;
            flex-shrink: 0;
          "
        >
          {#if active}
            <span
              style="
                position: absolute;
                inset: 3px;
                border-radius: 50%;
                background: var({k.colorVar});
              "
            ></span>
          {/if}
        </span>
      </div>

      <!-- Label -->
      <div
        style="
          font-family: var(--k-font-display);
          font-size: 17px;
          font-weight: 700;
          letter-spacing: -0.01em;
        "
      >{$t[k.labelKey as keyof typeof $t]}</div>

      <!-- Note — Instrument Serif italic -->
      <div
        style="
          font-family: var(--k-font-serif);
          font-style: italic;
          font-size: 12px;
          color: {active ? 'color-mix(in srgb, var(--k-paper) 80%, transparent)' : 'var(--k-ink-mute)'};
        "
      >{$t[k.noteKey as keyof typeof $t]}</div>
    </button>
  {/each}
</div>
