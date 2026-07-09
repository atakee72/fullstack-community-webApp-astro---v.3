<script lang="ts">
  /**
   * Masthead title block — kicker (live date/time) + H1 with serif-italic
   * accent + queue/history pill toggle + sort note. Transcribed from
   * design/handoffs/design_handoff_admin/jsx/kiosk-admin.jsx:265-298.
   */
  import { locale, t } from '../../../lib/kiosk-i18n';

  let {
    view,
    onViewChange,
  }: {
    view: 'queue' | 'history';
    onViewChange: (v: 'queue' | 'history') => void;
  } = $props();

  // Live clock — re-derives the kicker every minute (mirrors ForumIndexInner).
  let now = $state(new Date());
  $effect(() => {
    const id = setInterval(() => (now = new Date()), 60_000);
    return () => clearInterval(id);
  });

  const dateStr = $derived(
    now
      .toLocaleDateString($locale === 'de' ? 'de-DE' : 'en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
      .toUpperCase()
  );
  const timeStr = $derived(
    now.toLocaleTimeString($locale === 'de' ? 'de-DE' : 'en-GB', { hour: '2-digit', minute: '2-digit' })
  );
  const kicker = $derived(`${$t['admin.title.kicker']} · ${dateStr} · ${timeStr}`);

  const VIEWS: { id: 'queue' | 'history'; labelKey: 'admin.view.queue' | 'admin.view.history' }[] = [
    { id: 'queue', labelKey: 'admin.view.queue' },
    { id: 'history', labelKey: 'admin.view.history' },
  ];
</script>

<section style="padding: 22px 36px 0;">
  <div class="font-dmmono" style="font-size: 11px; color: var(--k-accent); letter-spacing: 0.12em;">
    {kicker}
  </div>
  <h1 class="font-bricolage" style="font-size: 48px; font-weight: 800; letter-spacing: -0.035em; line-height: 0.95; margin: 6px 0 0;">
    {$t['admin.title.a']}<span class="font-instrument" style="font-style: italic; font-weight: 400; color: var(--k-accent);">{$t['admin.title.accent']}</span>{$t['admin.title.b']}
  </h1>
  <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 16px; border-bottom: 1px dashed var(--k-rule); padding-bottom: 14px;">
    <div style="display: flex; gap: 8px;">
      {#each VIEWS as v (v.id)}
        <button
          type="button"
          onclick={() => onViewChange(v.id)}
          class="font-bricolage"
          style="
            padding: 7px 16px; font-size: 13.5px; font-weight: 700;
            background: {view === v.id ? 'var(--k-accent)' : 'transparent'};
            color: {view === v.id ? 'var(--k-paper)' : 'var(--k-ink)'};
            border: var(--k-border-ink); border-radius: var(--k-radius-pill);
            box-shadow: {view === v.id ? '2px 2px 0 var(--k-ink)' : 'none'};
            cursor: pointer;
          "
        >{$t[v.labelKey]}</button>
      {/each}
    </div>
    <span class="font-dmmono" style="font-size: 11px; color: var(--k-ink-mute);">{$t['admin.sortNote']}</span>
  </div>
</section>
