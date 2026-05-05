<script lang="ts">
  // Admin Official Announcements panel — composer (top) + list (below).
  //
  // Composer posts to /api/admin/announcements/create, which bypasses
  // moderation (admin is trusted), sets isOfficial: true, and pins for
  // 7 days while displacing any previously-pinned official.
  //
  // List actions (edit / pin / unpin / delete) hit
  // /api/admin/announcements/[id] (PATCH/DELETE). After any successful
  // mutation the panel refetches the full list via
  // GET /api/admin/announcements — single source of truth, no
  // optimistic state-syncing for v1.

  import { onMount } from 'svelte';
  import { showToast, showError, confirmAction } from '../../utils/toast';

  let { initialItems = [] } = $props<{ initialItems?: any[] }>();

  // ─── State ─────────────────────────────────────────────────────────
  let items = $state<any[]>(initialItems as any[]);

  // Composer
  let composeTitle = $state('');
  let composeBody = $state('');
  let composeTags = $state(''); // comma-separated input
  let composeError = $state<string | null>(null);
  let creating = $state(false);

  // Inline edit state — at most one row in edit mode at a time
  let editingId = $state<string | null>(null);
  let editTitle = $state('');
  let editBody = $state('');
  let editTags = $state('');
  let editError = $state<string | null>(null);
  let saving = $state(false);

  // ─── Helpers ───────────────────────────────────────────────────────
  const PIN_MS = 7 * 24 * 60 * 60 * 1000;

  function parseTags(input: string): string[] {
    return input
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 5);
  }

  function pinnedDaysLeft(pinnedUntil: string | Date | null | undefined): number | null {
    if (!pinnedUntil) return null;
    const ms = new Date(pinnedUntil as any).getTime() - Date.now();
    if (ms <= 0) return 0;
    return Math.ceil(ms / (24 * 60 * 60 * 1000));
  }

  function relCreated(iso?: string | Date): string {
    if (!iso) return '';
    const d = new Date(iso as any);
    return d.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  // ─── List refresh (single source of truth post-mutation) ───────────
  async function refetch() {
    try {
      const res = await fetch('/api/admin/announcements');
      if (!res.ok) throw new Error('refetch failed');
      const json = await res.json();
      items = (json.items ?? []) as any[];
    } catch (err) {
      console.error('refetch failed', err);
      // Don't toast — local cache stays as-is; user can reload manually.
    }
  }

  // ─── Composer submit ───────────────────────────────────────────────
  async function submitCompose() {
    if (creating) return;
    composeError = null;
    if (composeTitle.trim().length < 5) {
      composeError = 'Titel mind. 5 Zeichen.';
      return;
    }
    if (composeBody.trim().length < 10) {
      composeError = 'Inhalt mind. 10 Zeichen.';
      return;
    }
    creating = true;
    try {
      const res = await fetch('/api/admin/announcements/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: composeTitle.trim(),
          body: composeBody.trim(),
          tags: parseTags(composeTags),
          images: []
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Veröffentlichen fehlgeschlagen');
      }
      composeTitle = '';
      composeBody = '';
      composeTags = '';
      showToast('Veröffentlicht — angeheftet für 7 Tage', { type: 'success' });
      await refetch();
    } catch (err) {
      composeError = err instanceof Error ? err.message : 'Veröffentlichen fehlgeschlagen';
    } finally {
      creating = false;
    }
  }

  // ─── Edit / pin / unpin / delete actions ───────────────────────────
  function enterEdit(item: any) {
    editingId = String(item._id);
    editTitle = item.title ?? '';
    editBody = item.body ?? '';
    editTags = (item.tags ?? []).join(', ');
    editError = null;
  }

  function cancelEdit() {
    editingId = null;
    editError = null;
  }

  async function saveEdit(id: string) {
    if (saving) return;
    editError = null;
    if (editTitle.trim().length < 5) {
      editError = 'Titel mind. 5 Zeichen.';
      return;
    }
    if (editBody.trim().length < 10) {
      editError = 'Inhalt mind. 10 Zeichen.';
      return;
    }
    saving = true;
    try {
      const res = await fetch(`/api/admin/announcements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: editTitle.trim(),
          body: editBody.trim(),
          tags: parseTags(editTags)
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Speichern fehlgeschlagen');
      }
      editingId = null;
      showToast('Aktualisiert', { type: 'success' });
      await refetch();
    } catch (err) {
      editError = err instanceof Error ? err.message : 'Speichern fehlgeschlagen';
    } finally {
      saving = false;
    }
  }

  async function pin(id: string) {
    try {
      const pinnedUntil = new Date(Date.now() + PIN_MS).toISOString();
      const res = await fetch(`/api/admin/announcements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ pinnedUntil })
      });
      if (!res.ok) throw new Error('Anheften fehlgeschlagen');
      showToast('Angeheftet — 7 Tage', { type: 'success' });
      await refetch();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Anheften fehlgeschlagen');
    }
  }

  async function unpin(id: string) {
    try {
      const res = await fetch(`/api/admin/announcements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ pinnedUntil: null })
      });
      if (!res.ok) throw new Error('Lösen fehlgeschlagen');
      showToast('Gelöst', { type: 'success' });
      await refetch();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Lösen fehlgeschlagen');
    }
  }

  async function remove(id: string, title: string) {
    const ok = await confirmAction(
      `Diese offizielle Ankündigung wirklich löschen?\n\n„${title}"`,
      { title: 'Löschen bestätigen', confirmLabel: 'Löschen', variant: 'danger' }
    );
    if (!ok) return;
    try {
      const res = await fetch(`/api/admin/announcements/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Löschen fehlgeschlagen');
      showToast('Gelöscht', { type: 'success' });
      await refetch();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Löschen fehlgeschlagen');
    }
  }
</script>

<!-- ── Composer ─────────────────────────────────────────────────── -->
<section
  class="bg-white border border-gray-200 rounded-lg p-6 mb-8 shadow-sm"
>
  <h2 class="text-lg font-semibold text-gray-800 mb-4">
    Compose official announcement
  </h2>

  <label class="block mb-3">
    <span class="block text-sm font-medium text-gray-700 mb-1">Title</span>
    <input
      type="text"
      bind:value={composeTitle}
      maxlength="200"
      placeholder="z. B. Wartung am Sonntag · 12. Mai"
      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#814256]/30 focus:border-[#814256]"
    />
  </label>

  <label class="block mb-3">
    <span class="block text-sm font-medium text-gray-700 mb-1">Body</span>
    <textarea
      bind:value={composeBody}
      maxlength="5000"
      rows="5"
      placeholder="Inhalt der Ankündigung — was sollten Nachbar:innen wissen?"
      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#814256]/30 focus:border-[#814256] resize-y"
    ></textarea>
  </label>

  <label class="block mb-4">
    <span class="block text-sm font-medium text-gray-700 mb-1">
      Tags (comma-separated, max 5)
    </span>
    <input
      type="text"
      bind:value={composeTags}
      placeholder="willkommen, wartung"
      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#814256]/30 focus:border-[#814256]"
    />
  </label>

  {#if composeError}
    <p class="text-sm text-red-600 mb-3">{composeError}</p>
  {/if}

  <button
    type="button"
    onclick={submitCompose}
    disabled={creating}
    class="px-4 py-2 bg-[#814256] text-white font-semibold rounded-md hover:bg-[#6a3646] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
  >
    {creating ? 'Veröffentliche…' : 'Publish & pin for 7 days'}
  </button>
</section>

<!-- ── List ─────────────────────────────────────────────────────── -->
<section>
  <h2 class="text-lg font-semibold text-gray-800 mb-4">
    All officials ({items.length})
  </h2>

  {#if items.length === 0}
    <p class="text-gray-500 italic">No official announcements yet.</p>
  {:else}
    <ul class="space-y-3">
      {#each items as item (item._id)}
        {@const id = String(item._id)}
        {@const days = pinnedDaysLeft(item.pinnedUntil)}
        {@const isPinned = days !== null && days > 0}
        {@const isEditing = editingId === id}

        <li
          class={`bg-white border rounded-lg p-4 shadow-sm ${
            isPinned ? 'border-[#814256]/40' : 'border-gray-200'
          }`}
        >
          {#if isEditing}
            <div class="space-y-3">
              <input
                type="text"
                bind:value={editTitle}
                maxlength="200"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#814256]/30 focus:border-[#814256] font-semibold"
              />
              <textarea
                bind:value={editBody}
                maxlength="5000"
                rows="4"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#814256]/30 focus:border-[#814256] resize-y"
              ></textarea>
              <input
                type="text"
                bind:value={editTags}
                placeholder="tags, comma-separated"
                class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#814256]/30 focus:border-[#814256]"
              />
              {#if editError}
                <p class="text-sm text-red-600">{editError}</p>
              {/if}
              <div class="flex gap-2">
                <button
                  type="button"
                  onclick={() => saveEdit(id)}
                  disabled={saving}
                  class="px-3 py-1.5 bg-[#814256] text-white text-sm font-medium rounded-md hover:bg-[#6a3646] disabled:opacity-60"
                >
                  {saving ? '…' : 'Save'}
                </button>
                <button
                  type="button"
                  onclick={cancelEdit}
                  disabled={saving}
                  class="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          {:else}
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 flex-wrap mb-1.5">
                  {#if isPinned}
                    <span
                      class="inline-flex items-center gap-1 px-2 py-0.5 bg-[#814256]/10 text-[#814256] text-xs font-medium rounded"
                    >
                      📌 angeheftet · läuft in {days} {days === 1 ? 'Tag' : 'Tagen'}
                    </span>
                  {:else}
                    <span
                      class="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-medium rounded"
                    >
                      abgelaufen
                    </span>
                  {/if}
                  <span class="text-xs text-gray-500">{relCreated(item.createdAt)}</span>
                </div>
                <h3 class="font-semibold text-gray-800 truncate">{item.title}</h3>
                <p class="text-sm text-gray-600 mt-1 line-clamp-2">{item.body}</p>
              </div>
            </div>
            <div class="flex flex-wrap gap-2 mt-3 text-sm">
              <button
                type="button"
                onclick={() => enterEdit(item)}
                class="px-3 py-1 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
              >
                Bearbeiten
              </button>
              {#if isPinned}
                <button
                  type="button"
                  onclick={() => unpin(id)}
                  class="px-3 py-1 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                >
                  Lösen
                </button>
              {:else}
                <button
                  type="button"
                  onclick={() => pin(id)}
                  class="px-3 py-1 bg-white border border-[#814256]/40 text-[#814256] rounded hover:bg-[#814256]/5"
                >
                  Anheften
                </button>
              {/if}
              <button
                type="button"
                onclick={() => remove(id, item.title)}
                class="px-3 py-1 bg-white border border-red-300 text-red-700 rounded hover:bg-red-50"
              >
                Löschen
              </button>
            </div>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</section>
