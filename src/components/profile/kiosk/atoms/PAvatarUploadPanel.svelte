<script lang="ts">
  // In-card avatar upload panel — renders below the identity header row
  // for the picking / uploading / error / saved states (idle renders
  // nothing; the header's PAvatar + ÄNDERN chip cover that). Real upload
  // (XMLHttpRequest, progress, cancel) lives in the parent (PIdentityCard)
  // — this component is presentation + the file input/dropzone only.
  // Design source: kiosk-profile-flows.jsx §02 (AvatarUploadStates) +
  // kiosk-profile-states.jsx §06/§07 (in-card uploading/error — "rest of
  // the profile stays usable").

  import { t } from '../../../../lib/kiosk-i18n';

  let {
    panelState,
    percent = null,
    errorKey = null,
    onPickFile,
    onCancelUpload,
    onRetry,
    onPickOther,
  }: {
    panelState: 'picking' | 'uploading' | 'error' | 'saved';
    percent?: number | null;
    errorKey?: 'size' | 'format' | 'network' | null;
    onPickFile: (file: File) => void;
    onCancelUpload: () => void;
    onRetry: () => void;
    onPickOther: () => void;
  } = $props();

  let dragOver = $state(false);
  let inputEl: HTMLInputElement | undefined = $state();

  function openPicker() {
    inputEl?.click();
  }

  function handleDropzoneKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openPicker();
    }
  }

  function handleInputChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) onPickFile(file);
    (e.target as HTMLInputElement).value = ''; // allow re-selecting the same file next time
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    const file = e.dataTransfer?.files?.[0];
    if (file) onPickFile(file);
  }

  const errKey = $derived(`profile.avatar.err.${errorKey ?? 'network'}` as keyof typeof $t);
  const actionLabel = $derived(errorKey === 'network' ? $t['profile.avatar.retry'] : $t['profile.avatar.pickother']);
</script>

<div style="margin-top: 14px; padding-top: 14px; border-top: 1.5px dashed var(--k-rule);">
  {#if panelState === 'picking'}
    <input
      bind:this={inputEl}
      type="file"
      accept="image/jpeg,image/png,image/webp"
      aria-label={$t['profile.avatar.change']}
      onchange={handleInputChange}
      style="position: absolute; width: 1px; height: 1px; overflow: hidden; opacity: 0; pointer-events: none;"
    />
    <div
      role="button"
      tabindex="0"
      onclick={openPicker}
      onkeydown={handleDropzoneKeydown}
      ondragover={(e) => { e.preventDefault(); dragOver = true; }}
      ondragleave={() => (dragOver = false)}
      ondrop={handleDrop}
      style="
        min-height: 88px; display: flex; flex-direction: column; align-items: center; justify-content: center;
        gap: 6px; padding: 14px; border-radius: 10px; cursor: pointer; box-sizing: border-box;
        border: 2px dashed {dragOver ? 'var(--k-ink)' : 'var(--k-ink-mute)'};
        background: {dragOver ? 'var(--k-paper-soft)' : 'transparent'};
      "
    >
      <span style="font-size: 22px; line-height: 1;" aria-hidden="true">⇪</span>
      <span class="font-dmmono" style="font-size: 10px; color: var(--k-ink-mute); text-align: center;">{$t['profile.avatar.drop']}</span>
      <span class="font-dmmono" style="font-size: 9px; color: var(--k-ink-mute); text-align: center;">{$t['profile.avatar.hint']}</span>
    </div>
  {:else if panelState === 'uploading'}
    <div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent ?? undefined}
        style="width: 140px; max-width: 100%; height: 10px; border: 1.5px solid var(--k-ink); border-radius: 999px; overflow: hidden; background: var(--k-paper-soft); box-sizing: border-box;"
      >
        <div
          class={percent === null ? 'prof-upload-indeterminate' : ''}
          style="height: 100%; background: var(--k-ochre); width: {percent === null ? '8%' : percent + '%'}; transition: width 120ms linear;"
        ></div>
      </div>
      <div class="font-dmmono" style="font-size: 9.5px; color: var(--k-ink-mute); margin-top: 5px;">
        {percent === null ? '…' : `${percent}%`} ·
        <button
          type="button"
          onclick={onCancelUpload}
          style="font-family: var(--k-font-mono); font-size: 9.5px; color: var(--k-ink-mute); background: none; border: none; padding: 6px 4px; margin: -6px -4px; text-decoration: underline; cursor: pointer;"
        >{$t['profile.avatar.cancel']}</button>
      </div>
    </div>
  {:else if panelState === 'error'}
    <div style="display: flex; gap: 11px; padding: 8px 11px; background: #f6e3e3; border: 1.5px solid var(--k-danger); border-radius: 8px;">
      <span style="font-family: var(--k-font-mono); font-size: 11px; color: var(--k-danger); font-weight: 700; flex-shrink: 0;">✕</span>
      <div class="font-dmmono" style="font-size: 9.5px; color: var(--k-ink-soft); line-height: 1.55;">
        {$t[errKey]}
        <button
          type="button"
          onclick={errorKey === 'network' ? onRetry : onPickOther}
          style="font-family: var(--k-font-mono); font-size: 9.5px; font-weight: 700; color: var(--k-danger); background: none; border: none; border-bottom: 1.5px solid var(--k-danger); padding: 6px 4px; margin: -6px -4px; cursor: pointer;"
        >{actionLabel}</button>
      </div>
    </div>
  {:else if panelState === 'saved'}
    <div class="font-dmmono prof-chip-in" style="display: flex; align-items: center; gap: 6px; font-size: 9.5px; color: var(--k-success);">
      <span>✓</span> {$t['profile.avatar.saved']}
    </div>
  {/if}
</div>
