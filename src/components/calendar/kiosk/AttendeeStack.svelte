<script lang="ts">
  // Avatar stack of users who said Going. Per CD's artboard the discs
  // are unlabelled colored circles (riso treatment) — no initials.
  // Variety comes from the colour palette cycling per-index.

  let {
    userIds = [],
    max = 6
  } = $props<{
    userIds?: string[];
    max?: number;
  }>();

  const visible = $derived(userIds.slice(0, max));
  const overflow = $derived(Math.max(0, userIds.length - max));

  const tones = [
    'bg-wine',
    'bg-ochre',
    'bg-teal',
    'bg-plum',
    'bg-moss',
    'bg-ink-soft'
  ] as const;
</script>

<div class="flex flex-wrap gap-1 items-center">
  {#each visible as id, i (id)}
    <span
      class={`w-7 h-7 rounded-full border-[1.5px] border-ink ${tones[i % tones.length]}`}
      aria-hidden="true"
    ></span>
  {/each}
  {#if overflow > 0}
    <span
      class="w-7 h-7 rounded-full bg-paper border-[1.5px] border-ink inline-flex items-center justify-center font-dmmono text-[10px] font-semibold"
    >
      +{overflow}
    </span>
  {/if}
</div>
