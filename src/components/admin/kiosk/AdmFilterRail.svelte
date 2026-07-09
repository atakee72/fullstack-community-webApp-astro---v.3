<script lang="ts">
  /**
   * Filter rail — Alle + 7 content types + ⚑ Gemeldet (ochre-outline).
   * Transcribed from design/handoffs/design_handoff_admin/jsx/kiosk-admin.jsx:300-320.
   */
  import { t } from '../../../lib/kiosk-i18n';
  import { ADM_TYPES } from '../../../lib/adminModeration';

  type FilterId = 'all' | (typeof ADM_TYPES)[number] | 'reported';

  let {
    active = 'all',
    onFilterChange,
  }: {
    active?: FilterId;
    onFilterChange: (id: FilterId) => void;
  } = $props();

  const items: { id: FilterId; labelKey: string }[] = [
    { id: 'all', labelKey: 'admin.filter.all' },
    ...ADM_TYPES.map((type) => ({ id: type as FilterId, labelKey: `admin.type.${type}` })),
    { id: 'reported', labelKey: 'admin.filter.reported' },
  ];
</script>

<div style="display: flex; gap: 8px; flex-wrap: wrap; padding: 14px 36px;">
  {#each items as it (it.id)}
    <button
      type="button"
      onclick={() => onFilterChange(it.id)}
      class="font-bricolage"
      style="
        padding: 5px 12px; font-size: 12.5px; font-weight: 600;
        background: {active === it.id ? 'var(--k-ink)' : 'transparent'};
        color: {active === it.id ? 'var(--k-paper)' : it.id === 'reported' ? 'var(--k-ochre)' : 'var(--k-ink)'};
        border: {it.id === 'reported' ? '1.5px solid var(--k-ochre)' : 'var(--k-border-ink)'};
        border-radius: var(--k-radius-pill); cursor: pointer;
      "
    >{$t[it.labelKey as keyof typeof $t]}</button>
  {/each}
</div>
