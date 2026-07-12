<script lang="ts">
  // Title block — own-profile eyebrow ("PROFIL · @handle · IM KIEZ SEIT
  // {year}") + carved headline ("Dein <em>Meldebogen</em>"), OR (own=false)
  // the public-neighbor variant ("NACHBARSCHAFT · @handle · IM KIEZ SEIT
  // {year}" / "Aus der <em>Nachbarschaft</em>"). Ochre accent per the
  // profile/auth "your door" pairing on both branches.
  // Design source: kiosk-profile.jsx (ProfileTitleBlock, own=true/false).

  import { t, tStr } from '../../../lib/kiosk-i18n';

  let { handle, since, own = true }: { handle: string; since: number | string; own?: boolean } = $props();

  const eyebrow = $derived(
    tStr($t[own ? 'profile.eyebrow.own' : 'profile.eyebrow.public'], { h: handle, y: since })
  );
  const heading = $derived($t[own ? 'profile.heading.own' : 'profile.heading.public']);
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
    {@html heading}
  </h1>
</section>
