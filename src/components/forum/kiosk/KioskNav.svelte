<script lang="ts">
  // Top navigation chrome — Editorial Kiosk canvas:
  //   left   — wine "m" disc + "mahalle" wordmark + "SCHILLERKIEZ · NEUKÖLLN"
  //   center — outlined pill nav (Forum/Kalender/News/Markt/Kiez/Blog), desktop only
  //   right  — segmented DE/EN pill toggle + ochre user disc (initials)
  //
  // Mobile shows the top bar (brand + locale toggle) plus a fixed bottom nav
  // bar (5 short labels). Profile reachable via the avatar.

  import { locale, t, toggleLocale } from '../../../lib/kiosk-i18n';

  let { currentPath = '/', user = null } = $props<{
    currentPath?: string;
    user?: { name?: string; image?: string | null } | null;
  }>();

  // Forum item's `match` covers `/`, the legacy `/forum`, and the three
  // per-kind detail/create routes — so the Forum tab stays highlighted on
  // /topics/create, /topics/{id}, /announcements/{id}, /recommendations/{id}.
  const FORUM_MATCH = ['/', '/forum', '/topics', '/announcements', '/recommendations'];

  // Calendar covers `/calendar` plus the per-event create/detail routes
  // (e.g. `/events/create`, eventually `/events/{id}`).
  const CALENDAR_MATCH = ['/calendar', '/events'];

  const topNav = $derived([
    { href: '/',             label: $t['nav.forum'],       match: FORUM_MATCH },
    { href: '/calendar',     label: $t['nav.calendar'],    match: CALENDAR_MATCH },
    { href: '/newsboard',    label: $t['nav.news'],        match: ['/newsboard'] },
    { href: '/marketplace',  label: $t['nav.marketplace'], match: ['/marketplace'] },
    { href: '/schillerkiez', label: $t['nav.kiez'],        match: ['/schillerkiez'] },
    { href: '/blog',         label: $t['nav.blog'],        match: ['/blog'] }
  ]);

  const bottomNav = $derived([
    { href: '/',             label: $t['nav.short.forum'],       match: FORUM_MATCH },
    { href: '/calendar',     label: $t['nav.short.calendar'],    match: CALENDAR_MATCH },
    { href: '/newsboard',    label: $t['nav.short.news'],        match: ['/newsboard'] },
    { href: '/marketplace',  label: $t['nav.short.marketplace'], match: ['/marketplace'] },
    { href: '/schillerkiez', label: $t['nav.short.kiez'],        match: ['/schillerkiez'] }
  ]);

  function isActive(matches: string[]): boolean {
    return matches.some((m) => currentPath === m || (m !== '/' && currentPath.startsWith(m + '/')));
  }

  // Avatar initials: take first letter of first two name parts.
  function initialsOf(name?: string): string {
    if (!name) return '·';
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '·';
  }
</script>

<!-- ─── Top bar (sticky, all viewports) ───────────────────────────────── -->
<header class="sticky top-0 z-40 border-b-2 border-ink k-paper-bg">
  <div class="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between gap-4">
    <!-- Brand: wine disc + wordmark + place tagline below -->
    <a href="/" class="flex items-center gap-3 group shrink-0">
      <span
        class="w-10 h-10 rounded-full bg-wine text-paper flex items-center justify-center font-bricolage font-bold text-xl leading-none group-hover:scale-105 transition-transform duration-[180ms] ease-out"
      >m</span>
      <span class="hidden sm:flex flex-col leading-tight">
        <span class="font-bricolage font-bold text-ink text-xl tracking-tight">
          {$t['brand.name']}
        </span>
        <span class="font-dmmono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
          {$t['brand.location']}
        </span>
      </span>
    </a>

    <!-- Pill nav (desktop only) -->
    <nav class="hidden lg:flex items-center gap-2">
      {#each topNav as item (item.href)}
        <a
          href={item.href}
          class="px-4 py-1.5 rounded-full border-2 border-ink font-bricolage font-medium text-sm transition-colors duration-150 {
            isActive(item.match)
              ? 'bg-ink text-paper'
              : 'bg-transparent text-ink hover:bg-paper-warm'
          }"
          aria-current={isActive(item.match) ? 'page' : undefined}
        >
          {item.label}
        </a>
      {/each}
    </nav>

    <!-- Right: segmented locale toggle + avatar disc -->
    <div class="flex items-center gap-3 shrink-0">
      <!-- DE/EN segmented pill -->
      <div
        class="inline-flex items-center rounded-full border-2 border-ink overflow-hidden font-dmmono text-[11px] uppercase tracking-[0.12em] bg-ink"
        role="group"
        aria-label="Language"
      >
        <button
          type="button"
          onclick={() => $locale === 'en' && toggleLocale()}
          class="px-2.5 py-0.5 transition-colors {
            $locale === 'de' ? 'bg-paper text-ink' : 'bg-ink text-paper hover:text-paper-warm'
          }"
          aria-pressed={$locale === 'de'}
        >DE</button>
        <button
          type="button"
          onclick={() => $locale === 'de' && toggleLocale()}
          class="px-2.5 py-0.5 transition-colors {
            $locale === 'en' ? 'bg-paper text-ink' : 'bg-ink text-paper hover:text-paper-warm'
          }"
          aria-pressed={$locale === 'en'}
        >EN</button>
      </div>

      <!-- User disc (ochre + initials, or photo) -->
      {#if user?.name}
        <a
          href="/profile"
          aria-label={user.name}
          class="w-9 h-9 rounded-full border-2 border-ink overflow-hidden flex items-center justify-center font-dmmono font-bold text-[11px] uppercase tracking-wider bg-ochre text-ink hover:scale-105 transition-transform duration-[180ms] ease-out"
        >
          {#if user.image}
            <img src={user.image} alt="" class="w-full h-full object-cover" />
          {:else}
            {initialsOf(user.name)}
          {/if}
        </a>
      {:else}
        <a
          href="/login"
          aria-label="Sign in"
          class="w-9 h-9 rounded-full border-2 border-ink flex items-center justify-center font-dmmono font-bold text-[11px] bg-ochre text-ink hover:scale-105 transition-transform duration-[180ms] ease-out"
        >EA</a>
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
        class="flex-1 py-3 font-dmmono text-[10px] uppercase tracking-[0.12em] text-center transition-colors {
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
