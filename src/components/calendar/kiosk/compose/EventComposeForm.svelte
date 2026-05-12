<script lang="ts" module>
  export type EventComposeValues = {
    title: string;
    body: string;
    category: import('../../../../types').EventCategory;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    allDay: boolean;
    location: string;
    capacity: number | null;
    visibility: 'public' | 'private';
    tags: string[];
  };
</script>

<script lang="ts">
  // Event compose form — 6 numbered field groups per CD's
  // CreateEventArtboard (`kiosk-calendar-flows.jsx:281–404`).
  //
  // Each field group has a step number (01–06) + dashed-bottom-rule
  // header, mirroring forum's compose form labelling. The form is
  // controlled — values bubble up via `onChange` so the page can
  // observe them for the preview sidebar and submit handler.

  import { onMount } from 'svelte';
  import { CATEGORIES, CATEGORY_ORDER } from '../../../../lib/calendar/categories';
  import { scrollFade } from '../../../../lib/scrollFade';
  import { t } from '../../../../lib/kiosk-i18n';
  import type { EventCategory } from '../../../../types';

  let {
    initialValues,
    onChange,
    showBreadcrumb = false,
    editing = false
  } = $props<{
    initialValues?: Partial<EventComposeValues>;
    onChange: (v: EventComposeValues) => void;
    showBreadcrumb?: boolean;
    editing?: boolean;
  }>();

  // ─── State ─────────────────────────────────────────────────────────
  // Defaults computed at mount: today + 09:00–17:00 (or "next full hour"
  // if today and now is past 09:00). Mirrors the existing calendar's
  // tooltip prefill behaviour.
  function defaultStartHHMM(): string {
    const now = new Date();
    const next = now.getHours() < 9 ? 9 : Math.min(23, now.getHours() + 1);
    return next.toString().padStart(2, '0') + ':00';
  }
  function defaultEndHHMM(): string {
    const now = new Date();
    const next = now.getHours() < 9 ? 17 : Math.min(23, now.getHours() + 4);
    return next.toString().padStart(2, '0') + ':00';
  }
  function todayISO(): string {
    return new Date().toISOString().slice(0, 10);
  }

  let title = $state(initialValues?.title ?? '');
  let body = $state(initialValues?.body ?? '');
  let category = $state<EventCategory>(initialValues?.category ?? 'kiez');
  let startDate = $state(initialValues?.startDate ?? todayISO());
  let startTime = $state(initialValues?.startTime ?? defaultStartHHMM());
  let endDate = $state(initialValues?.endDate ?? initialValues?.startDate ?? todayISO());
  let endTime = $state(initialValues?.endTime ?? defaultEndHHMM());
  let allDay = $state(initialValues?.allDay ?? false);
  let location = $state(initialValues?.location ?? '');
  let capacity = $state<number | null>(initialValues?.capacity ?? null);
  let visibility = $state<'public' | 'private'>(initialValues?.visibility ?? 'public');
  let tagsInput = $state((initialValues?.tags ?? []).join(' '));

  // Multi-day mode — auto-on when the URL prefill brings a different
  // start/end (drag-select pin path). User can toggle via the
  // 'mehrtägig' checkbox in the When section.
  let multiDay = $state(
    !!(initialValues?.startDate &&
      initialValues?.endDate &&
      initialValues.startDate !== initialValues.endDate)
  );

  // Single source of truth for date sync. Reactive on multiDay,
  // startDate, endDate — covers single-day mirror, the multi-day
  // backwards-clamp, and the toggle transition.
  $effect(() => {
    if (!multiDay) {
      if (endDate !== startDate) endDate = startDate;
    } else if (endDate && endDate < startDate) {
      endDate = startDate;
    }
  });

  // Bubble up on every change.
  $effect(() => {
    onChange({
      title,
      body,
      category,
      startDate,
      startTime,
      endDate,
      endTime,
      allDay,
      location,
      capacity,
      visibility,
      tags: tagsInput.trim().split(/\s+/).filter(Boolean).slice(0, 5)
    });
  });

  // Title hint with character counter (uses {n} interpolation).
  function titleHint(n: number): string {
    return ($t['cal.compose.field.titleHint'] as string).replace('{n}', String(n));
  }
</script>

<form
  class="px-4 md:px-9 lg:px-10 py-6 overflow-auto"
  onsubmit={(e) => e.preventDefault()}
>
  {#if showBreadcrumb}
    <div
      class="flex items-center mb-3 font-dmmono text-[10.5px] uppercase tracking-[0.05em] text-ink-mute"
    >
      <a href="/calendar" class="inline-flex items-center gap-2 text-wine hover:text-ink transition-colors">
        <span>{$t['cal.compose.cta.back']}</span>
      </a>
      <span aria-hidden="true" class="mx-2">·</span>
      <span class="underline decoration-dashed underline-offset-[3px]">
        {editing ? $t['cal.compose.crumb.edit'] : $t['cal.compose.crumb.new']}
      </span>
    </div>

    <h1
      class="font-bricolage font-extrabold text-[40px] md:text-[48px] tracking-[-0.03em] leading-[0.95] m-0 mb-6 pb-3 border-b border-dashed border-rule"
    >
      {editing ? $t['cal.compose.title.edit.q1'] : $t['cal.compose.title.q1']}
      <span class="font-instrument italic font-normal text-teal">
        {editing ? $t['cal.compose.title.edit.q2'] : $t['cal.compose.title.q2']}
      </span>
    </h1>
  {/if}

  <!-- 01 · Category -->
  <div class="mb-6">
    <div
      class="flex items-baseline gap-2 mb-2 pb-1 border-b border-dashed border-rule"
    >
      <span class="font-dmmono text-[9.5px] tracking-[0.1em] font-bold text-wine">01</span>
      <span class="font-bricolage text-[14px] font-bold tracking-[-0.01em]">
        {$t['cal.compose.step.category']}
      </span>
      <span class="font-instrument italic text-[12px] text-ink-mute">
        — {$t['cal.compose.step.category.hint']}
      </span>
    </div>
    <div
      use:scrollFade
      class="kiosk-scroll-fade no-scrollbar flex gap-1.5 overflow-x-auto pt-0.5 pb-3 -mx-4 md:-mx-9 lg:-mx-10 px-4 md:px-9 lg:px-10"
    >
      {#each CATEGORY_ORDER as cat (cat)}
        {@const style = CATEGORIES[cat]}
        {@const on = category === cat}
        <button
          type="button"
          onclick={() => (category = cat)}
          aria-pressed={on}
          class={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bricolage font-semibold text-[13px] border-[1.5px] transition-all flex-shrink-0 ${
            on
              ? `${style.bgClass} ${style.borderClass} ${style.textOnFill} shadow-[2px_2px_0_var(--k-ink,#1b1a17)]`
              : `bg-transparent ${style.borderClass} ${style.textClass}`
          }`}
        >
          <span aria-hidden="true">{style.glyph}</span>
          <span>{$t[`cal.cat.${cat}.label` as const]}</span>
        </button>
      {/each}
    </div>
  </div>

  <!-- 02 · Title -->
  <div class="mb-6">
    <div
      class="flex items-baseline gap-2 mb-2 pb-1 border-b border-dashed border-rule"
    >
      <span class="font-dmmono text-[9.5px] tracking-[0.1em] font-bold text-wine">02</span>
      <span class="font-bricolage text-[14px] font-bold tracking-[-0.01em]">
        {$t['cal.compose.step.title']}
      </span>
      <span class="font-bricolage text-[14px] font-bold text-wine" aria-hidden="true">*</span>
    </div>
    <input
      type="text"
      bind:value={title}
      maxlength="80"
      placeholder={$t['cal.compose.field.title.placeholder']}
      class="w-full appearance-none bg-paper-warm border-[1.5px] border-ink rounded-md px-3 py-2 font-bricolage text-[15px] text-ink placeholder:text-ink-mute/55 outline-none focus:border-wine"
    />
    <div class="font-dmmono text-[10.5px] text-ink-mute mt-1">
      {titleHint(title.length)}
    </div>
  </div>

  <!-- 03 · When -->
  <div class="mb-6">
    <div
      class="flex items-baseline gap-2 mb-2 pb-1 border-b border-dashed border-rule"
    >
      <span class="font-dmmono text-[9.5px] tracking-[0.1em] font-bold text-wine">03</span>
      <span class="font-bricolage text-[14px] font-bold tracking-[-0.01em]">
        {$t['cal.compose.step.when']}
      </span>
      <span class="font-bricolage text-[14px] font-bold text-wine" aria-hidden="true">*</span>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
      <label class="block">
        <span class="block font-dmmono text-[9px] uppercase tracking-[0.1em] text-ink-mute mb-0.5">
          {$t['cal.compose.field.date']}
        </span>
        <input
          type="date"
          bind:value={startDate}
          class="w-full appearance-none bg-paper border border-ink rounded-sm px-3 py-1.5 font-bricolage text-[14px]"
        />
      </label>
      <label class="block">
        <span class="block font-dmmono text-[9px] uppercase tracking-[0.1em] text-ink-mute mb-0.5">
          {$t['cal.compose.field.start']}
        </span>
        <input
          type="time"
          bind:value={startTime}
          disabled={allDay}
          class="w-full appearance-none bg-paper border border-ink rounded-sm px-3 py-1.5 font-bricolage text-[14px] disabled:opacity-50"
        />
      </label>
      <label class="block">
        <span class="block font-dmmono text-[9px] uppercase tracking-[0.1em] text-ink-mute mb-0.5">
          {$t['cal.compose.field.end']}
        </span>
        <input
          type="time"
          bind:value={endTime}
          disabled={allDay}
          class="w-full appearance-none bg-paper border border-ink rounded-sm px-3 py-1.5 font-bricolage text-[14px] disabled:opacity-50"
        />
      </label>
    </div>
    {#if multiDay}
      <label class="block mt-2 max-w-[260px]">
        <span class="block font-dmmono text-[9px] uppercase tracking-[0.1em] text-ink-mute mb-0.5">
          {$t['cal.compose.field.endDate']}
        </span>
        <input
          type="date"
          bind:value={endDate}
          min={startDate}
          class="w-full appearance-none bg-paper border border-ink rounded-sm px-3 py-1.5 font-bricolage text-[14px]"
        />
      </label>
    {/if}

    <div class="flex gap-3.5 mt-2 font-dmmono text-[11px] text-ink-mute">
      <label class="inline-flex items-center gap-1">
        <input type="checkbox" bind:checked={allDay} />
        {$t['cal.compose.field.allDay']}
      </label>
      <label class="inline-flex items-center gap-1">
        <input type="checkbox" bind:checked={multiDay} />
        {$t['cal.compose.field.multiDay']}
      </label>
    </div>
  </div>

  <!-- 04 · Where -->
  <div class="mb-6">
    <div
      class="flex items-baseline gap-2 mb-2 pb-1 border-b border-dashed border-rule"
    >
      <span class="font-dmmono text-[9.5px] tracking-[0.1em] font-bold text-wine">04</span>
      <span class="font-bricolage text-[14px] font-bold tracking-[-0.01em]">
        {$t['cal.compose.step.where']}
      </span>
    </div>
    <input
      type="text"
      bind:value={location}
      maxlength="200"
      placeholder={$t['cal.compose.field.location.placeholder']}
      class="w-full appearance-none bg-paper-warm border-[1.5px] border-ink rounded-md px-3 py-2 font-bricolage text-[14px] text-ink placeholder:text-ink-mute/55 outline-none focus:border-wine"
    />
  </div>

  <!-- 05 · Description -->
  <div class="mb-6">
    <div
      class="flex items-baseline gap-2 mb-2 pb-1 border-b border-dashed border-rule"
    >
      <span class="font-dmmono text-[9.5px] tracking-[0.1em] font-bold text-wine">05</span>
      <span class="font-bricolage text-[14px] font-bold tracking-[-0.01em]">
        {$t['cal.compose.step.description']}
      </span>
      <span class="font-bricolage text-[14px] font-bold text-wine" aria-hidden="true">*</span>
    </div>
    <textarea
      bind:value={body}
      rows="5"
      maxlength="5000"
      placeholder={$t['cal.compose.field.body.placeholder']}
      class="w-full appearance-none bg-paper-warm border-[1.5px] border-ink rounded-md px-3 py-2 font-bricolage text-[14px] leading-relaxed text-ink placeholder:text-ink-mute/55 outline-none focus:border-wine resize-y min-h-[120px]"
    ></textarea>
  </div>

  <!-- 06 · Options (Capacity) -->
  <div class="mb-6">
    <div
      class="flex items-baseline gap-2 mb-2 pb-1 border-b border-dashed border-rule"
    >
      <span class="font-dmmono text-[9.5px] tracking-[0.1em] font-bold text-wine">06</span>
      <span class="font-bricolage text-[14px] font-bold tracking-[-0.01em]">
        {$t['cal.compose.step.options']}
      </span>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-[480px]">
      <label class="block">
        <span class="block font-dmmono text-[9px] uppercase tracking-[0.1em] text-ink-mute mb-0.5">
          {$t['cal.compose.field.capacity']}
        </span>
        <input
          type="number"
          min="1"
          max="10000"
          bind:value={capacity}
          placeholder={$t['cal.compose.field.capacity.placeholder']}
          class="w-full appearance-none bg-paper border border-ink rounded-sm px-3 py-1.5 font-bricolage text-[14px]"
        />
      </label>
      <label class="block">
        <span class="block font-dmmono text-[9px] uppercase tracking-[0.1em] text-ink-mute mb-0.5">
          {$t['cal.compose.field.visibility']}
        </span>
        <select
          bind:value={visibility}
          class="w-full appearance-none bg-paper border border-ink rounded-sm px-3 py-1.5 font-bricolage text-[14px]"
        >
          <option value="public">{$t['cal.compose.field.visibility.public']}</option>
          <option value="private">{$t['cal.compose.field.visibility.private']}</option>
        </select>
      </label>
    </div>
  </div>

  <!-- Footnote — explains the wine '*' marker on required fields. -->
  <p class="mt-4 font-dmmono text-[10px] text-ink-mute">
    <span class="text-wine font-bold" aria-hidden="true">*</span> {$t['cal.compose.requiredNote'].replace(/^\*\s*/, '')}
  </p>
</form>
