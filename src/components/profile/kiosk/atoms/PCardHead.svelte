<script lang="ts">
  // Card section head — "§{n}  Title" baseline row used at the top of every
  // profile card (Moderation, Konto, Archiv, …).
  // Design source: kiosk-profile.jsx (PCardHead).

  let {
    n,
    title,
    accent = 'var(--k-ochre)',
  }: {
    n: string;
    title: string;
    accent?: string;
  } = $props();
</script>

<div style="display: flex; align-items: baseline; gap: 8px; margin-bottom: 12px;">
  <span style="font-family: var(--k-font-mono); font-size: 10px; color: {accent}; font-weight: 600;">§{n}</span>
  <span style="font-family: var(--k-font-display); font-size: 15px; font-weight: 800; letter-spacing: -0.01em;">{title}</span>
</div>
