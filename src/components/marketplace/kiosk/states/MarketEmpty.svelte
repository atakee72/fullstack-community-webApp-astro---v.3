<script lang="ts">
  // Truly-empty state — §02. No listings exist at all, no filters active.
  // Centered paper-warm panel with dashed rule border. Direct CTA to create.
  import { t } from '../../../../lib/kiosk-i18n';
</script>

<div
  style="
    margin: 32px 20px;
    padding: 40px 24px;
    background: var(--k-paper-warm);
    border: 1px dashed var(--k-rule);
    border-radius: var(--k-radius-md);
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  "
>
  <div
    class="font-instrument italic"
    style="font-size: 48px; color: var(--k-ochre, #d4a72c); line-height: 1;"
    aria-hidden="true"
  >∅</div>

  <p
    class="font-instrument italic"
    style="font-size: 18px; line-height: 1.3; color: var(--k-ink); max-width: 260px; margin: 0;"
  >
    {$t['market.state.empty.truly.body']}
  </p>

  <a
    href="/marketplace/create"
    class="font-bricolage font-semibold"
    style="
      display: inline-block;
      margin-top: 8px;
      padding: 9px 22px;
      background: var(--k-ink);
      color: var(--k-paper);
      border-radius: var(--k-radius-pill, 999px);
      font-size: 14px;
      text-decoration: none;
    "
  >
    {$t['market.state.empty.truly.cta']}
  </a>
</div>
