<!-- Styles live in global.css (.ktr-*) — this component is only imported by
     other islands, and nested-island <style> blocks get orphaned in prod. -->
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { t, locale } from '../../../lib/kiosk-i18n';
  import { pickTargetLang, requestTranslation } from '../../../lib/translation/client';

  let {
    contentType,
    contentId,
    onTranslated,
    accent = 'inherit',
  }: {
    contentType: string;
    contentId: string;
    onTranslated: (t: { title: string | null; body: string } | null) => void;
    accent?: string;
  } = $props();

  // Named `phase` rather than the brief's `state` — a local variable named
  // literally `state` alongside a second `$state<T>()` call in the same
  // file trips a svelte-check@4 / svelte5 transform bug (spurious "used
  // before its declaration" + implicit-any on the rune itself). Verified
  // in isolation; renaming is a no-op behaviorally.
  let phase = $state<'idle' | 'working' | 'shown'>('idle');
  let error = $state<string | null>(null);
  let cache: { title: string | null; body: string } | null = null;
  let destroyed = false;
  onDestroy(() => {
    destroyed = true;
  });

  async function toggle() {
    error = null;
    if (phase === 'shown') {
      phase = 'idle';
      onTranslated(null);
      return;
    }
    if (cache) {
      phase = 'shown';
      onTranslated(cache);
      return;
    }
    phase = 'working';
    const target = pickTargetLang($locale);
    const res = await requestTranslation(contentType, contentId, target);
    if (destroyed) return;
    if (!res.ok) {
      phase = 'idle';
      const known = ['translate_unavailable', 'rate_limited', 'too_long'];
      const key = res.error === 'translate_unavailable' ? 'unavailable' : res.error;
      error = $t[(known.includes(res.error) ? `tr.err.${key}` : 'tr.err.generic') as keyof typeof $t] ?? $t['tr.err.generic'];
      return;
    }
    cache = { title: res.title, body: res.body };
    phase = 'shown';
    onTranslated(cache);
  }
</script>

<div class="ktr">
  {#if phase === 'shown'}
    <span class="ktr-label">● {$t['tr.label']}</span>
  {/if}
  <button type="button" class="ktr-btn" style={`color:${accent}`} onclick={toggle} disabled={phase === 'working'}>
    {phase === 'working' ? $t['tr.working'] : phase === 'shown' ? $t['tr.original'] : $t['tr.show']}
  </button>
  {#if error}
    <span class="ktr-err" role="status">{error}</span>
  {/if}
</div>
