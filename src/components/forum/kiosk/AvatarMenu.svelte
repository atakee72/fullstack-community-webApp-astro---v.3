<script lang="ts">
  // Paper dropdown anchored to the nav avatar (desktop only — KioskNav gates
  // mounting). Design source: design/handoffs/design_handoff_avatarmenu/
  // jsx/kiosk-avatar-menu.jsx (AvatarMenu) + motion-avatarmenu.css.
  // Foot slot: „Abmelden" as WORD, wine + mono, behind a SOLID ink rule —
  // links to /logout (which runs the real signOut flow → /login?abgemeldet=1).
  import { t } from '../../../lib/kiosk-i18n';

  let { user, onClose } = $props<{
    user: { name?: string; role?: string };
    onClose: () => void;
  }>();

  const isAdmin = $derived(user?.role === 'admin');

  // Who-am-i extras — one lazy fetch per menu open, name renders regardless.
  let handle = $state<string | null>(null);
  let sinceYear = $state<number | null>(null);
  $effect(() => {
    let alive = true;
    fetch('/api/profile/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d?.profile) return;
        handle = d.profile.handle ?? null;
        sinceYear = d.profile.memberSince ?? null;
      })
      .catch(() => {});
    return () => { alive = false; };
  });

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let closing = $state(false);
  function close() {
    if (closing) return;
    if (reduced) { onClose(); return; }
    closing = true;
    setTimeout(onClose, 140);
  }

  let menuEl = $state<HTMLElement | null>(null);

  function onDocPointerDown(e: PointerEvent) {
    if (menuEl && !menuEl.contains(e.target as Node)) close();
  }
  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const items = menuEl ? Array.from(menuEl.querySelectorAll<HTMLElement>('[role="menuitem"]')) : [];
    if (!items.length) return;
    const i = items.indexOf(document.activeElement as HTMLElement);
    // Nothing focused yet (mouse-open): ArrowDown enters at the first row,
    // ArrowUp at the last. (A naive `(i-1+len)%len` with i=-1 lands on the
    // second-to-last — off-by-one, caught in plan audit.)
    const next =
      i === -1
        ? (e.key === 'ArrowDown' ? 0 : items.length - 1)
        : (e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length);
    items[next].focus();
  }
  $effect(() => {
    // Delay the outside-click listener a tick so the opening click doesn't
    // instantly close the menu. No auto-focus on open — a mouse-open would
    // paint an unexpected focus ring; ↑↓ starts keyboard navigation instead.
    const id = setTimeout(() => document.addEventListener('pointerdown', onDocPointerDown), 0);
    document.addEventListener('keydown', onKeydown);
    return () => {
      clearTimeout(id);
      document.removeEventListener('pointerdown', onDocPointerDown);
      document.removeEventListener('keydown', onKeydown);
    };
  });
</script>

<div bind:this={menuEl} class="am-menu" class:am-closing={closing} role="menu" aria-label={user?.name ?? 'Konto'}>
  <div class="am-caret"></div>
  <div class="am-card">
    <div class="am-head">
      <div class="am-name font-bricolage">{user?.name ?? ''}</div>
      {#if handle}
        <div class="am-sub font-dmmono">@{handle}{#if sinceYear}&nbsp;· {$t['nav.menu.seit']} {sinceYear}{/if}</div>
      {/if}
    </div>
    <div class="am-group">
      <a role="menuitem" href="/profile" class="am-row font-bricolage">{$t['nav.menu.profil']}<span class="am-icon font-dmmono">→</span></a>
      <a role="menuitem" href="/profile?filter=forum" class="am-row font-bricolage">{$t['nav.menu.beitraege']}</a>
      <a role="menuitem" href="/profile?filter=gespeichert" class="am-row font-bricolage">{$t['nav.menu.gespeichert']}<span class="am-icon font-dmmono">◈</span></a>
    </div>
    {#if isAdmin}
      <div class="am-group am-admin">
        <a role="menuitem" href="/admin/moderation" class="am-row am-plum font-bricolage">{$t['nav.menu.moderation']}</a>
      </div>
    {/if}
    <div class="am-foot">
      <a role="menuitem" href="/logout" class="am-row am-wine font-dmmono">{$t['nav.menu.abmelden']}<span class="am-icon font-dmmono">⏻</span></a>
    </div>
  </div>
</div>

<style>
  .am-menu {
    position: absolute; top: calc(100% + 10px); right: 0; width: 236px; z-index: 50;
    transform-origin: top right;
    animation: amStampIn 220ms cubic-bezier(0.2, 0.7, 0.3, 1);
  }
  .am-menu.am-closing { animation: none; transition: opacity 140ms cubic-bezier(0.4, 0, 0.2, 1); opacity: 0; }
  @keyframes amStampIn {
    from { opacity: 0; transform: scale(0.96) translateY(-4px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
  @media (prefers-reduced-motion: reduce) {
    .am-menu { animation: none; }
    .am-menu.am-closing { transition: none; }
  }
  .am-caret {
    position: absolute; top: -7px; right: 16px; width: 12px; height: 12px;
    background: var(--k-paper); border: 1.5px solid var(--k-ink);
    border-right: none; border-bottom: none; transform: rotate(45deg);
  }
  .am-card {
    background: var(--k-paper); border: 1.5px solid var(--k-ink);
    border-radius: var(--k-radius-md); box-shadow: 3px 3px 0 var(--k-ink);
    overflow: hidden; position: relative;
  }
  .am-head { padding: 12px 14px 10px; border-bottom: 1px dashed var(--k-rule); background: var(--k-paper-warm); }
  .am-name { font-size: 13.5px; font-weight: 800; letter-spacing: -0.01em; color: var(--k-ink); }
  .am-sub { font-size: 9.5px; color: var(--k-ink-mute); letter-spacing: 0.08em; margin-top: 2px; }
  .am-group { padding: 6px 0; }
  .am-group.am-admin { border-top: 1px dashed var(--k-rule); }
  .am-foot { border-top: 1.5px solid var(--k-ink); padding: 6px 0; background: var(--k-paper-warm); }
  .am-row {
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    padding: 9px 14px; cursor: pointer; text-decoration: none;
    font-size: 13.5px; font-weight: 600; letter-spacing: -0.005em; color: var(--k-ink);
  }
  .am-row:hover, .am-row:focus-visible { background: var(--k-paper-soft); outline: none; }
  .am-row.am-plum { color: var(--k-plum); }
  .am-row.am-wine { color: var(--k-wine); font-size: 11.5px; font-weight: 700; letter-spacing: 0.08em; }
  .am-icon { font-size: 11px; opacity: 0.55; }
</style>
