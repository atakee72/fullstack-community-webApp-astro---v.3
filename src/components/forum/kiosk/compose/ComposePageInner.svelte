<script lang="ts">
  // Compose-page logic island. Wraps ComposeForm + ComposePreview in
  // the desktop split layout (form on the left, sticky preview sidebar
  // on the right) and orchestrates the submit flow:
  //
  //   1. validate (title 5–80, body 10–2000, ≤5 images)
  //   2. upload pending images sequentially via POST /api/posts/upload
  //   3. call createTopic mutation (POST /api/topics/create) — modal opens
  //   4. on resolve → clear draft, dismiss modal, navigate to /?just_posted=1
  //   5. on RateLimitError → swap form for RateLimitPanel
  //   6. on other errors → surface inline below the publish button
  //
  // Localstorage draft auto-saves on every form change with a 500 ms
  // debounce. Restored from `topicDraft` on first paint when present.
  //
  // The `?just_posted=1` query param is read by ForumIndexInner to
  // trigger the live-mode footer + slide-in for the new card on the
  // home page (handles the cross-page navigation case the
  // forumMutations.ts in-memory `lastSubmittedAt` writable can't span).

  import ComposeForm, { type ComposeValues } from './ComposeForm.svelte';
  import ComposePreview from './ComposePreview.svelte';
  import ModeratingModal from './ModeratingModal.svelte';
  import RateLimitPanel from '../states/RateLimitPanel.svelte';
  import {
    topicDraft,
    type DraftValues
  } from '../../../../lib/composeDraftStore';
  import {
    createTopicMutation,
    RateLimitError
  } from '../../../../lib/forumMutations';
  import { t } from '../../../../lib/kiosk-i18n';
  import { onMount } from 'svelte';

  let { currentUser } = $props<{
    currentUser: { id: string; name?: string; image?: string | null };
  }>();

  // ─── Form state ─────────────────────────────────────────────────────
  // The form bubbles values up via onChange. We mirror them here so the
  // preview sidebar can observe and the submit handler can read.
  let values = $state<ComposeValues>({
    title: '',
    body: '',
    kind: 'discussion',
    tags: [],
    pendingFiles: [],
    existingImages: []
  });

  // Restore draft on mount.
  let initialValues: Partial<ComposeValues> | undefined = $state(undefined);
  onMount(() => {
    let saved: DraftValues | null = null;
    topicDraft.subscribe((v) => (saved = v))();
    if (saved) {
      const s = saved as DraftValues;
      initialValues = {
        title: s.title,
        body: s.body,
        kind: s.kind,
        tags: s.tags,
        pendingFiles: [],
        existingImages: []
      };
    }
  });

  // Debounced auto-save. Writes title/body/kind/tags only — pending
  // files are local object URLs that don't survive a reload anyway.
  let draftTimer: ReturnType<typeof setTimeout> | null = null;
  $effect(() => {
    const snapshot: DraftValues = {
      title: values.title,
      body: values.body,
      kind: values.kind,
      tags: values.tags
    };
    // No-op when everything's empty so we don't write a blank draft on
    // first paint of an unauthored form.
    if (!snapshot.title && !snapshot.body && !snapshot.tags.length) return;

    if (draftTimer) clearTimeout(draftTimer);
    draftTimer = setTimeout(() => topicDraft.setDraft(snapshot), 500);
    return () => {
      if (draftTimer) clearTimeout(draftTimer);
    };
  });

  function handleChange(next: ComposeValues) {
    values = next;
  }

  // ─── Mutation ───────────────────────────────────────────────────────
  const create = createTopicMutation({
    id: currentUser.id,
    name: currentUser.name,
    image: currentUser.image
  });

  let submitting = $state(false);
  let modalOpen = $state(false);
  let rateLimited = $state(false);
  let inlineError = $state<string | null>(null);

  // Image upload (lazy — fires only on submit).
  async function uploadPendingFiles(files: File[]) {
    const uploaded: { url: string; publicId: string }[] = [];
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/posts/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Image upload failed');
      }
      const json = (await res.json()) as { url: string; publicId: string };
      uploaded.push({ url: json.url, publicId: json.publicId });
    }
    return uploaded;
  }

  function validate(v: ComposeValues): string | null {
    if (v.title.trim().length < 5) return 'Titel zu kurz (mind. 5 Zeichen).';
    if (v.title.length > 80) return 'Titel zu lang (max. 80 Zeichen).';
    if (v.body.trim().length < 10) return 'Text zu kurz (mind. 10 Zeichen).';
    if (v.body.length > 2000) return 'Text zu lang (max. 2000 Zeichen).';
    if (v.tags.length > 3) return 'Zu viele Tags (max. 3).';
    if (v.existingImages.length + v.pendingFiles.length > 5)
      return 'Zu viele Bilder (max. 5).';
    return null;
  }

  async function onPublish() {
    if (submitting) return;
    inlineError = null;

    const err = validate(values);
    if (err) {
      inlineError = err;
      return;
    }

    submitting = true;
    modalOpen = true;
    try {
      const uploadedNew =
        values.pendingFiles.length > 0
          ? await uploadPendingFiles(values.pendingFiles)
          : [];
      const allImages = [...values.existingImages, ...uploadedNew];

      await create.mutateAsync({
        title: values.title.trim(),
        body: values.body.trim(),
        tags: values.tags,
        images: allImages
      });

      topicDraft.clearDraft();
      modalOpen = false;
      // Navigate to home with marker so ForumIndexInner can show the
      // 'live' footer + slide-in for the just-created card.
      if (typeof window !== 'undefined') {
        window.location.href = '/?just_posted=1';
      }
    } catch (caught) {
      modalOpen = false;
      submitting = false;
      if (caught instanceof RateLimitError) {
        rateLimited = true;
      } else {
        inlineError =
          caught instanceof Error ? caught.message : 'Veröffentlichen fehlgeschlagen.';
      }
    }
  }

  function onSaveDraft() {
    topicDraft.setDraft({
      title: values.title,
      body: values.body,
      kind: values.kind,
      tags: values.tags
    });
    if (typeof window !== 'undefined') window.location.href = '/';
  }

  function onDiscard() {
    topicDraft.clearDraft();
    if (typeof window !== 'undefined') window.location.href = '/';
  }
</script>

{#if rateLimited}
  <RateLimitPanel unlocksIn={null} />
{:else}
  <div class="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-0 min-h-[calc(100vh-180px)]">
    <ComposeForm
      initialValues={initialValues}
      onChange={handleChange}
    />
    <ComposePreview
      values={values}
      currentUser={{ name: currentUser.name, image: currentUser.image }}
      submitting={submitting}
      onPublish={onPublish}
      onSaveDraft={onSaveDraft}
      onDiscard={onDiscard}
    />
  </div>

  {#if inlineError}
    <div class="px-6 md:px-9 pb-6">
      <p
        class="font-bricolage text-sm text-danger px-3.5 py-2 bg-danger/10 border border-danger rounded-md"
        role="alert"
      >
        {inlineError}
      </p>
    </div>
  {/if}

  <ModeratingModal open={modalOpen} onDismiss={() => (modalOpen = false)} />
{/if}
