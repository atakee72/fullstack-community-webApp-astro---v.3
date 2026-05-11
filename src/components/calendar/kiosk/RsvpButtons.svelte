<script lang="ts">
  // Going + Maybe RSVP buttons with optimistic toggle. Clicking the
  // currently-active state cancels (returns to no-RSVP). No
  // 'Not going' button — explicit CD constraint.
  //
  // The mutation handles cache rollback on error (calendarMutations.ts
  // onError callback). UI feedback during in-flight: dim + sync ring.

  import { rsvpMutation } from '../../../lib/calendarMutations';
  import { t } from '../../../lib/kiosk-i18n';
  import { showError } from '../../../utils/toast';

  let {
    eventId,
    myStatus = null,
    currentUserId = null
  } = $props<{
    eventId: string;
    myStatus?: 'going' | 'maybe' | null;
    currentUserId?: string | null;
  }>();

  // Mutation must be created with a non-empty user id (the optimistic
  // onMutate callback uses it). When unauthenticated we render a
  // login prompt instead of the buttons.
  const rsvp = rsvpMutation(currentUserId ?? '__anon__');

  function setStatus(target: 'going' | 'maybe') {
    if (!currentUserId) return;
    const next = myStatus === target ? 'cancel' : target;
    rsvp.mutate(
      { eventId, status: next },
      {
        onError: (err) => {
          showError(err instanceof Error ? err.message : 'RSVP fehlgeschlagen.');
        }
      }
    );
  }
</script>

<div>
  <p class="font-dmmono text-[10px] uppercase tracking-[0.12em] text-teal mb-2.5">
    ◆ {$t['cal.detail.rsvp.kicker']}
  </p>

  {#if !currentUserId}
    <p class="font-instrument italic text-[12.5px] text-ink-mute leading-[1.5]">
      {$t['cal.detail.loginPrompt']}
    </p>
  {:else}
    <div class="flex gap-1.5 mb-3">
      <button
        type="button"
        onclick={() => setStatus('going')}
        disabled={rsvp.isPending}
        aria-pressed={myStatus === 'going'}
        class={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-bricolage font-bold text-[13px] border-2 transition-transform hover:scale-[1.02] disabled:opacity-60 ${
          myStatus === 'going'
            ? 'bg-moss text-paper border-moss'
            : 'bg-paper text-ink border-ink hover:bg-paper-warm'
        }`}
      >
        {#if myStatus === 'going'}
          <span class="k-cal-rsvp-check inline-block" aria-hidden="true">✓</span>
        {/if}
        {$t['cal.rsvp.going.cta']}
      </button>
      <button
        type="button"
        onclick={() => setStatus('maybe')}
        disabled={rsvp.isPending}
        aria-pressed={myStatus === 'maybe'}
        class={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-bricolage font-semibold text-[13px] border-2 border-ink transition-transform hover:scale-[1.02] disabled:opacity-60 ${
          myStatus === 'maybe'
            ? 'bg-ink text-paper'
            : 'bg-paper text-ink hover:bg-paper-warm'
        }`}
      >
        {$t['cal.rsvp.maybe.cta']}
      </button>
    </div>
  {/if}
</div>
