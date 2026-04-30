<script lang="ts">
  // Skeleton card — placeholder for a single ForumPostCard while the
  // topics query is loading. Three variants mirror the real card kinds
  // (topic / announcement / recommendation) so the skeleton silhouette
  // matches what's about to land.

  import SkelBar from './SkelBar.svelte';

  let { kind = 'topic' } = $props<{
    kind?: 'topic' | 'announcement' | 'recommendation';
  }>();

  // Per-kind chrome: paper-warm + ink (topic), ink + ink (announcement),
  // paper-warm + moss (recommendation). Mirrors ForumPostCard.svelte.
  const isAnnouncement = $derived(kind === 'announcement');
  const isRecommendation = $derived(kind === 'recommendation');

  const cardClass = $derived(
    isAnnouncement
      ? 'bg-ink border-2 border-ink'
      : isRecommendation
      ? 'bg-paper-warm border-[1.5px] border-moss'
      : 'bg-paper-warm border-[1.5px] border-ink'
  );

  const dark = $derived(isAnnouncement);

  // Avatar circle is a separate shape so we can give it `border-radius: 50%`.
  const avatarBg = $derived(
    dark ? 'rgba(243,234,216,0.12)' : 'rgba(27,26,23,0.10)'
  );
</script>

<div
  class={`${cardClass} rounded-lg overflow-hidden`}
  style="min-height: 220px; padding: 16px 18px;"
  aria-hidden="true"
>
  <!-- Top row: avatar + author/time stack on the left, type-chip stub on the right -->
  <div class="flex items-start justify-between mb-2.5">
    <div class="flex items-center gap-2">
      <span
        class="block k-skeleton shrink-0"
        style={`width: 28px; height: 28px; border-radius: 50%; background: ${avatarBg};`}
      ></span>
      <div>
        <SkelBar w={70} h={9} mb={4} {dark} />
        <SkelBar w={48} h={7} mb={0} {dark} />
      </div>
    </div>
    <SkelBar w={80} h={16} mb={0} {dark} />
  </div>

  <!-- Title block (two lines) -->
  <SkelBar w="92%" h={18} mb={6} {dark} />
  <SkelBar w="76%" h={18} mb={10} {dark} />

  <!-- Body excerpt (three lines) -->
  <SkelBar w="100%" h={10} mb={5} {dark} />
  <SkelBar w="94%" h={10} mb={5} {dark} />
  <SkelBar w="68%" h={10} mb={0} {dark} />
</div>
