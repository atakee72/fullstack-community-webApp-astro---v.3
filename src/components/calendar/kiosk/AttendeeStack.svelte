<script lang="ts">
  // Avatar stack of users who said Going. Per CD's artboard, shows up
  // to N circular avatars colored by tone, with a "+N" overflow disc.
  // For v1 we don't have populated user data on the events list (just
  // string IDs in rsvps.going), so each disc shows a generic placeholder
  // glyph. Real avatars land when we populate authors on the rsvp arrays
  // (deferred to v1.1).

  import KioskAvatar from '../../forum/kiosk/KioskAvatar.svelte';

  let {
    userIds = [],
    max = 6
  } = $props<{
    userIds?: string[];
    max?: number;
  }>();

  const visible = $derived(userIds.slice(0, max));
  const overflow = $derived(Math.max(0, userIds.length - max));

  const tones: Array<'wine' | 'ochre' | 'teal' | 'plum' | 'moss' | 'ink'> = [
    'wine',
    'ochre',
    'teal',
    'plum',
    'moss',
    'ink'
  ];
</script>

<div class="flex flex-wrap gap-1 items-center">
  {#each visible as id, i (id)}
    <KioskAvatar name={id.slice(-2)} image={null} size="sm" tone={tones[i % tones.length]} />
  {/each}
  {#if overflow > 0}
    <span
      class="w-7 h-7 rounded-full bg-paper border border-ink inline-flex items-center justify-center font-dmmono text-[10px] font-semibold"
    >
      +{overflow}
    </span>
  {/if}
</div>
