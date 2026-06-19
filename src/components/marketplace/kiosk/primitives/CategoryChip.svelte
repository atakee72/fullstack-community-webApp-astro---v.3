<script lang="ts">
  import { t } from '../../../../lib/kiosk-i18n';
  import { resolveCategory } from '../../../../lib/marketplaceResolvers';

  type CatKey =
    | 'moebel' | 'garten' | 'werkzeug' | 'kleidung' | 'medien' | 'elektronik'
    | 'fahrrad' | 'pflanze' | 'kinder' | 'spielzeug' | 'handgemacht' | 'sport' | 'sonstiges';

  let { id, active = false, mini = false }:
    { id: string | null | undefined; active?: boolean; mini?: boolean } = $props();

  const resolved = $derived(resolveCategory(id));

  // Pull label via i18n only when it's a known kiosk key; legacy strings render as-is.
  const label = $derived(
    !resolved.legacy && resolved.key
      ? $t[`market.cat.${resolved.key as CatKey}` as const]
      : resolved.label
  );
</script>

{#if resolved.key && !resolved.legacy}
  <span
    class="cat-chip {mini ? 'cat-chip--mini' : ''} {active ? 'cat-chip--active' : ''}"
    style="--cat-color: var({resolved.token}); --cat-fg: var(--cat-{resolved.key}-fg);"
  >
    {label}
  </span>
{/if}
