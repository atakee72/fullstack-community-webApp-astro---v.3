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
   * The interactive variants wear `kiosk-tap-box` and paint the pill on an
   * inner span: the index's mobile rubric row is an overflow-x scroller,
   * which clips a `.kiosk-tap` extender vertically (measured 54×28 — the
   * scroller's own box height), so the hit area has to be the button itself.
   * Painted pill is unchanged; only the invisible box grows, below lg.
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
  #{tag}{#if n != null}<span style="opacity: 0.55;">{' '}{n}</span>{/if}
{/snippet}

{#snippet chipPill()}
  <span
    class="font-dmmono rounded-full whitespace-nowrap inline-block"
    style="
      font-size: {small ? '10px' : '10.5px'};
      padding: {small ? '2px 8px' : '3px 10px'};
      border: 1.5px solid {active ? 'var(--k-rust)' : 'var(--k-ink)'};
      background: {active ? 'var(--k-rust)' : 'transparent'};
      color: {active ? 'var(--k-paper)' : 'var(--k-ink)'};
    "
  >{@render chipContent()}</span>
{/snippet}

{#if href}
  <a
    {href}
    class="kiosk-tap-box inline-flex items-center justify-center shrink-0"
    style="text-decoration: none;"
  >{@render chipPill()}</a>
{:else if onclick}
  <button
    type="button"
    {onclick}
    class="kiosk-tap-box inline-flex items-center justify-center shrink-0"
    style="background: none; border: none; padding: 0; cursor: pointer;"
  >{@render chipPill()}</button>
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
