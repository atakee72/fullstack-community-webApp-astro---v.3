<script lang="ts">
  // Marketplace compose orchestrator (Svelte 5).
  //
  // Two-column desktop layout: 1.6fr form + 1fr sticky preview.
  // Six form sections (§01–§06). Auto-saves draft to localStorage
  // with 500ms debounce. Supports create + edit modes.
  //
  // On publish: POST /api/listings/create (create) or PUT /api/listings/edit/{id} (edit).
  // On success: clears draft + flash-redirects to /marketplace?just_posted|just_edited.

  import { onMount } from 'svelte';
  import { t } from '../../../../lib/kiosk-i18n';
  import { showToast, showSuccess, showError } from '../../../../utils/toast';
  import type { Listing, ListingType, ListingDelivery, ListingCondition } from '../../../../types/listing';

  import KindPicker from './KindPicker.svelte';
  import ImageSlots from './ImageSlots.svelte';
  import DeliveryRadios from './DeliveryRadios.svelte';
  import OptionalDetails from './OptionalDetails.svelte';
  import ComposePreview from './ComposePreview.svelte';
  import MarketComposeStickyPublish from './MarketComposeStickyPublish.svelte';
  import CategoryChip from '../primitives/CategoryChip.svelte';

  type RailKind = 'verkaufen' | 'tausch' | 'verschenken';

  const RAIL_TO_API: Record<RailKind, ListingType> = {
    verkaufen: 'sell',
    tausch: 'exchange',
    verschenken: 'gift',
  };

  // ── Props ────────────────────────────────────────────────────────────
  let { mode, initialListing, currentUserId }: {
    mode: 'create' | 'edit';
    initialListing?: Listing;
    currentUserId: string;
  } = $props();

  // ── Category definitions ─────────────────────────────────────────────
  const CATEGORIES = [
    'moebel', 'kleidung', 'medien', 'werkzeug',
    'pflanze', 'elektronik', 'fahrrad', 'kind', 'sonstiges',
  ];

  // ── API kind → rail kind ─────────────────────────────────────────────
  const API_TO_RAIL: Record<ListingType, RailKind> = {
    sell: 'verkaufen',
    exchange: 'tausch',
    gift: 'verschenken',
  };

  // ── Form state ───────────────────────────────────────────────────────
  let kindRail = $state<RailKind | null>(
    initialListing?.listingType ? API_TO_RAIL[initialListing.listingType] : null
  );
  let category = $state<string | null>(initialListing?.category ?? null);
  let title = $state(initialListing?.title ?? '');
  let descriptionPlainText = $state(
    typeof initialListing?.descriptionPlainText === 'string'
      ? initialListing.descriptionPlainText
      : typeof initialListing?.description === 'string'
        ? initialListing.description
        : ''
  );
  let price = $state<number | null>(
    initialListing?.price != null && initialListing.price > 0 ? initialListing.price : null
  );
  let originalPrice = $state<number | null>(initialListing?.originalPrice ?? null);
  let delivery = $state<ListingDelivery | null>(initialListing?.delivery ?? null);
  let condition = $state<ListingCondition | null>(initialListing?.condition ?? null);
  let specs = $state<{
    masse?: string;
    material?: string;
    baujahr?: string;
    farbe?: string;
    gewicht?: string;
  } | null>(initialListing?.specs ?? null);
  let images = $state<string[]>(initialListing?.images ?? []);

  // ── UI state ─────────────────────────────────────────────────────────
  let publishing = $state(false);
  let savingDraft = $state(false);

  // ── Server-side draft support ─────────────────────────────────────────
  // When a draft listing is loaded into create mode (via
  // /marketplace/create?draft=<id> → passed as initialListing), track its id
  // so "Als Entwurf speichern" updates the same row and publish routes to the
  // draft-publish endpoint instead of creating a fresh listing.
  let draftId = $state<string | null>(
    initialListing?.status === 'draft' && initialListing._id
      ? String(initialListing._id)
      : null,
  );

  // ── Draft storage key ─────────────────────────────────────────────────
  const DRAFT_KEY = `marketplace-compose-draft-${mode}`;

  // ── Helpers ──────────────────────────────────────────────────────────
  function hasAnySpec(s: typeof specs): boolean {
    if (!s) return false;
    return Object.values(s).some((v) => v && v.trim() !== '');
  }

  // ── Required-field gate ───────────────────────────────────────────────
  const canPublish = $derived(
    !!kindRail &&
    !!category &&
    title.trim().length >= 5 &&
    descriptionPlainText.trim().length >= 20 &&
    !!delivery &&
    images.length >= 1 &&
    (kindRail === 'verkaufen' ? (price !== null && price >= 0.01) : true)
  );

  // ── Edit-mode non-editable guard ──────────────────────────────────────
  // Mirrors the page gate at src/pages/marketplace/edit/[id].astro and the
  // API gate at /api/listings/edit/[id].ts (canMutateListing with
  // allowOnRejected + allowOnWarningLabel). Rejected + warning-labeled
  // listings ARE editable — the server re-runs moderation + writes a
  // pre-edit audit snapshot before clearing the warning/rejection on a
  // clean re-mod. Only block what the API actually rejects:
  //   - pending: mid-moderation, server flow in flight
  //   - reserved/sold: trade state, use the status endpoint to leave first
  const isEditBlocked = $derived(
    mode === 'edit' &&
    initialListing != null &&
    (
      initialListing.moderationStatus === 'pending' ||
      initialListing.status === 'reserved' ||
      initialListing.status === 'sold'
    )
  );

  // ── Virtual listing for ComposePreview ───────────────────────────────
  const formState = $derived({
    kind: kindRail,
    category,
    title,
    descriptionPlainText,
    price,
    originalPrice,
    delivery,
    images,
  });

  // ── Auto-save draft (500ms debounce) ─────────────────────────────────
  // Skip auto-save in edit mode (edit hydrates from initialListing)
  let draftTimer: ReturnType<typeof setTimeout> | null = null;

  $effect(() => {
    // Skip localStorage autosave in edit mode AND when resuming a server-side
    // draft (initialListing present). Otherwise the resumed draft's content
    // would overwrite the `marketplace-compose-draft-create` key and leak into
    // the next blank create. Server drafts persist explicitly via the button.
    if (mode === 'edit' || initialListing) return;
    // Touch all reactive state to subscribe
    const snap = {
      kindRail,
      category,
      title,
      descriptionPlainText,
      price,
      originalPrice,
      delivery,
      condition,
      specs,
      images,
    };
    if (draftTimer) clearTimeout(draftTimer);
    draftTimer = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(snap));
      } catch {
        // Storage quota — ignore
      }
    }, 500);
  });

  // ── Mount: restore draft from localStorage (create mode only) ─────────
  onMount(() => {
    if (mode !== 'create' || initialListing) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.kindRail) kindRail = saved.kindRail;
      if (saved.category) category = saved.category;
      if (saved.title) title = saved.title;
      if (saved.descriptionPlainText) descriptionPlainText = saved.descriptionPlainText;
      if (saved.price != null) price = saved.price;
      if (saved.originalPrice != null) originalPrice = saved.originalPrice;
      if (saved.delivery) delivery = saved.delivery;
      if (saved.condition) condition = saved.condition;
      if (saved.specs) specs = saved.specs;
      if (Array.isArray(saved.images)) images = saved.images;
    } catch {
      // Corrupted draft — ignore
    }
  });

  // ── Publish ───────────────────────────────────────────────────────────
  // Build the listing payload from current form state. Used by both publish
  // and draft-save (draft accepts a partial — fields default to undefined).
  function buildPayload() {
    return {
      title: title.trim(),
      description: descriptionPlainText.trim(),
      descriptionPlainText: descriptionPlainText.trim(),
      listingType: kindRail ? RAIL_TO_API[kindRail] : undefined,
      category: category || undefined,
      delivery: delivery || undefined,
      condition: condition || undefined,
      specs: hasAnySpec(specs) ? specs : undefined,
      price: kindRail === 'verkaufen' ? price ?? undefined : undefined,
      originalPrice: kindRail === 'verkaufen' ? originalPrice ?? undefined : undefined,
      images,
    };
  }

  // ── Save as draft (create mode only) ──────────────────────────────────
  // POSTs to /api/listings/draft (no moderation, no daily limit). Creates a
  // status:'draft' row, or updates the existing one when draftId is set.
  async function handleSaveDraft() {
    if (savingDraft || publishing) return;
    if (title.trim().length === 0) {
      showError($t['market.compose.draft.needTitle']);
      return;
    }
    savingDraft = true;
    try {
      const res = await fetch('/api/listings/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId: draftId || undefined, ...buildPayload() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || data.message || 'unknown_error');
      }
      const data = await res.json();
      if (data.draftId) draftId = String(data.draftId);
      // Persisted server-side — drop the localStorage autosave copy.
      try { localStorage.removeItem(DRAFT_KEY); } catch {}
      showSuccess($t['market.compose.draft.saved']);
    } catch (e: any) {
      showError(e.message || $t['market.compose.draft.error']);
    } finally {
      savingDraft = false;
    }
  }

  async function handlePublish() {
    if (!canPublish || publishing || isEditBlocked) return;
    publishing = true;

    const payload = buildPayload();

    try {
      let res: Response;
      if (mode === 'edit') {
        res = await fetch(`/api/listings/edit/${initialListing!._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else if (draftId) {
        // Resuming a server-side draft: persist the latest edits to the draft
        // row first, then publish it (publish reads from the DB, not the body).
        await fetch('/api/listings/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ draftId, ...payload }),
        });
        res = await fetch(`/api/listings/draft/${draftId}/publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
      } else {
        res = await fetch('/api/listings/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      // Incomplete draft (publish endpoint validates required fields): keep the
      // user on the form with a missing-field hint instead of a generic error.
      if (res.status === 400) {
        const data = await res.json().catch(() => ({}));
        const missing = Array.isArray(data.missingFields) ? data.missingFields.join(', ') : '';
        publishing = false;
        showError(
          missing
            ? `${$t['market.compose.draft.incomplete']} ${missing}`
            : data.message || data.error || 'unvollständig',
        );
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || data.message || 'unknown_error');
      }

      const data = await res.json();

      // Clear draft
      try { localStorage.removeItem(DRAFT_KEY); } catch {}

      // Flash redirect
      const flashStatus =
        data.moderationStatus === 'pending'
          ? (mode === 'create' ? 'just_posted=pending' : 'just_edited=pending')
          : (mode === 'create' ? 'just_posted=1' : 'just_edited=1');

      window.location.href = `/marketplace?${flashStatus}`;
    } catch (e: any) {
      publishing = false;
      showError(e.message || 'Fehler beim Veröffentlichen');
    }
  }

  // ── Cancel ────────────────────────────────────────────────────────────
  function handleCancel() {
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
    if (mode === 'edit' && initialListing?._id) {
      window.location.href = `/marketplace/${initialListing._id}`;
    } else {
      window.location.href = '/marketplace';
    }
  }

  // ── Section completion state ──────────────────────────────────────────
  const sectionDone = $derived({
    s01: !!kindRail,
    s02: !!category,
    s03: title.trim().length >= 5 && descriptionPlainText.trim().length >= 20,
    s04: images.length >= 1,
    s05: kindRail === 'verkaufen'
      ? (price !== null && price >= 0.01 && !!delivery)
      : !!delivery,
    s06: true, // optional — always "done"
  });

  // ── Cat color for ImageSlots ──────────────────────────────────────────
  const catColorMap: Record<string, string> = {
    moebel: 'var(--k-wine)',
    kleidung: 'var(--k-teal)',
    medien: 'var(--k-moss)',
    werkzeug: 'var(--k-ochre)',
    pflanze: 'var(--k-moss)',
    elektronik: 'var(--k-teal)',
    fahrrad: 'var(--k-wine)',
    kind: 'var(--k-ochre)',
    sonstiges: 'var(--k-ink-mute)',
  };
  const catColor = $derived(category ? (catColorMap[category] ?? 'var(--k-wine)') : 'var(--k-wine)');
</script>

<!-- ─── Edit-blocked banner ─────────────────────────────────────────── -->
{#if isEditBlocked}
  <div
    style="
      margin: 32px auto;
      max-width: 680px;
      padding: 20px 24px;
      background: var(--k-paper-warm);
      border: 2px solid var(--k-danger, #c0392b);
      border-radius: var(--k-radius-md);
      font-family: var(--k-font-mono);
      font-size: 13px;
      line-height: 1.5;
      color: var(--k-ink);
    "
  >
    <div style="font-weight: 700; margin-bottom: 6px;">Bearbeiten gesperrt</div>
    <div style="color: var(--k-ink-soft);">
      Diese Anzeige wird gerade geprüft oder ist gerade reserviert/verkauft.
      Bearbeiten ist erst wieder möglich, wenn die Prüfung abgeschlossen ist
      oder du den Status zurücksetzt.
    </div>
  </div>

<!-- ─── Main compose layout ────────────────────────────────────────── -->
{:else}
  <div
    style="
      display: grid;
      grid-template-columns: 1fr;
      gap: 24px;
      padding: 20px 20px 96px;
      max-width: 1200px;
      margin: 0 auto;
    "
    class="lg:grid-cols-[1.6fr_1fr] lg:items-start lg:pb-8"
  >
    <!-- ── Form column ────────────────────────────────────────────────── -->
    <div style="display: flex; flex-direction: column; gap: 24px;">

      <!-- Page header -->
      <div>
        <div
          style="
            font-family: var(--k-font-mono);
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.15em;
            text-transform: uppercase;
            color: var(--k-teal);
            margin-bottom: 4px;
          "
        >
          {mode === 'create' ? 'NEUE ANZEIGE' : 'ANZEIGE BEARBEITEN'}
        </div>
        <h1
          style="
            font-family: var(--k-font-display);
            font-size: clamp(22px, 4vw, 32px);
            font-weight: 800;
            color: var(--k-ink);
            margin: 0;
            line-height: 1.15;
          "
        >
          {mode === 'create' ? 'Was möchtest du anbieten?' : 'Anzeige bearbeiten'}
        </h1>
      </div>

      <!-- §01 Kind -->
      <div
        style="
          background: var(--k-paper-warm);
          border: var(--k-border-ink);
          border-radius: var(--k-radius-lg);
          padding: 20px;
        "
      >
        <!-- Section header -->
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px;">
          <span
            style="
              font-family: var(--k-font-mono);
              font-size: 11px;
              font-weight: 700;
              background: var(--k-ink);
              color: var(--k-paper);
              padding: 2px 8px;
              border-radius: var(--k-radius-sm);
              letter-spacing: 0.05em;
            "
          >§01</span>
          <span
            style="
              font-family: var(--k-font-display);
              font-size: 14px;
              font-weight: 700;
              color: var(--k-ink);
            "
          >Art der Anzeige</span>
          {#if sectionDone.s01}
            <span style="margin-left: auto; color: var(--k-moss); font-size: 16px;">✓</span>
          {/if}
        </div>

        <KindPicker value={kindRail} onChange={(k) => { kindRail = k; }} />
      </div>

      <!-- §02 Category -->
      <div
        style="
          background: var(--k-paper-warm);
          border: var(--k-border-ink);
          border-radius: var(--k-radius-lg);
          padding: 20px;
        "
      >
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px;">
          <span
            style="
              font-family: var(--k-font-mono);
              font-size: 11px;
              font-weight: 700;
              background: var(--k-ink);
              color: var(--k-paper);
              padding: 2px 8px;
              border-radius: var(--k-radius-sm);
              letter-spacing: 0.05em;
            "
          >§02</span>
          <span
            style="
              font-family: var(--k-font-display);
              font-size: 14px;
              font-weight: 700;
              color: var(--k-ink);
            "
          >Kategorie</span>
          {#if sectionDone.s02}
            <span style="margin-left: auto; color: var(--k-moss); font-size: 16px;">✓</span>
          {/if}
        </div>

        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
          {#each CATEGORIES as cat (cat)}
            <button
              type="button"
              onclick={() => { category = cat === category ? null : cat; }}
              style="
                background: none;
                border: none;
                padding: 0;
                cursor: pointer;
                outline: {cat === category ? '2px solid var(--k-ink)' : 'none'};
                border-radius: var(--k-radius-sm);
              "
              aria-pressed={cat === category}
            >
              <CategoryChip id={cat} active={cat === category} />
            </button>
          {/each}
        </div>
      </div>

      <!-- §03 Title + Body -->
      <div
        style="
          background: var(--k-paper-warm);
          border: var(--k-border-ink);
          border-radius: var(--k-radius-lg);
          padding: 20px;
        "
      >
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px;">
          <span
            style="
              font-family: var(--k-font-mono);
              font-size: 11px;
              font-weight: 700;
              background: var(--k-ink);
              color: var(--k-paper);
              padding: 2px 8px;
              border-radius: var(--k-radius-sm);
              letter-spacing: 0.05em;
            "
          >§03</span>
          <span
            style="
              font-family: var(--k-font-display);
              font-size: 14px;
              font-weight: 700;
              color: var(--k-ink);
            "
          >Titel &amp; Beschreibung</span>
          {#if sectionDone.s03}
            <span style="margin-left: auto; color: var(--k-moss); font-size: 16px;">✓</span>
          {/if}
        </div>

        <!-- Title input -->
        <div style="margin-bottom: 12px;">
          <div
            style="
              font-family: var(--k-font-mono);
              font-size: 9px;
              color: var(--k-ink-mute);
              letter-spacing: 0.1em;
              text-transform: uppercase;
              margin-bottom: 4px;
            "
          >
            Titel <span style="color: var(--k-wine);">*</span>
          </div>
          <input
            type="text"
            bind:value={title}
            maxlength={120}
            placeholder="z. B. Vintage Thonet Stuhl, kaum benutzt"
            style="
              width: 100%;
              box-sizing: border-box;
              background: {title.trim().length >= 5 ? 'var(--k-paper-warm)' : 'var(--k-paper-soft)'};
              border: {title.trim().length >= 5 ? '1.5px solid var(--k-ink)' : '1px dashed var(--k-rule)'};
              border-radius: var(--k-radius-sm);
              padding: 9px 12px;
              font-family: var(--k-font-display);
              font-size: 14px;
              font-weight: 600;
              color: var(--k-ink);
              outline: none;
            "
          />
          <div
            style="
              font-family: var(--k-font-mono);
              font-size: 9px;
              color: var(--k-ink-mute);
              text-align: right;
              margin-top: 3px;
            "
          >{title.length}/120</div>
        </div>

        <!-- Description textarea -->
        <div>
          <div
            style="
              font-family: var(--k-font-mono);
              font-size: 9px;
              color: var(--k-ink-mute);
              letter-spacing: 0.1em;
              text-transform: uppercase;
              margin-bottom: 4px;
            "
          >
            Beschreibung <span style="color: var(--k-wine);">*</span>
          </div>
          <textarea
            bind:value={descriptionPlainText}
            maxlength={2000}
            rows={5}
            placeholder="Beschreibe den Zustand, die Maße, den Grund des Verkaufs …"
            style="
              width: 100%;
              box-sizing: border-box;
              background: {descriptionPlainText.trim().length >= 20 ? 'var(--k-paper-warm)' : 'var(--k-paper-soft)'};
              border: {descriptionPlainText.trim().length >= 20 ? '1.5px solid var(--k-ink)' : '1px dashed var(--k-rule)'};
              border-radius: var(--k-radius-sm);
              padding: 9px 12px;
              font-family: var(--k-font-display);
              font-size: 13px;
              color: var(--k-ink);
              outline: none;
              resize: vertical;
              min-height: 100px;
            "
          ></textarea>
          <div
            style="
              font-family: var(--k-font-mono);
              font-size: 9px;
              color: var(--k-ink-mute);
              text-align: right;
              margin-top: 3px;
            "
          >{descriptionPlainText.length}/2000 · mind. 20 Zeichen</div>
        </div>
      </div>

      <!-- §04 Photos -->
      <div
        style="
          background: var(--k-paper-warm);
          border: var(--k-border-ink);
          border-radius: var(--k-radius-lg);
          padding: 20px;
        "
      >
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px;">
          <span
            style="
              font-family: var(--k-font-mono);
              font-size: 11px;
              font-weight: 700;
              background: var(--k-ink);
              color: var(--k-paper);
              padding: 2px 8px;
              border-radius: var(--k-radius-sm);
              letter-spacing: 0.05em;
            "
          >§04</span>
          <span
            style="
              font-family: var(--k-font-display);
              font-size: 14px;
              font-weight: 700;
              color: var(--k-ink);
            "
          >Fotos</span>
          {#if sectionDone.s04}
            <span style="margin-left: auto; color: var(--k-moss); font-size: 16px;">✓</span>
          {/if}
        </div>

        <ImageSlots
          {images}
          {catColor}
          onChange={(urls) => { images = urls; }}
        />
      </div>

      <!-- §05 Price + Delivery -->
      <div
        style="
          background: var(--k-paper-warm);
          border: var(--k-border-ink);
          border-radius: var(--k-radius-lg);
          padding: 20px;
        "
      >
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px;">
          <span
            style="
              font-family: var(--k-font-mono);
              font-size: 11px;
              font-weight: 700;
              background: var(--k-ink);
              color: var(--k-paper);
              padding: 2px 8px;
              border-radius: var(--k-radius-sm);
              letter-spacing: 0.05em;
            "
          >§05</span>
          <span
            style="
              font-family: var(--k-font-display);
              font-size: 14px;
              font-weight: 700;
              color: var(--k-ink);
            "
          >{kindRail === 'verkaufen' ? 'Preis &amp; Übergabe' : 'Übergabe'}</span>
          {#if sectionDone.s05}
            <span style="margin-left: auto; color: var(--k-moss); font-size: 16px;">✓</span>
          {/if}
        </div>

        <!-- Price fields — only for verkaufen -->
        {#if kindRail === 'verkaufen'}
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px;">
            <!-- Price -->
            <div>
              <div
                style="
                  font-family: var(--k-font-mono);
                  font-size: 9px;
                  color: var(--k-ink-mute);
                  letter-spacing: 0.1em;
                  text-transform: uppercase;
                  margin-bottom: 4px;
                "
              >Preis (€) <span style="color: var(--k-wine);">*</span></div>
              <input
                type="number"
                min="0"
                step="0.01"
                value={price ?? ''}
                oninput={(e) => {
                  const v = parseFloat((e.currentTarget as HTMLInputElement).value);
                  price = isNaN(v) ? null : v;
                }}
                placeholder="0,00"
                style="
                  width: 100%;
                  box-sizing: border-box;
                  background: {price != null && price >= 0.01 ? 'var(--k-paper-warm)' : 'var(--k-paper-soft)'};
                  border: {price != null && price >= 0.01 ? '1.5px solid var(--k-ink)' : '1px dashed var(--k-rule)'};
                  border-radius: var(--k-radius-sm);
                  padding: 9px 12px;
                  font-family: var(--k-font-display);
                  font-size: 15px;
                  font-weight: 700;
                  color: var(--k-ink);
                  outline: none;
                "
              />
            </div>

            <!-- Original price (optional) -->
            <div>
              <div
                style="
                  font-family: var(--k-font-mono);
                  font-size: 9px;
                  color: var(--k-ink-mute);
                  letter-spacing: 0.1em;
                  text-transform: uppercase;
                  margin-bottom: 4px;
                "
              >UVP / Ehem. Preis (€)</div>
              <input
                type="number"
                min="0"
                step="0.01"
                value={originalPrice ?? ''}
                oninput={(e) => {
                  const v = parseFloat((e.currentTarget as HTMLInputElement).value);
                  originalPrice = isNaN(v) ? null : v;
                }}
                placeholder="Optional"
                style="
                  width: 100%;
                  box-sizing: border-box;
                  background: {originalPrice != null ? 'var(--k-paper-warm)' : 'var(--k-paper-soft)'};
                  border: {originalPrice != null ? '1.5px solid var(--k-ink)' : '1px dashed var(--k-rule)'};
                  border-radius: var(--k-radius-sm);
                  padding: 9px 12px;
                  font-family: var(--k-font-display);
                  font-size: 15px;
                  font-weight: 700;
                  color: var(--k-ink);
                  outline: none;
                "
              />
            </div>
          </div>
        {/if}

        <!-- Delivery -->
        <DeliveryRadios
          value={delivery}
          onChange={(v) => { delivery = v; }}
        />
      </div>

      <!-- §06 Optional Details -->
      <div
        style="
          background: var(--k-paper-warm);
          border: var(--k-border-ink);
          border-radius: var(--k-radius-lg);
          padding: 20px;
        "
      >
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px;">
          <span
            style="
              font-family: var(--k-font-mono);
              font-size: 11px;
              font-weight: 700;
              background: var(--k-ink);
              color: var(--k-paper);
              padding: 2px 8px;
              border-radius: var(--k-radius-sm);
              letter-spacing: 0.05em;
            "
          >§06</span>
          <span
            style="
              font-family: var(--k-font-display);
              font-size: 14px;
              font-weight: 700;
              color: var(--k-ink);
            "
          >Optionale Details</span>
          <span style="margin-left: auto; color: var(--k-moss); font-size: 16px;">✓</span>
        </div>

        <OptionalDetails
          {condition}
          {specs}
          onConditionChange={(c) => { condition = c as ListingCondition | null; }}
          onSpecsChange={(s) => { specs = s; }}
        />
      </div>

      <!-- ── Action buttons (desktop) ─────────────────────────────────── -->
      <div
        style="
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          padding-top: 8px;
        "
        class="hidden lg:flex"
      >
        <!-- Cancel -->
        <button
          type="button"
          onclick={handleCancel}
          style="
            padding: 10px 24px;
            background: transparent;
            border: 1.5px solid var(--k-rule);
            border-radius: var(--k-radius-pill, 999px);
            font-family: var(--k-font-display);
            font-size: 14px;
            font-weight: 600;
            color: var(--k-ink-soft);
            cursor: pointer;
          "
        >
          Abbrechen
        </button>

        <!-- Save as draft (create mode only — incl. resuming a server draft) -->
        {#if mode === 'create'}
          <button
            type="button"
            onclick={handleSaveDraft}
            disabled={savingDraft || publishing}
            style="
              padding: 10px 22px;
              background: transparent;
              border: 1.5px solid var(--k-ink);
              border-radius: var(--k-radius-pill, 999px);
              font-family: var(--k-font-display);
              font-size: 14px;
              font-weight: 600;
              color: var(--k-ink);
              cursor: {savingDraft || publishing ? 'not-allowed' : 'pointer'};
              opacity: {savingDraft || publishing ? 0.5 : 1};
            "
            aria-busy={savingDraft}
          >
            {savingDraft ? '◐ …' : $t['market.compose.cta.draft']}
          </button>
        {/if}

        <!-- Publish -->
        <button
          type="button"
          onclick={handlePublish}
          disabled={!canPublish || publishing}
          style="
            padding: 10px 28px;
            background: {canPublish && !publishing ? 'var(--k-wine)' : 'var(--k-rule)'};
            border: {canPublish && !publishing ? '2px solid var(--k-ink)' : '2px solid transparent'};
            border-radius: var(--k-radius-pill, 999px);
            font-family: var(--k-font-display);
            font-size: 14px;
            font-weight: 700;
            color: {canPublish && !publishing ? 'var(--k-paper)' : 'var(--k-ink-mute)'};
            cursor: {canPublish && !publishing ? 'pointer' : 'not-allowed'};
            box-shadow: {canPublish && !publishing ? '2px 2px 0 var(--k-ink)' : 'none'};
            transition: background 0.15s;
          "
          aria-busy={publishing}
        >
          {#if publishing}
            ◐ Wird veröffentlicht…
          {:else}
            {mode === 'create' ? 'Veröffentlichen →' : 'Änderungen speichern →'}
          {/if}
        </button>
      </div>
    </div>

    <!-- ── Preview column (sticky on desktop) ────────────────────────── -->
    <div
      style="position: sticky; top: 80px; align-self: start;"
      class="hidden lg:block"
    >
      <ComposePreview
        {formState}
        currentUserId={currentUserId}
        {publishing}
      />
    </div>
  </div>

  <!-- ── Mobile sticky publish bar ─────────────────────────────────── -->
  <MarketComposeStickyPublish
    disabled={!canPublish || publishing}
    {publishing}
    {savingDraft}
    onPublish={handlePublish}
    onSaveDraft={mode === 'create' ? handleSaveDraft : undefined}
    draftLabel={$t['market.compose.cta.draft']}
    onPreview={() => {
      // v1: scroll to preview section (desktop shows it inline; mobile hint)
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }}
  />
{/if}
