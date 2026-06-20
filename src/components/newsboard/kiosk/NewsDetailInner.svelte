<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from '../../../lib/kiosk-i18n';
  import { showToast } from '../../../utils/toast';
  import { resolveSektion, type SektionKey, type NewsDetail } from '../../../lib/newsboard/newsTaxonomy';
  import ReadingListControls from './detail/ReadingListControls.svelte';
  import ForumDiscussCTA from './detail/ForumDiscussCTA.svelte';
  import RelatedRail from './detail/RelatedRail.svelte';

  let {
    article,
    currentUserId = null,
  }: { article: NewsDetail; currentUserId?: string | null } = $props();

  const isAuth = $derived(!!currentUserId);
  const sektion = $derived<SektionKey>(resolveSektion(article.aiCategory));

  let saved = $state(false);
  let forumExhausted = $state(false);

  onMount(async () => {
    if (!isAuth) return;
    try {
      const sres = await fetch('/api/news/save');
      if (sres.ok) {
        const sj = await sres.json();
        saved = (sj.savedIds ?? []).map((x: any) => String(x)).includes(article.id);
      }
    } catch { /* non-fatal */ }
    try {
      const qres = await fetch('/api/topics/daily-count');
      if (qres.ok) forumExhausted = !(await qres.json()).canCreate;
    } catch { /* leave false */ }
  });

  async function toggleSave() {
    if (!isAuth) { showToast($t['news.save.login'], { type: 'info' }); return; }
    const wasSaved = saved;
    saved = !wasSaved;
    try {
      const res = await fetch('/api/news/save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newsId: article.id, action: wasSaved ? 'unsave' : 'save' }),
      });
      if (!res.ok) throw new Error();
    } catch {
      saved = wasSaved;
      showToast($t['news.save.error'], { type: 'error' });
    }
  }
</script>

<aside class="flex flex-col" style="gap:14px;">
  <ReadingListControls {saved} canSave={isAuth} onSave={toggleSave} />
  <ForumDiscussCTA title={article.title} sourceUrl={article.sourceUrl} exhausted={forumExhausted} />
  <RelatedRail {sektion} currentId={article.id} />
</aside>
