<script lang="ts">
  import { t } from '../../../../lib/kiosk-i18n';
  import { showToast } from '../../../../utils/toast';
  import KioskBtn from '../../../forum/kiosk/KioskBtn.svelte';

  let title = $state('');
  let description = $state('');
  let sourceUrl = $state('');
  let sourceName = $state('');
  let submitting = $state(false);

  const valid = $derived(title.trim().length >= 5 && description.trim().length >= 10 && /^https?:\/\//.test(sourceUrl));

  async function submit() {
    if (!valid || submitting) return;
    submitting = true;
    try {
      const res = await fetch('/api/news/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, sourceUrl, sourceName: sourceName || new URL(sourceUrl).hostname }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'submit failed');
      }
      showToast($t['news.submit.success'], { type: 'success' });
      window.location.href = '/newsboard';
    } catch (e) {
      showToast((e as Error).message || $t['news.submit.error'], { type: 'error' });
      submitting = false;
    }
  }
</script>

<div class="max-w-2xl mx-auto px-4 md:px-9" style="padding-top:30px; padding-bottom:50px;">
  <div class="font-dmmono uppercase" style="font-size:11px; color:var(--k-ink); letter-spacing:0.16em; margin-bottom:6px;">
    {$t['news.submit.kicker']}
  </div>
  <h1 class="font-bricolage" style="font-size:clamp(30px,5vw,44px); font-weight:800; letter-spacing:-0.03em; line-height:1; margin:0 0 10px;">
    {@html $t['news.submit.heading']}
  </h1>
  <p class="font-instrument italic" style="font-size:16px; color:var(--k-ink-soft); margin:0 0 22px; max-width:55ch;">
    {$t['news.submit.intro']}
  </p>

  <div class="flex flex-col" style="gap:18px;">
    <label class="flex flex-col" style="gap:6px;">
      <span class="font-dmmono uppercase" style="font-size:10px; letter-spacing:0.12em; font-weight:700;">{$t['news.submit.field.title']}</span>
      <input bind:value={title} placeholder={$t['news.submit.ph.title']} maxlength="200"
        class="font-bricolage" style="padding:8px 10px; background:var(--k-paper-soft); border:1px solid var(--k-rule); border-radius:var(--k-radius-md);" />
    </label>
    <label class="flex flex-col" style="gap:6px;">
      <span class="font-dmmono uppercase" style="font-size:10px; letter-spacing:0.12em; font-weight:700;">{$t['news.submit.field.desc']}</span>
      <textarea bind:value={description} rows="4" placeholder={$t['news.submit.ph.desc']} maxlength="1000"
        class="font-bricolage" style="padding:10px; background:var(--k-paper-soft); border:1px solid var(--k-rule); border-radius:var(--k-radius-md);"></textarea>
    </label>
    <label class="flex flex-col" style="gap:6px;">
      <span class="font-dmmono uppercase" style="font-size:10px; letter-spacing:0.12em; font-weight:700;">{$t['news.submit.field.url']}</span>
      <input bind:value={sourceUrl} placeholder="https://" type="url"
        class="font-dmmono" style="padding:8px 10px; background:var(--k-paper-soft); border:1px solid var(--k-rule); border-radius:var(--k-radius-md);" />
    </label>
    <label class="flex flex-col" style="gap:6px;">
      <span class="font-dmmono uppercase" style="font-size:10px; letter-spacing:0.12em; font-weight:700;">{$t['news.submit.field.source']}</span>
      <input bind:value={sourceName} placeholder={$t['news.submit.ph.source']} maxlength="100"
        class="font-bricolage" style="padding:8px 10px; background:var(--k-paper-soft); border:1px solid var(--k-rule); border-radius:var(--k-radius-md);" />
    </label>
  </div>

  <div class="flex items-center" style="gap:8px; margin-top:24px;">
    <KioskBtn onclick={submit} disabled={!valid || submitting}>
      {submitting ? $t['news.submit.submitting'] : $t['news.submit.cta']}
    </KioskBtn>
    <KioskBtn variant="ghost" href="/newsboard">{$t['news.submit.cancel']}</KioskBtn>
  </div>

  <div class="font-dmmono" style="margin-top:18px; padding:10px 12px; background:var(--k-paper-soft); border:1px dashed var(--k-rule); border-radius:var(--k-radius-sm); font-size:9.5px; color:var(--k-ink-mute); line-height:1.55;">
    ↳ {$t['news.submit.modnote']}
  </div>
</div>
