<script lang="ts">
  import { t } from '../../../../lib/kiosk-i18n';
  import { SEKTION_KEYS, SEKTION_TOKEN, type SektionKey } from '../../../../lib/newsboard/newsTaxonomy';
  let {
    value = null,
    onSelect = (_s: SektionKey) => {},
  }: { value?: SektionKey | null; onSelect?: (s: SektionKey) => void } = $props();
</script>

<div class="flex flex-wrap" style="gap:6px;">
  {#each SEKTION_KEYS as key (key)}
    <button type="button" onclick={() => onSelect(key)} aria-pressed={value === key}
      class="inline-flex items-center font-bricolage font-semibold"
      style="gap:5px; padding:5px 10px; font-size:12.5px; border:var(--k-border-ink); border-radius:var(--k-radius-pill);
        background:{value === key ? `var(${SEKTION_TOKEN[key]})` : 'transparent'};
        color:{value === key ? `var(${SEKTION_TOKEN[key]}-text)` : 'var(--k-ink)'};">
      <span style="width:7px; height:7px; border-radius:50%; background:var({SEKTION_TOKEN[key]});"></span>
      {$t[`news.sektion.${key}` as keyof typeof $t]}
    </button>
  {/each}
</div>
