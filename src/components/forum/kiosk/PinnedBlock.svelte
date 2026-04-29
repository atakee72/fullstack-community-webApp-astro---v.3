<script lang="ts">
  // Ink-band block wrapping the announcement strip + pinned hero.
  // Filter bar lives separately on paper bg above this block.
  //
  // Phase 4a: receives a single `pinnedTopic` and renders. The "is this
  // post actually pinned" decision lives in ForumIndexInner — for now we
  // hardcode a synthetic Mahalle-Team welcome post. Phase 5 will read a
  // real `pinned` boolean + admin role from the database.

  import { t } from '../../../lib/kiosk-i18n';
  import ForumHero from './ForumHero.svelte';

  let { pinnedTopic = null } = $props<{
    pinnedTopic?: any;
  }>();
</script>

{#if pinnedTopic}
  <section class="relative bg-ink text-paper rounded-2xl px-5 py-5 md:px-8 md:py-7">
    <!-- Announcement strip -->
    <div class="flex items-center justify-between gap-4 mb-3 md:mb-4">
      <span class="font-jetbrains text-[10px] uppercase tracking-[0.18em] text-paper/70">
        {$t['pinned.banner.label']}
      </span>
      <span class="inline-flex items-center gap-1.5 font-jetbrains text-[10px] uppercase tracking-[0.18em] text-ochre">
        <span aria-hidden="true">📌</span>
        {$t['pinned.banner.tag']}
      </span>
    </div>

    <!-- Pinned hero -->
    <ForumHero topic={pinnedTopic} kind="announcement" roleBadge="team" />
  </section>
{/if}
