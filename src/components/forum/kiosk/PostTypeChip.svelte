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

  // Per-kind accent (mirrors tokens.css). $derived so reactive to prop changes.
  const dotBg = $derived({
    discussion:     'bg-wine',
    recommendation: 'bg-moss',
    announcement:   'bg-ochre'
  }[kind]);

  const filledBg = $derived({
    discussion:     'bg-wine text-paper border-wine',
    recommendation: 'bg-moss text-paper border-moss',
    announcement:   'bg-ochre text-ink border-ochre'
  }[kind]);

  const sizeClass = $derived({
    sm: 'px-2 py-0.5 text-[9px] gap-1',
    md: 'px-2.5 py-0.5 text-[10px] gap-1.5'
  }[size]);

  const dotSize = $derived(size === 'sm' ? 'w-1 h-1' : 'w-1.5 h-1.5');

  const interactive = $derived(onclick ? 'cursor-pointer hover:opacity-90' : '');
  const tag = $derived(onclick ? 'button' : 'span');
</script>

<svelte:element
  this={tag}
  type={onclick ? 'button' : undefined}
  role={onclick ? 'button' : undefined}
  {onclick}
  class={`inline-flex items-center rounded-full font-jetbrains uppercase tracking-[0.12em] font-semibold border ${sizeClass} ${
    selected ? filledBg : 'bg-transparent text-ink border-ink'
  } ${interactive} ${extraClass}`}
>
  <span class={`${dotSize} rounded-full ${selected && kind === 'announcement' ? 'bg-ink' : selected ? 'bg-paper' : dotBg}`}></span>
  {labels[kind]}
</svelte:element>
