<script lang="ts">
  /**
   * Rubric/tag pill — shared atom reused by the rubric row, sidebar
   * Rubriken-Cloud, lead-card tag list, and state-02 exit chips.
   * Idle = ink border / transparent bg / ink text. Active = rust border /
   * rust bg / paper text. Renders an <a> when `href` is given, a
   * <button type="button"> when `onclick` is given, and a plain
   * non-interactive <span> (no cursor-pointer, not focusable) when
   * neither is provided — so no call site can accidentally render a
   * dead-button affordance that swallows clicks and does nothing.
   * Transcribed from
   * design/handoffs/design_handoff_blog/jsx/kiosk-blog.jsx `BlRubrik`.
   */
  let {
    tag,
    n,
    active = false,
    small = false,
    href,
    onclick,
  }: {
    tag: string;
    n?: number;
    active?: boolean;
    small?: boolean;
    href?: string;
    onclick?: () => void;
  } = $props();
</script>

{#snippet chipContent()}
  #{tag}{#if n != null}<span style="opacity: 0.55;"> {n}</span>{/if}
{/snippet}

{#if href}
  <a
    {href}
    class="font-dmmono rounded-full whitespace-nowrap shrink-0 inline-block"
    style="
      text-decoration: none;
      font-size: {small ? '10px' : '10.5px'};
      padding: {small ? '2px 8px' : '3px 10px'};
      border: 1.5px solid {active ? 'var(--k-rust)' : 'var(--k-ink)'};
      background: {active ? 'var(--k-rust)' : 'transparent'};
      color: {active ? 'var(--k-paper)' : 'var(--k-ink)'};
    "
  >{@render chipContent()}</a>
{:else if onclick}
  <button
    type="button"
    {onclick}
    class="font-dmmono rounded-full whitespace-nowrap shrink-0"
    style="
      font-size: {small ? '10px' : '10.5px'};
      padding: {small ? '2px 8px' : '3px 10px'};
      border: 1.5px solid {active ? 'var(--k-rust)' : 'var(--k-ink)'};
      background: {active ? 'var(--k-rust)' : 'transparent'};
      color: {active ? 'var(--k-paper)' : 'var(--k-ink)'};
      cursor: pointer;
    "
  >{@render chipContent()}</button>
{:else}
  <span
    class="font-dmmono rounded-full whitespace-nowrap shrink-0 inline-block"
    style="
      font-size: {small ? '10px' : '10.5px'};
      padding: {small ? '2px 8px' : '3px 10px'};
      border: 1.5px solid {active ? 'var(--k-rust)' : 'var(--k-ink)'};
      background: {active ? 'var(--k-rust)' : 'transparent'};
      color: {active ? 'var(--k-paper)' : 'var(--k-ink)'};
    "
  >{@render chipContent()}</span>
{/if}
