<script lang="ts">
  import { t } from '../../../../lib/kiosk-i18n';

  let {
    label,
    value = '',
    placeholder = '',
    type = 'text',
    name = '',
    autocomplete = '',
    error = null,
    success = false,
    hint = '',
    showToggle = false,
    disabled = false,
    oninput = (_v: string) => {},
  }: {
    label: string; value?: string; placeholder?: string;
    type?: 'text' | 'email' | 'password'; name?: string; autocomplete?: string;
    error?: string | null; success?: boolean; hint?: string;
    showToggle?: boolean; disabled?: boolean; oninput?: (v: string) => void;
  } = $props();

  let revealed = $state(false);
  const inputType = $derived(type === 'password' && revealed ? 'text' : type);
  const fieldId = $derived(`auth-field-${name || label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`);
  let inputEl = $state<HTMLInputElement | null>(null);
  const borderColor = $derived(
    error ? 'var(--k-danger)' : success ? 'var(--k-success)' : 'var(--k-rule)'
  );
</script>

<!-- Not a wrapping <label>: with the show/hide toggle inside, the browser's
     accessible-name computation concatenated „Passwort zeigen" onto the input
     (auth audit, 2026-09-10). `for`/`id` pairing instead; the box still focuses
     the input on click. -->
<div style="display:block; opacity:{disabled ? 0.55 : 1};">
  <div class="flex items-baseline justify-between" style="margin-bottom:5px;">
    <label for={fieldId} class="font-dmmono uppercase" style="font-size:10.5px; letter-spacing:0.1em; color:var(--k-ink-soft); cursor:pointer;">{label}</label>
    {#if hint}
      <span class="font-dmmono" style="font-size:9.5px; color:{error ? 'var(--k-danger)' : 'var(--k-ink-mute)'};">{hint}</span>
    {/if}
  </div>
  <!-- focus-within ring on the box replaces the input's own outline (WCAG 2.4.7);
       16px on touch viewports keeps iOS Safari from zooming on focus. -->
  <div
    class="flex items-center focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink"
    style="gap:8px; background:var(--k-paper-soft); border:1.5px solid {borderColor}; border-radius:12px; padding:11px 13px;"
    onclick={(e) => { if (!(e.target as HTMLElement).closest('button')) inputEl?.focus(); }}
  >
    <input
      bind:this={inputEl}
      id={fieldId}
      class="font-bricolage text-[16px] lg:text-[14.5px]"
      style="flex:1; min-width:0; background:transparent; border:none; outline:none; color:var(--k-ink);"
      type={inputType}
      {name}
      {placeholder}
      {value}
      {disabled}
      autocomplete={autocomplete || undefined}
      oninput={(e) => oninput((e.currentTarget as HTMLInputElement).value)}
    />
    {#if showToggle}
      <!-- kiosk-tap, not a bigger box: the extender is out of flow, so the
           field keeps its 11px/13px padding while the toggle gets 48px. -->
      <button type="button" class="font-dmmono kiosk-tap" style="font-size:10px; color:var(--k-ink-mute); letter-spacing:0.05em; background:none; border:none; border-bottom:1px dashed var(--k-ink-mute); cursor:pointer; padding:0;"
        onclick={() => (revealed = !revealed)}>
        {revealed ? $t['auth.field.hide'] : $t['auth.field.show']}
      </button>
    {/if}
    {#if success && !error}
      <span style="color:var(--k-success); font-size:13px;">✓</span>
    {/if}
  </div>
  {#if error}
    <div class="flex items-center font-dmmono" style="gap:5px; margin-top:5px; font-size:10.5px; color:var(--k-danger);">
      <span>✕</span>{error}
    </div>
  {/if}
</div>
