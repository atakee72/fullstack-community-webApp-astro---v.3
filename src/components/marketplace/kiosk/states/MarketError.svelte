<script lang="ts">
  // Error state — §04. Top danger banner + retry.
  // The orchestrator decides whether to show cached items behind it;
  // this component only renders the banner.

  import { t } from '../../../../lib/kiosk-i18n';

  let {
    error,
    onRetry,
  }: {
    error: Error | string | null;
    onRetry: () => void | Promise<void>;
  } = $props();

  const errorMessage = $derived(
    error instanceof Error ? error.message : (error ?? ''),
  );
</script>

<div style="margin: 24px 20px;" role="alert" aria-live="polite">
  <!-- Error banner -->
  <div
    style="
      padding: 10px 14px;
      background: var(--k-danger, #c0392b);
      color: var(--k-paper);
      border: var(--k-border-ink);
      border-radius: var(--k-radius-sm);
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
    "
  >
    <span aria-hidden="true" style="font-size: 16px;">⚠</span>
    <span
      class="font-bricolage"
      style="flex: 1; font-weight: 600; font-size: 13px;"
    >
      {$t['market.state.error.banner']}
    </span>
    <button
      type="button"
      onclick={() => onRetry()}
      class="font-dmmono"
      style="
        font-size: 10px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--k-paper);
        background: none;
        border: none;
        cursor: pointer;
        text-decoration: underline;
        text-decoration-style: dashed;
        padding: 0;
        white-space: nowrap;
      "
    >
      {$t['market.state.error.retry']}
    </button>
  </div>

  {#if errorMessage}
    <p
      class="font-dmmono"
      style="
        margin: 8px 0 0;
        font-size: 10px;
        color: var(--k-ink-mute);
        letter-spacing: 0.04em;
      "
    >
      {errorMessage}
    </p>
  {/if}
</div>
