<script lang="ts">
  // Avatar disc — wine monogram circle with optional uploaded photo + an
  // ochre "ÄNDERN" chip that opens the avatar-upload flow. Editable is
  // independent of the identity card's read/edit toggle — the chip is
  // reachable from BOTH states on your own profile (flows-JSX §01 rule 05).
  // Task 6 renders the chip; Task 7 wires `onOpenUpload` to the real flow.
  // Design source: kiosk-profile.jsx (PAvatar).

  import { t } from '../../../../lib/kiosk-i18n';

  let {
    name,
    image,
    size = 92,
    editable = false,
    onOpenUpload,
    showSavedBadge = false,
  }: {
    name: string;
    image: string | null;
    size?: number;
    editable?: boolean;
    onOpenUpload?: () => void;
    showSavedBadge?: boolean;
  } = $props();

  // Same logic as initialsOf() in KioskNav.svelte:48 — first letters of the
  // first two whitespace-split name words, uppercased, '·' fallback.
  function initialsOf(n?: string): string {
    if (!n) return '·';
    const parts = n.trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '·';
  }

  const initials = $derived(initialsOf(name));
  const fontSize = $derived(size * 0.36);
</script>

<div style="position: relative; width: {size}px; height: {size}px; flex-shrink: 0;">
  <div
    style="
      width: {size}px; height: {size}px; border-radius: 50%; background: var(--k-wine);
      border: 2px solid var(--k-ink); box-shadow: 2px 2px 0 var(--k-ochre);
      display: flex; align-items: center; justify-content: center; overflow: hidden;
      color: var(--k-paper); font-family: var(--k-font-serif); font-style: italic;
      font-size: {fontSize}px; line-height: 1;
    "
  >
    {#if image}
      <img src={image} alt="" style="width: 100%; height: 100%; object-fit: cover;" />
    {:else}
      {initials}
    {/if}
  </div>
  {#if editable}
    <button
      type="button"
      onclick={onOpenUpload}
      aria-label={$t['profile.avatar.change']}
      style="
        position: absolute; bottom: -6px; right: -10px; padding: 3px 9px;
        background: var(--k-ochre); border: 1.5px solid var(--k-ink); border-radius: 999px;
        font-family: var(--k-font-mono); font-size: 9px; font-weight: 500; letter-spacing: 0.08em;
        box-shadow: 2px 2px 0 var(--k-ink); cursor: pointer;
      "
    >{$t['profile.avatar.change']}</button>
  {/if}
  {#if showSavedBadge}
    <span
      class="prof-chip-in"
      aria-hidden="true"
      style="
        position: absolute; top: -6px; right: -8px; width: 24px; height: 24px;
        border-radius: 50%; background: var(--k-success); color: var(--k-paper);
        border: 2px solid var(--k-ink); display: flex; align-items: center;
        justify-content: center; font-size: 12px; line-height: 1;
      "
    >✓</span>
  {/if}
</div>
