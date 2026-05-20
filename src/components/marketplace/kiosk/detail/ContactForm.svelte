<script lang="ts">
  import { t } from '../../../../lib/kiosk-i18n';
  import { sendContactMessage } from '../../../../hooks/api/useContactListingMutation';
  import { showToast, showSuccess, showError } from '../../../../utils/toast';
  import type { Listing } from '../../../../types/listing';

  let {
    listing,
  }: {
    listing: Pick<Listing, '_id' | 'title' | 'listingType' | 'status' | 'moderationStatus'>;
  } = $props();

  // ─── State ────────────────────────────────────────────────────────────────

  let formState = $state<'idle' | 'sending' | 'sent' | 'error'>('idle');
  let name = $state('');
  let email = $state('');
  let message = $state('');
  let honeypot = $state('');
  let errorMessage = $state<string | null>(null);

  // ─── Derived ─────────────────────────────────────────────────────────────

  const isTausch = $derived(listing.listingType === 'exchange');
  const msgLen = $derived(message.length);
  const accent = $derived(isTausch ? 'var(--k-teal)' : 'var(--k-wine)');

  // ─── Validation ──────────────────────────────────────────────────────────

  function validate(): string | null {
    if (name.trim().length < 2) return 'Name mindestens 2 Zeichen.';
    if (name.trim().length > 60) return 'Name maximal 60 Zeichen.';
    if (!email.trim().match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return 'Bitte eine gültige E-Mail eingeben.';
    if (message.trim().length < 20) return 'Nachricht mindestens 20 Zeichen.';
    if (message.trim().length > 600) return 'Nachricht maximal 600 Zeichen.';
    return null;
  }

  // ─── Error code → toast copy ────────────────────────────────────────────

  const ERROR_MESSAGES: Record<string, string> = {
    listing_pending_review: 'Diese Anzeige wird gerade geprüft.',
    rate_limited_hourly: 'Du hast in der letzten Stunde zu viele Nachrichten gesendet.',
    rate_limited_daily_to_owner: 'Du hast diesen Verkäufer heute schon mehrfach kontaktiert.',
    rate_limited_ip: 'Zu viele Anfragen aus deinem Netzwerk.',
    listing_flooded: 'Diese Anzeige bekommt gerade viele Nachrichten. Versuch es später.',
    message_flagged: 'Deine Nachricht wurde vom System markiert.',
    seller_unreachable: 'Der Verkäufer ist gerade nicht erreichbar.',
  };

  // ─── Submit ──────────────────────────────────────────────────────────────

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    errorMessage = null;

    const validationError = validate();
    if (validationError) {
      errorMessage = validationError;
      return;
    }

    formState = 'sending';

    const result = await sendContactMessage({
      listingId: String(listing._id),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      message: message.trim(),
      website: honeypot,
    });

    if (result.ok) {
      formState = 'sent';
    } else {
      formState = 'error';
      const userMsg = result.error
        ? (ERROR_MESSAGES[result.error] ?? 'Etwas ist schiefgelaufen. Bitte versuch es erneut.')
        : 'Etwas ist schiefgelaufen. Bitte versuch es erneut.';
      errorMessage = userMsg;
      showError(userMsg);
    }
  }
</script>

<!-- ─── Pending blocker (A6) ────────────────────────────────────────────── -->
{#if listing.moderationStatus === 'pending'}
  <div
    style="
      background: var(--k-paper-soft, #ede8db);
      border: 1.5px solid var(--k-rule, #b8b0a0);
      border-radius: var(--k-radius-md, 6px);
      padding: 16px 18px;
    "
  >
    <div
      style="
        font-family: var(--k-font-mono); font-size: 10px;
        color: var(--k-ink-mute); letter-spacing: 0.12em; font-weight: 600;
        margin-bottom: 8px;
      "
    >◆ INTERESSE? NACHRICHT SENDEN</div>
    <p
      style="
        font-family: var(--k-font-display); font-size: 14px;
        color: var(--k-ink-soft); line-height: 1.45; margin: 0;
      "
    >Diese Anzeige wird gerade geprüft. Du kannst eine Nachricht senden, sobald die Prüfung abgeschlossen ist.</p>
  </div>

<!-- ─── Sent confirmation ────────────────────────────────────────────────── -->
{:else if formState === 'sent'}
  <div
    class="market-contact-sent"
    style="
      background: var(--k-ink, #1b1a17); color: var(--k-paper, #f7f0de);
      border: 2px solid var(--k-ink, #1b1a17);
      border-radius: var(--k-radius-md, 6px); padding: 16px 18px;
      display: flex; flex-direction: column; gap: 10px;
      box-shadow: 2px 2px 0 var(--k-moss, #4a7c59);
    "
  >
    <div
      style="
        font-family: var(--k-font-mono); font-size: 10px;
        color: var(--k-moss, #4a7c59); letter-spacing: 0.12em; font-weight: 700;
      "
    >◆ {$t['market.contact.sent.header']}</div>
    <div
      style="
        font-family: var(--k-font-serif, Georgia, serif); font-style: italic;
        font-size: 16px; line-height: 1.4;
      "
    >{$t['market.contact.sent.confirmation']}</div>
    <div
      style="
        font-family: var(--k-font-mono); font-size: 10px;
        color: rgba(247,240,222,0.6); line-height: 1.5;
      "
    >🔒 {$t['market.contact.sent.helper']}</div>
  </div>

<!-- ─── Idle form ────────────────────────────────────────────────────────── -->
{:else}
  <div
    style="
      background: var(--k-paper-warm, #f3ead8);
      border: 2px solid var(--k-ink, #1b1a17);
      border-radius: var(--k-radius-md, 6px); padding: 16px 18px;
      display: flex; flex-direction: column; gap: 12px;
      box-shadow: 2px 2px 0 {accent};
    "
  >
    <!-- Kicker -->
    <div
      style="
        font-family: var(--k-font-mono); font-size: 10px;
        color: {accent}; letter-spacing: 0.12em; font-weight: 700;
      "
    >◆ {isTausch ? $t['market.contact.tausch.headline'] : $t['market.contact.header']}</div>

    <!-- Tausch helper text -->
    {#if isTausch}
      <p
        style="
          font-family: var(--k-font-serif, Georgia, serif); font-style: italic;
          font-size: 13px; line-height: 1.45;
          color: var(--k-ink-soft, #5a5650); margin: 0;
        "
      >{$t['market.contact.tausch.helper']}</p>
    {/if}

    <!-- Reserved soft-note (A7) — form stays interactive -->
    {#if listing.status === 'reserved'}
      <p
        class="market-contact-reserved-note"
        style="
          font-family: var(--k-font-mono); font-size: 11px;
          color: var(--k-ochre, #c8891a); line-height: 1.4;
          border-left: 2px solid var(--k-ochre, #c8891a); padding-left: 8px;
          margin: 0;
        "
      >{$t['market.contact.reserved.softnote']}</p>
    {/if}

    <!-- Honeypot (hidden, bot-bait) -->
    <input
      type="text"
      name="website"
      value=""
      bind:value={honeypot}
      tabindex="-1"
      autocomplete="off"
      aria-hidden="true"
      style="position:absolute; left:-9999px; width:1px; height:1px; opacity:0;"
    />

    <form onsubmit={handleSubmit} style="display: flex; flex-direction: column; gap: 12px;">
      <!-- Name field -->
      <div>
        <label
          for="contact-name"
          style="
            display: block; font-family: var(--k-font-mono); font-size: 9px;
            color: var(--k-ink-mute, #7a7264); letter-spacing: 0.1em;
            text-transform: uppercase; margin-bottom: 4px;
          "
        >{$t['market.contact.name.label']}</label>
        <input
          id="contact-name"
          type="text"
          bind:value={name}
          placeholder="z.B. Sina K."
          autocomplete="name"
          minlength="2"
          maxlength="60"
          required
          disabled={formState === 'sending'}
          style="
            width: 100%; box-sizing: border-box;
            background: var(--k-paper-soft, #ede8db);
            border: 1px solid var(--k-rule, #b8b0a0);
            border-radius: var(--k-radius-sm, 4px);
            padding: 8px 10px;
            font-family: var(--k-font-display); font-size: 14px;
            color: var(--k-ink, #1b1a17);
            outline: none;
          "
        />
      </div>

      <!-- Email field -->
      <div>
        <label
          for="contact-email"
          style="
            display: block; font-family: var(--k-font-mono); font-size: 9px;
            color: var(--k-ink-mute, #7a7264); letter-spacing: 0.1em;
            text-transform: uppercase; margin-bottom: 4px;
          "
        >{$t['market.contact.email.label']}</label>
        <input
          id="contact-email"
          type="email"
          bind:value={email}
          placeholder="deine@email.de"
          autocomplete="email"
          required
          disabled={formState === 'sending'}
          style="
            width: 100%; box-sizing: border-box;
            background: var(--k-paper-soft, #ede8db);
            border: 1px solid var(--k-rule, #b8b0a0);
            border-radius: var(--k-radius-sm, 4px);
            padding: 8px 10px;
            font-family: var(--k-font-display); font-size: 14px;
            color: var(--k-ink, #1b1a17);
            outline: none;
          "
        />
      </div>

      <!-- Message field -->
      <div>
        <label
          for="contact-message"
          style="
            display: block; font-family: var(--k-font-mono); font-size: 9px;
            color: var(--k-ink-mute, #7a7264); letter-spacing: 0.1em;
            text-transform: uppercase; margin-bottom: 4px;
          "
        >{$t['market.contact.message.label']}</label>
        <textarea
          id="contact-message"
          bind:value={message}
          placeholder={isTausch
            ? $t['market.contact.tausch.placeholder']
            : 'Hi, ich interessiere mich für deine Anzeige…'}
          minlength="20"
          maxlength="600"
          rows="5"
          required
          disabled={formState === 'sending'}
          style="
            width: 100%; box-sizing: border-box;
            background: var(--k-paper-soft, #ede8db);
            border: 1px solid var(--k-rule, #b8b0a0);
            border-radius: var(--k-radius-sm, 4px);
            padding: 10px 12px;
            font-family: var(--k-font-display); font-size: 13px;
            color: var(--k-ink, #1b1a17);
            line-height: 1.5; resize: vertical; outline: none;
          "
        ></textarea>
        <div
          style="
            display: flex; justify-content: space-between;
            font-family: var(--k-font-mono); font-size: 9px;
            color: var(--k-ink-mute, #7a7264); margin-top: 4px;
          "
        >
          <span>{$t['market.contact.helper.text']}</span>
          <span
            style="color: {msgLen > 560 ? 'var(--k-wine, #b23a5b)' : 'inherit'}"
          >{msgLen}/600</span>
        </div>
      </div>

      <!-- Validation error -->
      {#if errorMessage}
        <p
          style="
            font-family: var(--k-font-mono); font-size: 11px;
            color: var(--k-wine, #b23a5b); margin: 0;
            border-left: 2px solid var(--k-wine, #b23a5b); padding-left: 8px;
          "
        >{errorMessage}</p>
      {/if}

      <!-- Submit button -->
      <button
        type="submit"
        disabled={formState === 'sending'}
        style="
          font-family: var(--k-font-mono); font-size: 13px; font-weight: 700;
          letter-spacing: 0.04em; color: var(--k-paper, #f7f0de);
          background: var(--k-ink, #1b1a17);
          border: 2px solid var(--k-ink, #1b1a17);
          border-radius: var(--k-radius-sm, 4px);
          padding: 10px 16px; cursor: pointer;
          box-shadow: 2px 2px 0 {accent};
          opacity: {formState === 'sending' ? '0.6' : '1'};
          transition: opacity 0.15s;
          width: 100%;
        "
      >{formState === 'sending' ? '…' : $t['market.contact.send']}</button>
    </form>

    <!-- Privacy footer -->
    <div
      style="
        font-family: var(--k-font-mono); font-size: 9.5px;
        color: var(--k-ink-mute, #7a7264); letter-spacing: 0.03em; line-height: 1.5;
        border-top: 1px dashed var(--k-rule, #b8b0a0); padding-top: 10px;
        margin-top: 2px;
      "
    >🔒 {$t['market.contact.privacy.footer']}</div>
  </div>
{/if}
