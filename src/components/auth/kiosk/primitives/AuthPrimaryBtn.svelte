<script lang="ts">
  import type { Snippet } from 'svelte';
  let {
    loading = false,
    disabled = false,
    type = 'submit',
    onclick = () => {},
    children,
  }: {
    loading?: boolean; disabled?: boolean; type?: 'submit' | 'button';
    onclick?: () => void; children?: Snippet;
  } = $props();
</script>

<button
  {type}
  disabled={disabled || loading}
  {onclick}
  class="auth-primary-btn font-bricolage"
  style="width:100%; display:flex; align-items:center; justify-content:center; gap:9px;
         background:{disabled ? 'var(--k-ink-mute)' : 'var(--k-ink)'}; color:var(--k-paper);
         font-size:15px; font-weight:700; padding:13px 18px; border-radius:999px;
         border:1.5px solid var(--k-ink);
         box-shadow:{disabled ? 'none' : '3px 3px 0 var(--k-accent)'};
         cursor:{disabled || loading ? 'not-allowed' : 'pointer'};"
>
  {#if loading}
    <span class="auth-spin" style="width:13px; height:13px; border-radius:50%; border:2px solid var(--k-paper); border-top-color:transparent; display:inline-block;"></span>
  {/if}
  {@render children?.()}
</button>

<style>
  @keyframes authSpin { to { transform: rotate(360deg); } }
  .auth-spin { animation: authSpin 0.7s linear infinite; }
  @media (prefers-reduced-motion: reduce) { .auth-spin { animation: none; } }
</style>
