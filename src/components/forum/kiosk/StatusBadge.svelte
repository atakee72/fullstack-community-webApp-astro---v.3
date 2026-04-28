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

  // German labels — lowercase to match the canvas treatment (i18n swap in Phase 3).
  const defaultLabel = $derived({
    pending:  'in prüfung',
    approved: 'veröffentlicht',
    rejected: 'abgelehnt',
    flagged:  'ai-markiert',
    reported: 'gemeldet',
    warning:  'mit hinweis'
  }[state]);

  // Each state owns a unique glyph — readers can scan by shape, not just color.
  //   ● solid circle  → approved (settled, public)
  //   ◐ half-moon     → pending  (in transit through moderation)
  //   ×  cross         → rejected (closed, denied)
  //   ⚠ warning tri.  → flagged / warning (caution, content is up but flagged)
  //   ⚑ flag           → reported (community-flagged via 🚩)
  const icon = $derived({
    approved: '●',
    pending:  '◐',
    rejected: '×',
    flagged:  '⚠',
    reported: '⚑',
    warning:  '⚠'
  }[state]);

  // Border + text both share the state color — bg stays transparent so the
  // paper bg shows through (matches the canvas treatment).
  const tone = $derived({
    approved: 'border-success text-success',
    pending:  'border-ochre   text-ochre',
    rejected: 'border-danger  text-danger',
    flagged:  'border-ochre   text-ochre',
    reported: 'border-plum    text-plum',
    warning:  'border-ochre   text-ochre'
  }[state]);

  // Lowercase + mono — no uppercase tracking. Slightly more horizontal padding
  // to match the canvas pill proportions.
  const sizeClass = $derived({
    sm: 'px-2.5 py-0.5 text-[10px] gap-1',
    md: 'px-3 py-0.5 text-[11px] gap-1.5'
  }[size]);

  const isPulsing = $derived(state === 'pending');
</script>

<span
  class={`inline-flex items-center rounded-md border font-jetbrains font-medium ${sizeClass} ${tone} ${extraClass}`}
>
  <span aria-hidden="true" class={`leading-none ${isPulsing ? 'k-pulse-dot' : ''}`}>{icon}</span>
  {label ?? defaultLabel}
</span>
