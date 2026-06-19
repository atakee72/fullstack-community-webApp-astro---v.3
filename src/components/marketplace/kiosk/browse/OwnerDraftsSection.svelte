<script lang="ts">
  // Owner-only "Entwürfe" (drafts) section, shown above the grid in the kiosk
  // "Meine Anzeigen" (?view=mine) view. Replaces the legacy dashboard's drafts
  // list. Dumb component: the parent owns the API calls + refetch.
  import { t, locale } from '../../../../lib/kiosk-i18n';
  import { formatRelativeTime } from '../../../../lib/marketplaceFormat';
  import { optimizeCloudinary } from '../../../../utils/cloudinary';
  import type { Listing } from '../../../../types/listing';

  let {
    drafts,
    onEdit,
    onPublish,
    onDelete,
  }: {
    drafts: Listing[];
    onEdit: (id: string) => void;
    onPublish: (id: string) => void;
    onDelete: (id: string) => void;
  } = $props();
</script>

<section class="px-4 md:px-9 lg:px-10" style="padding-top: 16px;">
  <!-- Heading -->
  <div style="display: flex; align-items: baseline; gap: 10px; margin-bottom: 10px;">
    <span
      class="font-dmmono uppercase"
      style="font-size: 11px; font-weight: 700; letter-spacing: 0.12em; color: var(--k-ink);"
    >{$t['market.owner.drafts.heading']}</span>
    <span
      class="font-dmmono"
      style="font-size: 10px; color: var(--k-ink-mute);"
    >{drafts.length}</span>
    <div style="flex: 1; height: 1px; background: var(--k-rule);"></div>
  </div>

  <!-- Draft rows -->
  <div style="display: flex; flex-direction: column; gap: 8px;">
    {#each drafts as draft (draft._id)}
      {@const id = String(draft._id)}
      {@const thumb = draft.images?.[0]}
      <div
        style="
          display: flex; align-items: center; gap: 12px;
          padding: 10px 12px;
          background: var(--k-paper-soft, var(--k-paper));
          border: 1px dashed var(--k-rule);
          border-radius: var(--k-radius-md);
        "
      >
        <!-- Thumb -->
        <div
          style="
            flex: 0 0 auto; width: 52px; height: 52px;
            border-radius: 6px; overflow: hidden;
            border: 1px solid var(--k-rule);
            background: {thumb
              ? `center/cover url('${optimizeCloudinary(thumb)}')`
              : `repeating-linear-gradient(45deg, color-mix(in srgb, var(--k-ink-mute) 18%, transparent) 0 5px, var(--k-paper-warm) 5px 10px)`};
          "
        ></div>

        <!-- Title + meta -->
        <div style="flex: 1; min-width: 0;">
          <div
            style="
              font-family: var(--k-font-display); font-weight: 700;
              font-size: 15px; color: var(--k-ink);
              white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            "
          >{draft.title?.trim() || $t['market.owner.draft.untitled']}</div>
          <div
            style="font-family: var(--k-font-mono); font-size: 10px; color: var(--k-ink-mute);"
          >
            {$t['market.owner.draft.lastEdited']} {formatRelativeTime(draft.updatedAt ?? draft.createdAt, $locale)}
          </div>
        </div>

        <!-- Actions -->
        <div style="flex: 0 0 auto; display: flex; align-items: center; gap: 6px;">
          <button
            type="button"
            onclick={() => onEdit(id)}
            class="font-dmmono uppercase"
            style="
              padding: 5px 11px; font-size: 10px; font-weight: 700; letter-spacing: 0.06em;
              background: transparent; color: var(--k-ink);
              border: 1.5px solid var(--k-ink); border-radius: var(--k-radius-pill, 999px);
              cursor: pointer;
            "
          >{$t['market.owner.draft.edit']}</button>

          <button
            type="button"
            onclick={() => onPublish(id)}
            class="font-dmmono uppercase"
            style="
              padding: 5px 11px; font-size: 10px; font-weight: 700; letter-spacing: 0.06em;
              background: var(--k-wine); color: var(--k-paper);
              border: 1.5px solid var(--k-ink); border-radius: var(--k-radius-pill, 999px);
              box-shadow: 1.5px 1.5px 0 var(--k-ink); cursor: pointer;
            "
          >{$t['market.owner.draft.publish']}</button>

          <button
            type="button"
            onclick={() => onDelete(id)}
            aria-label={$t['market.owner.draft.delete']}
            class="font-dmmono uppercase"
            style="
              padding: 5px 9px; font-size: 10px; font-weight: 700; letter-spacing: 0.06em;
              background: transparent; color: var(--k-danger, #c0392b);
              border: 1.5px dashed var(--k-rule); border-radius: var(--k-radius-pill, 999px);
              cursor: pointer;
            "
          >✕</button>
        </div>
      </div>
    {/each}
  </div>
</section>
