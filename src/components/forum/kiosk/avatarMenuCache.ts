// Module-scope cache for AvatarMenu's who-am-i fetch — survives the island
// remounting on every menu open, so /api/profile/me is hit once per page
// load, not once per open. Equivalent to a Svelte `<script module>` block;
// kept as a plain module for clarity. (The 2026-08-04 unstyled-prod bug was
// NOT caused by the module script — root cause was Astro orphaning the
// component's extracted CSS, see AvatarMenu.svelte / global.css `.am-*`.)
// Dependency-pure: safe for client import.
export interface WhoamiCache {
  handle: string | null;
  sinceYear: number | null;
}

export let whoamiCache: WhoamiCache | null = null;

export function setWhoamiCache(v: WhoamiCache): void {
  whoamiCache = v;
}
