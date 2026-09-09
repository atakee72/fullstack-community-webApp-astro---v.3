<script lang="ts">
  // Admin masthead avatar: plum disc trigger + the shared account menu in
  // admin context (adds the „Bereiche" group, drops the „Admin-Bereich" row).
  // Imported directly by AdminLayout.astro — so unlike AvatarMenu it is NOT
  // at risk of the prod CSS-orphan bug; it still uses inline styles to match
  // the layout's other discs (no component <style>).
  // Presentation of the menu itself (dropdown ≥1024px, bottom sheet below)
  // is AvatarMenu's `.am-*` CSS; the AdminLayout masthead switches at `md`
  // (768px), so 768–1023px shows the desktop masthead with a bottom sheet —
  // same as KioskNav, accepted.
  import AvatarMenu from '../../forum/kiosk/AvatarMenu.svelte';

  let { user, size = 38 } = $props<{
    user: { name?: string | null; image?: string | null; role?: string };
    size?: number;
  }>();

  let open = $state(false);
  let triggerEl = $state<HTMLElement | null>(null);

  function initialsOf(name?: string | null): string {
    if (!name) return '·';
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '·';
  }

  function onClose(restoreFocus: boolean) {
    open = false;
    if (restoreFocus) triggerEl?.focus();
  }
</script>

<div class="relative">
  <button
    bind:this={triggerEl}
    type="button"
    onclick={() => (open = !open)}
    aria-haspopup="menu"
    aria-expanded={open}
    aria-label={user.name ?? 'Admin'}
    class="font-bricolage"
    style="width:{size}px; height:{size}px; padding:0; background:var(--k-accent); border-radius:50%; border:2px solid var(--k-ink); display:flex; align-items:center; justify-content:center; overflow:hidden; font-weight:700; font-size:{Math.round(size * 0.37)}px; color:var(--k-paper); cursor:pointer;"
  >
    {#if user.image}
      <img src={user.image} alt="" style="width:100%; height:100%; object-fit:cover;" />
    {:else}
      {initialsOf(user.name)}
    {/if}
  </button>
  {#if open}
    <AvatarMenu {user} context="admin" {onClose} />
  {/if}
</div>
