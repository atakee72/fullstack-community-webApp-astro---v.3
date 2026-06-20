<script lang="ts">
  import { t } from '../../../../lib/kiosk-i18n';
  import KioskBtn from '../../../forum/kiosk/KioskBtn.svelte';

  let {
    title = '',
    sourceUrl = '',
    exhausted = false,
  }: { title?: string; sourceUrl?: string; exhausted?: boolean } = $props();

  // Forum compose reads ?prefill_title / ?prefill_body (see ComposePageInner).
  const href = $derived(
    `/topics/create?prefill_title=${encodeURIComponent(title)}&prefill_body=${encodeURIComponent(sourceUrl)}`
  );
</script>

<div style="padding:14px; background:{exhausted ? 'var(--k-paper-soft)' : 'var(--k-paper-warm)'};
     border:1.5px solid {exhausted ? 'var(--k-rule)' : 'var(--k-ink)'}; border-radius:var(--k-radius-md);
     box-shadow:{exhausted ? 'none' : '2px 2px 0 var(--k-wine)'}; opacity:{exhausted ? 0.8 : 1};">
  <div class="font-dmmono" style="font-size:10px; color:var(--k-wine); letter-spacing:0.12em; margin-bottom:6px;">
    {$t['news.forumcta.kicker']}
  </div>
  <div class="font-bricolage" style="font-size:15px; font-weight:700; line-height:1.25; margin-bottom:4px;">
    {$t['news.forumcta.heading']}
  </div>
  <div class="font-instrument italic" style="font-size:12.5px; color:var(--k-ink-soft); line-height:1.45; margin-bottom:10px;">
    {exhausted ? $t['news.forumcta.exhausted'] : $t['news.forumcta.body']}
  </div>
  {#if exhausted}
    <KioskBtn size="sm" variant="secondary" disabled>{$t['news.forumcta.exhaustedButton']}</KioskBtn>
  {:else}
    <KioskBtn size="sm" href={href}>{$t['news.forumcta.button']}</KioskBtn>
  {/if}
</div>
