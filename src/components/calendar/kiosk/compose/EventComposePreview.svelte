<script lang="ts">
  // Right-rail preview sidebar for the event compose route. Holds the
  // mini event card, "wird erscheinen bei" list, and the submit row
  // (Discard + Publish CTAs) plus the AI moderation footnote.
  // Per `kiosk-calendar-flows.jsx:407–460`.

  import EventComposeMiniPreview from './EventComposeMiniPreview.svelte';
  import KioskBtn from '../../../forum/kiosk/KioskBtn.svelte';
  import { t } from '../../../../lib/kiosk-i18n';
  import type { EventCategory } from '../../../../types';

  type Values = {
    title: string;
    body: string;
    category: EventCategory;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    allDay: boolean;
    location: string;
  };

  let {
    values,
    submitting = false,
    onPublish,
    onDiscard
  } = $props<{
    values: Values;
    submitting?: boolean;
    onPublish: () => void;
    onDiscard: () => void;
  }>();
</script>

<aside
  class="hidden lg:flex bg-paper-soft border-l border-dashed border-rule px-5 py-7 flex-col h-full lg:-mr-10 lg:pr-8"
>
  <EventComposeMiniPreview {values} />

  <!-- "Wird erscheinen bei" -->
  <div class="font-dmmono text-[10px] uppercase tracking-[0.1em] text-ink-mute mb-2">
    ◆ {$t['cal.compose.preview.willAppear']}
  </div>
  <ul
    class="font-instrument text-[13px] leading-[1.7] text-ink pl-4 mb-4 list-disc marker:text-wine"
  >
    <li>{$t['cal.compose.preview.appear.calendar']}</li>
    <li>{$t['cal.compose.preview.appear.weekly']}</li>
    <li>{$t['cal.compose.preview.appear.newsletter']}</li>
  </ul>

  <!-- Submit row -->
  <div class="mt-auto flex flex-col gap-2.5 pt-4 border-t-[1.5px] border-ink">
    <KioskBtn variant="primary" size="md" onclick={onPublish} disabled={submitting}>
      {$t['cal.compose.cta.publish']}
    </KioskBtn>
    <KioskBtn variant="ghost" size="md" onclick={onDiscard} disabled={submitting}>
      {$t['cal.compose.cta.discard']}
    </KioskBtn>
    <p class="font-dmmono text-[9.5px] text-ink-mute leading-relaxed mt-1.5">
      {$t['cal.compose.aiNote']}
    </p>
  </div>
</aside>
