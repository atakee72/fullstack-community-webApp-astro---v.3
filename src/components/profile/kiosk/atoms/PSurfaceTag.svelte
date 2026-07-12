<script lang="ts">
  // Cross-surface tag — 7px dot + mono uppercase label, colored per surface.
  // Shared by PModerationCard's rejected rows (Task 8) and the activity
  // ledger (Task 9). Colors per kiosk-profile.jsx SURFACE_META: forum + markt
  // are wine, kalender is teal, kurier is ink.
  // Design source: kiosk-profile.jsx (PSurfaceTag).

  import { t } from '../../../../lib/kiosk-i18n';
  import type { ActivitySurface } from '../../../../lib/profile/profileShared';

  let { surface }: { surface: ActivitySurface } = $props();

  const SURFACE_COLOR: Record<ActivitySurface, string> = {
    forum: 'var(--k-wine)',
    markt: 'var(--k-wine)',
    kalender: 'var(--k-teal)',
    kurier: 'var(--k-ink)',
  };

  const color = $derived(SURFACE_COLOR[surface]);
  const label = $derived($t[`profile.surface.${surface}` as keyof typeof $t]);
</script>

<span
  style="
    display: inline-flex; align-items: center; gap: 5px;
    font-family: var(--k-font-mono); font-size: 9.5px; font-weight: 500;
    letter-spacing: 0.12em; color: {color};
  "
>
  <span
    style="width: 7px; height: 7px; border-radius: 50%; background: {color}; border: 1px solid var(--k-ink);"
  ></span>
  {label}
</span>
