<script lang="ts">
  // Maps to the three forum sub-collections in the existing data layer:
  //   discussion    → topics
  //   recommendation → recommendations
  //   announcement  → announcements
  //
  // `selected` switches between an outlined pill (filter / picker idle)
  // and a filled pill (active filter, or the chosen kind on a card).

  let {
    kind,
    selected = false,
    size = 'md',
    onclick,
    class: extraClass = ''
  } = $props<{
    kind: 'discussion' | 'recommendation' | 'announcement';
    selected?: boolean;
    size?: 'sm' | 'md';
    onclick?: (e: MouseEvent) => void;
    class?: string;
  }>();

  // German labels — the canvas shows DE primary; EN handled later by i18n.
  const labels = {
    discussion:     'Diskussion',
    recommendation: 'Empfehlung',
    announcement:   'Ankündigung'
  };

  // Per-kind accent — matches the canvas semantic palette:
  //   discussion (topic)    → wine
  //   recommendation        → moss
  //   announcement          → teal
  const dotBg = $derived({
    discussion:     'bg-wine',
    recommendation: 'bg-moss',
    announcement:   'bg-teal'
  }[kind]);

  // Selected state gets the canonical Kiosk button treatment: ink border + stacked
  // ink offset shadow. Same chrome as KioskBtn primary, just with the kind's
  // brand color filling the pill.
  const filledBg = $derived({
    discussion:     'bg-wine text-paper border-ink',
    recommendation: 'bg-moss text-paper border-ink',
    announcement:   'bg-teal text-paper border-ink'
  }[kind]);

  const sizeClass = $derived({
    sm: 'px-2.5 py-0.5 text-[10px] gap-1',
    md: 'px-3 py-1 text-[11px] gap-1.5'
  }[size]);

  const dotSize = $derived(size === 'sm' ? 'w-1 h-1' : 'w-1.5 h-1.5');

  const interactive = $derived(onclick ? 'cursor-pointer' : '');
  const tag = $derived(onclick ? 'button' : 'span');

  // Selected pills lift like buttons; idle pills sit flat.
  const liftClass = $derived(
    selected
      ? 'shadow-[2px_2px_0_var(--k-ink)] hover:shadow-[3px_3px_0_var(--k-ink)] active:shadow-[1px_1px_0_var(--k-ink)] hover:-translate-x-px hover:-translate-y-px active:translate-x-px active:translate-y-px transition-all duration-[180ms] ease-out'
      : ''
  );
</script>

<svelte:element
  this={tag}
  type={onclick ? 'button' : undefined}
  role={onclick ? 'button' : undefined}
  {onclick}
  class={`inline-flex items-center rounded-md font-dmmono uppercase tracking-[0.12em] font-semibold border-2 ${sizeClass} ${
    selected ? filledBg : 'bg-transparent text-ink border-ink'
  } ${liftClass} ${interactive} ${extraClass}`}
>
  {#if !selected}
    <span class={`${dotSize} rounded-full ${dotBg}`}></span>
  {/if}
  {labels[kind]}
</svelte:element>
