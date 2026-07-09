<script lang="ts">
  /**
   * Content-type chip (DISKUSSION / KOMMENTAR / …). Transcribed from
   * design/handoffs/design_handoff_admin/jsx/kiosk-admin.jsx:135-144.
   */
  import { t } from '../../../lib/kiosk-i18n';

  let { type }: { type: string } = $props();

  // Dynamic key lookup — cast through Record<string,string> since `type` is
  // an unconstrained string (ADM_TYPES member in practice, but defensive
  // against unknown/legacy values). Falls back to the raw type string.
  const label = $derived((($t as Record<string, string>)[`admin.type.${type}`] ?? type).toUpperCase());
</script>

<span
  style="
    font-family: var(--k-font-mono); font-size: 10px; letter-spacing: 0.06em;
    color: var(--k-ink-soft); background: var(--k-paper-soft);
    padding: 3px 9px; border-radius: var(--k-radius-sm); border: 1px solid var(--k-rule);
  "
>{label}</span>
