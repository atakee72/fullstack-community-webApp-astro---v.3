<script lang="ts">
  /**
   * Sentry errors card — self-fetching widget on the admin moderation
   * dashboard (desktop only). Consumes `GET /api/admin/errors` (Task 2's
   * proxy) verbatim:
   *   { enabled: false }
   *   { enabled: true, totalLast24h, topIssues: [{ id, title, permalink, count24h }] }
   *   502 { error: 'sentry_unreachable' }
   *
   * Five states: loading skeleton → disabled (no SENTRY_* env, the normal
   * pre-setup state, not an error) → unreachable (502 or fetch rejection,
   * warn tone, no toast — the card itself is the signal) → loaded/zero
   * issues (italic "all clear" line) → loaded/issues (total + up to 3
   * issue rows, each linking out to Sentry).
   *
   * Self-fetches on mount + refreshes every 5 min; a `seq` guard (mirrors
   * ModerationApp's `fetchSeq`) drops stale in-flight responses.
   */
  import { onMount, onDestroy } from 'svelte';
  import { t, tStr } from '../../../lib/kiosk-i18n';

  type TopIssue = { id: string; title: string; permalink: string; count24h: number };

  let loading = $state(true);
  let unreachable = $state(false);
  let enabled = $state<boolean | null>(null);
  let totalLast24h = $state(0);
  let topIssues = $state<TopIssue[]>([]);

  let fetchSeq = 0;
  let intervalId: ReturnType<typeof setInterval> | undefined;

  async function fetchErrors(): Promise<void> {
    const seq = ++fetchSeq;
    loading = true;
    try {
      const res = await fetch('/api/admin/errors', { credentials: 'include' });
      if (seq !== fetchSeq) return;
      if (!res.ok) {
        unreachable = true;
        enabled = null;
        totalLast24h = 0;
        topIssues = [];
        return;
      }
      const json = await res.json();
      if (seq !== fetchSeq) return;

      if (json && 'error' in json) {
        unreachable = true;
        enabled = null;
        totalLast24h = 0;
        topIssues = [];
      } else if (json?.enabled === false) {
        unreachable = false;
        enabled = false;
        totalLast24h = 0;
        topIssues = [];
      } else {
        unreachable = false;
        enabled = true;
        totalLast24h = json.totalLast24h ?? 0;
        topIssues = Array.isArray(json.topIssues) ? json.topIssues : [];
      }
    } catch {
      if (seq !== fetchSeq) return;
      unreachable = true;
      enabled = null;
      totalLast24h = 0;
      topIssues = [];
    } finally {
      if (seq === fetchSeq) loading = false;
    }
  }

  onMount(() => {
    void fetchErrors();
    intervalId = setInterval(() => void fetchErrors(), 5 * 60_000);
  });

  onDestroy(() => {
    if (intervalId) clearInterval(intervalId);
  });

  // The permalink carries the org — reuse its origin for the header's
  // "open in Sentry" link when we have at least one issue; otherwise fall
  // back to the bare dashboard root.
  const openHref = $derived.by(() => {
    const first = topIssues[0]?.permalink;
    if (!first) return 'https://sentry.io';
    try {
      return new URL(first).origin;
    } catch {
      return 'https://sentry.io';
    }
  });
</script>

<section style="padding: 18px 36px 0;">
  <div
    style="
      background: var(--k-paper-warm); border: 1.5px solid var(--k-ink); border-radius: var(--k-radius-md);
      padding: 12px 16px 14px;
    "
  >
    <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
      <span class="font-dmmono" style="font-size: 10px; color: var(--k-accent); letter-spacing: 0.1em; text-transform: uppercase;">
        {$t['admin.errors.kicker']}
      </span>
      <a
        href={openHref}
        target="_blank"
        rel="noopener"
        class="font-dmmono"
        style="font-size: 10.5px; color: var(--k-ink-mute); text-decoration: none; white-space: nowrap;"
      >{$t['admin.errors.open']}</a>
    </div>

    {#if loading}
      <div class="k-skeleton" style="height: 14px; width: 55%; border-radius: var(--k-radius-sm); margin-top: 10px;"></div>
    {:else if unreachable}
      <div class="font-dmmono" style="font-size: 12.5px; color: var(--k-warn); margin-top: 8px;">
        {$t['admin.errors.unreachable']}
      </div>
    {:else if enabled === false}
      <div class="font-dmmono" style="font-size: 12.5px; color: var(--k-ink-mute); margin-top: 8px;">
        {$t['admin.errors.disabled']}
      </div>
    {:else if enabled === true && topIssues.length === 0}
      <p class="font-instrument" style="font-style: italic; font-size: 14px; color: var(--k-ink-soft); margin: 8px 0 0;">
        {$t['admin.errors.none']}
      </p>
    {:else if enabled === true}
      <div style="margin-top: 10px;">
        <span class="font-dmmono" style="font-size: 11px; color: var(--k-ink); font-weight: 600;">
          {totalLast24h} {$t['admin.errors.total']}
        </span>
        <div class="font-dmmono" style="font-size: 10px; color: var(--k-ink-mute); letter-spacing: 0.08em; margin: 10px 0 6px;">
          {$t['admin.errors.top']}
        </div>
        <div style="display: flex; flex-direction: column; gap: 6px;">
          {#each topIssues.slice(0, 3) as issue (issue.id)}
            <a
              href={issue.permalink}
              target="_blank"
              rel="noopener"
              title={issue.title}
              style="display: flex; align-items: center; gap: 8px; text-decoration: none; color: inherit;"
            >
              <span
                class="font-dmmono"
                style="
                  flex-shrink: 0; font-size: 10px; font-weight: 700; color: var(--k-paper);
                  background: var(--k-danger); padding: 2px 7px; border-radius: var(--k-radius-sm);
                  border: 1px solid var(--k-ink);
                "
              >{tStr($t['admin.errors.count'], { n: issue.count24h })}</span>
              <span
                class="font-bricolage"
                style="font-size: 13px; color: var(--k-ink); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
              >{issue.title}</span>
            </a>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</section>
