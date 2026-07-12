<script lang="ts">
  // Own-profile title block — eyebrow ("PROFIL · @handle · IM KIEZ SEIT
  // {year}") + carved headline ("Dein <em>Meldebogen</em>"). Ochre accent
  // per the profile/auth "your door" pairing.
  // Design source: kiosk-profile.jsx (ProfileTitleBlock, own=true branch).

  import { t, tStr } from '../../../lib/kiosk-i18n';

  let { handle, since }: { handle: string; since: number | string } = $props();

  const eyebrow = $derived(tStr($t['profile.eyebrow.own'], { h: handle, y: since }));
</script>

<section
  class="px-5 py-5 lg:px-9 lg:pt-[22px] lg:pb-[18px]"
  style="border-bottom: 1px dashed var(--k-rule);"
>
  <div
    class="font-dmmono text-[11px] uppercase tracking-[0.12em] font-semibold"
    style="color: var(--k-accent, var(--k-ochre));"
  >
    {eyebrow}
  </div>
  <h1
    class="kiosk-headline font-bricolage font-extrabold text-ink mt-1.5 text-[34px] lg:text-[52px]"
    style="letter-spacing: -0.035em; line-height: 0.95;"
  >
    {@html $t['profile.heading.own']}
  </h1>
</section>
