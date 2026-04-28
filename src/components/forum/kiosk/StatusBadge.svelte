<script lang="ts">
  // Moderation lifecycle indicator. State map:
  //   pending  — AI still scanning (Sprache/Inhalt/Kontext/Bilder)
  //   approved — through the pipeline, public
  //   rejected — moderator rejected; author sees reason + appeal
  //   flagged  — AI flagged but not yet reviewed (admin queue)
  //   reported — community reported via 🚩; awaiting admin
  //   warning  — approved-with-warning; content blurred until revealed

  let {
    state,
    size = 'md',
    label,
    class: extraClass = ''
  } = $props<{
    state: 'pending' | 'approved' | 'rejected' | 'flagged' | 'reported' | 'warning';
    size?: 'sm' | 'md';
    label?: string; // optional override for i18n
    class?: string;
  }>();

  // German labels (i18n in Phase 3 will swap these via dictionary).
  const defaultLabel = $derived({
    pending:  'in Prüfung',
    approved: 'veröffentlicht',
    rejected: 'abgelehnt',
    flagged:  'AI-markiert',
    reported: 'gemeldet',
    warning:  'mit Hinweis'
  }[state]);

  // Soft tinted bg + colored border + matching dot. Border-led to read on cream paper.
  const tone = $derived({
    pending:  { bg: 'bg-ochre/15',   border: 'border-ochre',   dot: 'bg-ochre',   text: 'text-ink' },
    approved: { bg: 'bg-success/15', border: 'border-success', dot: 'bg-success', text: 'text-ink' },
    rejected: { bg: 'bg-danger/15',  border: 'border-danger',  dot: 'bg-danger',  text: 'text-danger' },
    flagged:  { bg: 'bg-ochre/15',   border: 'border-ochre',   dot: 'bg-ochre',   text: 'text-ink' },
    reported: { bg: 'bg-warn/15',    border: 'border-warn',    dot: 'bg-warn',    text: 'text-ink' },
    warning:  { bg: 'bg-warn/15',    border: 'border-warn',    dot: 'bg-warn',    text: 'text-ink' }
  }[state]);

  const sizeClass = $derived({
    sm: 'px-2 py-0.5 text-[9px] gap-1',
    md: 'px-2.5 py-0.5 text-[10px] gap-1.5'
  }[size]);

  const dotSize = $derived(size === 'sm' ? 'w-1 h-1' : 'w-1.5 h-1.5');
  const isPulsing = $derived(state === 'pending' || state === 'flagged');
</script>

<span
  class={`inline-flex items-center rounded-full border font-jetbrains uppercase tracking-[0.12em] font-semibold ${sizeClass} ${tone.bg} ${tone.border} ${tone.text} ${extraClass}`}
>
  <span class={`${dotSize} rounded-full ${tone.dot} ${isPulsing ? 'k-pulse-dot' : ''}`}></span>
  {label ?? defaultLabel}
</span>
