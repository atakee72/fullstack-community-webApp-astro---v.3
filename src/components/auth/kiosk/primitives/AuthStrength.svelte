<script lang="ts">
  import { t } from '../../../../lib/kiosk-i18n';

  let { score = 0 }: { score?: 0 | 1 | 2 | 3 | 4 } = $props();

  // segment color ramp by score (maps to existing kiosk state colors)
  const colors = ['var(--k-danger)', 'var(--k-danger)', 'var(--k-warn)', 'var(--k-moss)', 'var(--k-success)'];
  const fill = $derived(colors[score]);
  const label = $derived($t[`auth.strength.${score}` as keyof typeof $t]);
</script>

<div class="flex items-center" style="gap:8px; margin-top:7px;">
  <div class="flex" style="gap:4px; flex:1;">
    {#each [0, 1, 2, 3] as i}
      <div style="flex:1; height:5px; border-radius:3px; background:{i < score ? fill : 'var(--k-rule)'}; border:1px solid {i < score ? 'var(--k-ink)' : 'transparent'}; transition:background 220ms;"></div>
    {/each}
  </div>
  <span class="font-dmmono" style="font-size:9.5px; color:{fill}; letter-spacing:0.06em; width:48px; text-align:right;">{label}</span>
</div>
