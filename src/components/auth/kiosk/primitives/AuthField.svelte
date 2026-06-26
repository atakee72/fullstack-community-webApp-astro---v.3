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
  const borderColor = $derived(
    error ? 'var(--k-danger)' : success ? 'var(--k-success)' : 'var(--k-rule)'
  );
</script>

<label style="display:block; opacity:{disabled ? 0.55 : 1};">
  <div class="flex items-baseline justify-between" style="margin-bottom:5px;">
    <span class="font-dmmono uppercase" style="font-size:10.5px; letter-spacing:0.1em; color:var(--k-ink-soft);">{label}</span>
    {#if hint}
      <span class="font-dmmono" style="font-size:9.5px; color:{error ? 'var(--k-danger)' : 'var(--k-ink-mute)'};">{hint}</span>
    {/if}
  </div>
  <div class="flex items-center" style="gap:8px; background:var(--k-paper-soft); border:1.5px solid {borderColor}; border-radius:12px; padding:11px 13px;">
    <input
      class="font-bricolage"
      style="flex:1; min-width:0; background:transparent; border:none; outline:none; font-size:14.5px; color:var(--k-ink);"
      type={inputType}
      {name}
      {placeholder}
      {value}
      {disabled}
      autocomplete={autocomplete || undefined}
      oninput={(e) => oninput((e.currentTarget as HTMLInputElement).value)}
    />
    {#if showToggle}
      <button type="button" class="font-dmmono" style="font-size:10px; color:var(--k-ink-mute); letter-spacing:0.05em; background:none; border:none; border-bottom:1px dashed var(--k-ink-mute); cursor:pointer; padding:0;"
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
</label>
