<script lang="ts">
  /**
   * Composer card — create + edit an official announcement. Transcribed
   * from design/handoffs/design_handoff_announce/jsx/kiosk-admin-announce.jsx:91-119
   * (anatomy) and :301-307 (state 04, error).
   *
   * Owns its OWN title/body input state, seeded from `initialTitle`/
   * `initialBody` at mount time. The parent (AnnounceApp) forces a fresh
   * mount (via a `{#key}` block around this component) whenever the
   * compose target changes — entering/leaving edit mode, switching which
   * item is being edited, or a successful create — so "clear composer on
   * success" and "prefill on edit" both fall out of remounting rather
   * than two-way binding. A failed submit does NOT change the key, so
   * this instance survives and its typed title/body are naturally
   * untouched ("nichts verloren").
   *
   * Error-box dismissal ("any input change while composeError is set
   * clears it back to the normal CTA row") is handled locally: a
   * `suppressError` flag flips true on the first keystroke after an
   * error, hiding the box without telling the parent. `onRetry` takes
   * the other path — it's the parent clearing `errorState` itself — both
   * converge on the same rendered result.
   */
  import { t, tStr } from '../../../../lib/kiosk-i18n';
  import { truncate } from './annFormat';

  let {
    mode,
    initialTitle = '',
    initialBody = '',
    currentPinTitle,
    saving,
    errorState,
    onSubmit,
    onCancel,
    onRetry,
  }: {
    mode: 'create' | 'edit';
    initialTitle?: string;
    initialBody?: string;
    currentPinTitle: string | null;
    saving: boolean;
    errorState: boolean;
    onSubmit: (title: string, body: string) => void;
    onCancel?: () => void;
    onRetry: () => void;
  } = $props();

  let title = $state(initialTitle);
  let body = $state(initialBody);

  // Local override — see file header comment.
  let suppressError = $state(false);
  $effect(() => {
    if (errorState) suppressError = false;
  });
  const showError = $derived(errorState && !suppressError);

  function onFieldInput() {
    suppressError = true;
  }

  const disabled = $derived(saving || title.trim().length < 5 || body.trim().length < 10);

  function handleSubmit() {
    if (disabled) return;
    onSubmit(title, body);
  }

  const fieldStyle =
    'width: 100%; box-sizing: border-box; background: var(--k-paper-soft); border-radius: var(--k-radius-sm); ' +
    'padding: 10px 12px; font-size: 14px; line-height: 1.5; color: var(--k-ink); resize: vertical;';
</script>

{#snippet ghostBtn(label: string, onclick: () => void)}
  <button
    type="button"
    {onclick}
    disabled={saving}
    class="font-bricolage"
    style="
      background: transparent; color: var(--k-ink); border: 1.5px solid var(--k-ink);
      border-radius: var(--k-radius-pill); padding: 8px 16px;
      font-size: 13px; font-weight: 700; cursor: {saving ? 'not-allowed' : 'pointer'};
      opacity: {saving ? 0.5 : 1};
    "
  >{label}</button>
{/snippet}

<div
  style="
    background: var(--k-paper-warm); border: var(--k-border-ink);
    border-top: 4px solid var(--k-accent); border-radius: var(--k-radius-lg);
    box-shadow: 3px 3px 0 var(--k-accent); padding: 20px 22px 18px;
  "
>
  <div class="font-dmmono" style="font-size: 10px; color: var(--k-accent); letter-spacing: 0.12em; margin-bottom: 10px;">
    {mode === 'edit' ? $t['admin.ann.composer.kickerEdit'] : $t['admin.ann.composer.kicker']}
  </div>

  <div style="display: flex; flex-direction: column; gap: 10px;">
    <div>
      <label for="ann-composer-title" class="font-bricolage" style="display: block; font-size: 12.5px; font-weight: 700; margin-bottom: 4px;">
        {$t['admin.ann.field.title']}
        <span class="font-dmmono" style="font-size: 10px; font-weight: 400; color: var(--k-ink-mute);">{$t['admin.ann.field.titleMax']}</span>
      </label>
      <input
        id="ann-composer-title"
        type="text"
        maxlength="120"
        bind:value={title}
        oninput={onFieldInput}
        placeholder={$t['admin.ann.field.titlePh']}
        class="font-bricolage"
        style="{fieldStyle} border: {title ? '1.5px solid var(--k-ink)' : '1px solid var(--k-rule)'};"
      />
    </div>
    <div>
      <label for="ann-composer-body" class="font-bricolage" style="display: block; font-size: 12.5px; font-weight: 700; margin-bottom: 4px;">
        {$t['admin.ann.field.body']}
      </label>
      <textarea
        id="ann-composer-body"
        bind:value={body}
        oninput={onFieldInput}
        placeholder={$t['admin.ann.field.bodyPh']}
        rows="4"
        class="font-bricolage"
        style="{fieldStyle} min-height: 84px; border: {body ? '1.5px solid var(--k-ink)' : '1px solid var(--k-rule)'};"
      ></textarea>
    </div>
  </div>

  {#if mode === 'create'}
    <div
      class="font-dmmono"
      style="margin-top: 12px; padding: 9px 12px; background: rgba(63,143,159,0.09); border: 1.5px solid var(--k-teal); border-radius: var(--k-radius-sm); font-size: 10.5px; line-height: 1.55; color: var(--k-ink-soft);"
    >
      ⏱ {$t['admin.ann.note.fixed']}{#if currentPinTitle}<b style="color: var(--k-ink);">{tStr($t['admin.ann.note.replaces'], { title: truncate(currentPinTitle, 40) })}</b>{/if}
    </div>
  {/if}

  {#if showError}
    <div
      style="margin-top: 14px; border: 1.5px solid var(--k-danger); border-radius: var(--k-radius-md); padding: 12px 14px; background: rgba(168,50,69,0.05);"
    >
      <div class="font-bricolage" style="font-size: 13.5px; font-weight: 700; color: var(--k-danger);">{$t['admin.ann.error.title']}</div>
      <div style="font-size: 12px; color: var(--k-ink-soft); margin-top: 4px; line-height: 1.5;">{$t['admin.ann.error.hint']}</div>
      <div style="margin-top: 10px;">
        {@render ghostBtn($t['admin.ann.error.retry'], onRetry)}
      </div>
    </div>
  {:else}
    <div style="display: flex; align-items: center; gap: 12px; margin-top: 14px; flex-wrap: wrap;">
      <button
        type="button"
        onclick={handleSubmit}
        disabled={disabled}
        class="font-bricolage"
        style="
          background: var(--k-ink); color: var(--k-paper); border: var(--k-border-ink);
          border-radius: var(--k-radius-pill); padding: 10px 20px;
          font-size: 14px; font-weight: 700; box-shadow: 2px 2px 0 var(--k-teal);
          cursor: {disabled ? 'not-allowed' : 'pointer'}; opacity: {disabled ? 0.6 : 1};
        "
      >{mode === 'edit' ? $t['admin.ann.cta.save'] : $t['admin.ann.cta.create']}</button>
      {#if mode === 'edit'}
        {@render ghostBtn($t['admin.ann.cta.cancel'], () => onCancel?.())}
      {/if}
      <span class="font-dmmono" style="font-size: 10px; color: var(--k-ink-mute);">
        {mode === 'edit' ? `PATCH /api/admin/announcements/{id}` : 'POST /api/admin/announcements/create'}
      </span>
    </div>
  {/if}
</div>
