<script lang="ts">
  // Loading state (§01) — mirrors the real two-column layout (identity +
  // moderation + konto cards left, archiv ledger right) instead of a bare
  // ⏳ spinner. Reuses the forum kiosk's SkelBar (`.k-skeleton` shimmer,
  // src/styles/motion.css) inside the real PCard chrome so the loading
  // silhouette matches what's about to land.
  // Design source: kiosk-profile-states.jsx (PStateTile n="01").

  import PCard from '../atoms/PCard.svelte';
  import SkelBar from '../../../forum/kiosk/states/SkelBar.svelte';
</script>

<div class="px-4 lg:px-9 py-6" aria-hidden="true" aria-busy="true">
  <div class="grid gap-[26px] items-start lg:grid-cols-[384px_1fr]">
    <!-- Left column: identity, moderation, konto -->
    <div class="flex flex-col gap-5">
      <PCard>
        <div style="display: flex; gap: 16px; align-items: flex-start;">
          <span
            class="k-skeleton shrink-0"
            style="width: 92px; height: 92px; border-radius: 50%; background: var(--k-paper-soft); display: block;"
          ></span>
          <div style="flex: 1; min-width: 0; padding-top: 6px;">
            <SkelBar w="70%" h={22} mb={8} />
            <SkelBar w="45%" h={11} mb={0} />
          </div>
        </div>
        <div style="margin-top: 18px; border-top: 1.5px dashed var(--k-rule); padding-top: 12px;">
          <SkelBar w="100%" h={12} mb={8} />
          <SkelBar w="82%" h={12} mb={8} />
          <SkelBar w="64%" h={12} mb={0} />
        </div>
      </PCard>
      <PCard accent="var(--k-success)">
        <SkelBar w="55%" h={16} mb={10} />
        <SkelBar w="90%" h={11} mb={6} />
        <SkelBar w="70%" h={11} mb={0} />
      </PCard>
      <PCard>
        <SkelBar w="30%" h={16} mb={12} />
        <SkelBar w="100%" h={11} mb={6} />
        <SkelBar w="100%" h={11} mb={0} />
      </PCard>
    </div>

    <!-- Right column: archiv ledger -->
    <PCard pad={24}>
      <SkelBar w="25%" h={16} mb={14} />
      {#each [0, 1, 2, 3, 4] as i (i)}
        <div style="padding: 13px 0; border-top: 1px dashed var(--k-rule);">
          <SkelBar w="35%" h={9} mb={6} />
          <SkelBar w={i % 2 === 0 ? '78%' : '58%'} h={16} mb={6} />
          <SkelBar w="40%" h={10} mb={0} />
        </div>
      {/each}
    </PCard>
  </div>
</div>
