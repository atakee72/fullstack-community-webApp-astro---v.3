<script lang="ts">
  // Full-grid skeleton for the forum index loading state.
  //
  // Mirrors ForumDesktopLoading in kiosk-forum-states.jsx (line 73):
  // one announcement card spanning all columns, then five mixed cards
  // in the regular 1/2/3-column grid. Provides a recognisable silhouette
  // of what's about to load — same number of placeholder cards, same
  // pinned-first layout.
  //
  // Drops in as a single sibling above the existing grid; ForumIndexInner
  // toggles between this and the real cards based on `query.isPending`.

  import SkelCard from './SkelCard.svelte';
</script>

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
  <div class="md:col-span-2 lg:col-span-3">
    <SkelCard kind="announcement" />
  </div>
  <SkelCard kind="topic" />
  <SkelCard kind="recommendation" />
  <SkelCard kind="topic" />
  <SkelCard kind="topic" />
  <SkelCard kind="recommendation" />
</div>
