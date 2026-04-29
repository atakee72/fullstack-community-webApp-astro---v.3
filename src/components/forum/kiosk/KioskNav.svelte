<script lang="ts">
  // Top navigation chrome for the Kiosk shell:
  //   left   — brand mark "m" + wordmark
  //   center — pill nav (Forum/Kalender/Markt/News/Kiez/Blog) — desktop only
  //   right  — DE/EN locale toggle + user avatar (when logged in)
  //
  // Mobile shows a compact top bar (brand + locale toggle) plus a fixed
  // bottom-anchored nav bar (Forum/Kal./News/Markt/Kiez), 5 items per the
  // canvas — Profile is reachable via the avatar.

  import { locale, t, toggleLocale } from '../../../lib/kiosk-i18n';
  import KioskAvatar from './KioskAvatar.svelte';

  let { currentPath = '/', user = null } = $props<{
    currentPath?: string;
    user?: { name?: string; image?: string | null } | null;
  }>();

  // Top nav (desktop) — full set. Reactive to locale.
  const topNav = $derived([
    { href: '/',             label: $t['nav.forum'],       match: ['/', '/forum'] },
    { href: '/calendar',     label: $t['nav.calendar'],    match: ['/calendar'] },
    { href: '/marketplace',  label: $t['nav.marketplace'], match: ['/marketplace'] },
    { href: '/newsboard',    label: $t['nav.news'],        match: ['/newsboard'] },
    { href: '/schillerkiez', label: $t['nav.kiez'],        match: ['/schillerkiez'] },
    { href: '/blog',         label: $t['nav.blog'],        match: ['/blog'] }
  ]);

  // Bottom nav (mobile) — 5 items, compact labels. Profile is reached via avatar.
  const bottomNav = $derived([
    { href: '/',             label: $t['nav.short.forum'],       match: ['/', '/forum'] },
    { href: '/calendar',     label: $t['nav.short.calendar'],    match: ['/calendar'] },
    { href: '/newsboard',    label: $t['nav.short.news'],        match: ['/newsboard'] },
    { href: '/marketplace',  label: $t['nav.short.marketplace'], match: ['/marketplace'] },
    { href: '/schillerkiez', label: $t['nav.short.kiez'],        match: ['/schillerkiez'] }
  ]);

  function isActive(matches: string[]): boolean {
    return matches.some((m) => currentPath === m || (m !== '/' && currentPath.startsWith(m + '/')));
  }
</script>

<!-- ─── Top bar (sticky, all viewports) ───────────────────────────────── -->
<header
  class="sticky top-0 z-40 border-b-2 border-ink k-paper-bg"
>
  <div class="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between gap-4">
    <!-- Brand -->
    <a href="/" class="flex items-center gap-2 group">
      <span
        class="w-9 h-9 rounded-full bg-ink text-paper flex items-center justify-center font-bricolage font-bold text-lg leading-none border-2 border-ink shadow-[2px_2px_0_var(--k-wine)] group-hover:shadow-[3px_3px_0_var(--k-wine)] group-hover:-translate-x-px group-hover:-translate-y-px transition-all duration-[180ms] ease-out"
      >m</span>
      <span class="hidden sm:inline font-bricolage font-bold tracking-tight text-ink text-lg">
        {$t['brand.tagline']}
      </span>
    </a>

    <!-- Pill nav (desktop only) -->
    <nav class="hidden lg:flex items-center gap-1">
      {#each topNav as item (item.href)}
        <a
          href={item.href}
          class="px-3 py-1.5 rounded-md font-bricolage font-medium text-sm transition-colors duration-150 {
            isActive(item.match)
              ? 'bg-ink text-paper'
              : 'text-ink hover:bg-paper-warm'
          }"
          aria-current={isActive(item.match) ? 'page' : undefined}
        >
          {item.label}
        </a>
      {/each}
    </nav>

    <!-- Right: locale toggle + avatar -->
    <div class="flex items-center gap-3">
      <button
        type="button"
        onclick={toggleLocale}
        aria-label="Toggle language"
        class="font-jetbrains text-xs uppercase tracking-[0.12em] flex items-center gap-1 px-2 py-1 rounded-md hover:bg-paper-warm transition-colors"
      >
        <span class={$locale === 'de' ? 'text-ink font-bold' : 'text-ink-mute'}>de</span>
        <span class="text-ink-mute">/</span>
        <span class={$locale === 'en' ? 'text-ink font-bold' : 'text-ink-mute'}>en</span>
      </button>

      {#if user?.name}
        <a href="/profile" aria-label={user.name}>
          <KioskAvatar name={user.name} image={user.image ?? null} size="sm" />
        </a>
      {/if}
    </div>
  </div>
</header>

<!-- ─── Bottom mobile nav (fixed, hidden on lg+) ──────────────────────── -->
<nav
  class="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t-2 border-ink k-paper-bg"
  aria-label="Primary"
>
  <div class="flex items-stretch justify-around max-w-md mx-auto">
    {#each bottomNav as item (item.href)}
      <a
        href={item.href}
        class="flex-1 py-3 font-jetbrains text-[10px] uppercase tracking-[0.12em] text-center transition-colors {
          isActive(item.match)
            ? 'text-ink font-bold bg-paper-warm'
            : 'text-ink-mute hover:text-ink'
        }"
        aria-current={isActive(item.match) ? 'page' : undefined}
      >
        {item.label}
      </a>
    {/each}
  </div>
</nav>

<!-- Spacer so content beneath the fixed bottom nav isn't covered on mobile -->
<div class="lg:hidden h-12" aria-hidden="true"></div>
