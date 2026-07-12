# READ ME FIRST — Profile pass (Batch 3, surface 3)

Hi Claude Code. This package is the **Editorial Kiosk** redesign of Mahalle's profile:
**own profile (Meldebogen + Archiv) · NEW public neighbor profile · edit-in-place · avatar
upload · e-mail change · password change · delete account**, plus two novel features
(Kiez-Chronik, Steckbrief) and a 10-state matrix. Desktop + mobile, DE + EN.

This is the **7th surface** in the Kiosk rollout. Forum, Calendar, Marketplace, Newsboard,
Auth and Admin are all designed (Forum/Calendar/Marketplace/Newsboard shipped in code) —
the design system, paper grain, riso shadows and `--carved-accent` per-page variable are
live. **You are applying the existing system, not bootstrapping one.**

---

## Decisions locked with the user (Jul 10 2026) — build these, don't re-ask

1. **Delete account = 7-day grace with undo.** After the type-username confirm, the account
   is scheduled („vorgemerkt“), not wiped: warn banner on the Konto card with the deletion
   date + „Widerrufen“, plus an undo link by mail. Logging in during the grace window keeps
   the undo available. Anonymization/deletion per the consequences ledger runs at day 7.
2. **Steckbrief motto stays.** Optional, one line, 80 chars — the ONLY new schema datum of
   this pass. Empty motto ⇒ the Steckbrief simply omits the italic line.

## Things to confirm with the user before you write code

1. **Ochre accent shared with Auth.** Confirmed by the user (profile + auth = the „your
   door“ pair), but flag it if `data-page` scoping makes the two collide anywhere.

---

## Legacy bugs this pass deliberately replaces (do NOT preserve them)

- **Avatar upload never persists.** `handleImageUpload` uploads to Cloudinary but never
  writes `userPicture` (TODO in the code). The §02 flow in `kiosk-profile-flows.jsx` is the
  honest version — it must actually save.
- **The e-mail input that never saves.** The legacy edit form shows an editable e-mail field
  whose value is silently dropped. Replaced by the proper verify-new-address flow (§03).
  E-mail is display-only inside edit mode.
- **⏳ emoji spinner** on load → skeleton that mirrors the real layout (state §01).
- **ui-avatars.com fallback** → own riso monogram (wine circle, serif italic initials).
- **Hardcoded „seit 2019“** → fully derived Kiez-Chronik (zero new schema fields, 24h cache).

---

## What's in this folder

```
design_handoff_profile/
  READMEFIRST.md              ← you are here
  PROFILE_SCOPING.md          ← full spec: decisions, flows, public-profile rules, states
  Mahalle Redesign.html       ← self-contained bundle of the whole canvas (open in a browser)
  tokens-profile.css          ← ochre accent, surface tags, schema constraints, chronik knobs
  motion-profile.css          ← chronik pulse, skeleton, save tick, chip pop, upload bar
  jsx/
    kiosk-system.jsx          ← base design system (already in your context — reference copy)
    kiosk-profile.jsx         ← accent + seeds + atoms (PCard, PStrap, PStrikeDots, PAvatar,
                                PIdentityCard, PModerationCard, PKontoCard, PChronikStrip,
                                PActivityLedger) + own-profile desktop
    kiosk-profile-public.jsx  ← public neighbor view (NEW) + both mobiles
    kiosk-profile-flows.jsx   ← edit-in-place · avatar upload 5 states · e-mail change ·
                                password change · delete account
    kiosk-profile-states.jsx  ← 10-state matrix (desktop + mobile)
    kiosk-profile-novel.jsx   ← Kiez-Chronik anatomy + Steckbrief print card
```

**The JSX is the source of truth for layout + copy.** Read it directly — that worked best
on all six prior surfaces. The `.css` files give you tokens and keyframes; the `.jsx` gives
you exact structure, spacing and both-language strings. As with Auth and Admin: wire values
through the established `--k-*` pattern — the CSS files are spec, not drop-ins.

---

## Step-by-step

**Step 0 — Look at it.** Open `Mahalle Redesign.html`. The top four canvas sections are the
profile pass: own + public profiles, flows, state matrix, novel features.

**Step 1 — Confirm the accent item** with the user; the two formerly-open questions are
decided (see the locked-decisions box up top).

**Step 2 — Read `PROFILE_SCOPING.md`** end to end.

**Step 3 — Wire the tokens.** Add `tokens-profile.css` + `motion-profile.css` values to the
profile routes. Emit `data-page="profile"` on `/profil` AND the new `/nachbarn/[handle]`
route. Nav: profile is NOT a nav tab — the nav avatar gets an ochre ring while active.

**Step 4 — Build, in JSX dependency order:**
1. `kiosk-system.jsx` — already in your context.
2. `kiosk-profile.jsx` — atoms, seeds, own-profile desktop (2-col: identity/moderation/konto
   left · chronik strip + Archiv ledger right).
3. `kiosk-profile-public.jsx` — public neighbor profile + mobile layouts.
4. `kiosk-profile-flows.jsx` — the five flows.
5. `kiosk-profile-states.jsx` — the 10-state contract.
6. `kiosk-profile-novel.jsx` — Chronik (derived, cached) + Steckbrief (print-CSS route).

**Step 5 — New backend surface this pass needs:**
- **`/nachbarn/[handle]` route + public-profile resolver** (public fields only — see the
  hard privacy rule below). Entry points: author names in Forum / Markt / Kalender.
- **E-mail change:** new endpoint + `pendingEmail` field. Link 30 min, single-use; old
  address notified; old address stays active until confirm; taken address ⇒ neutral error
  („Diese Adresse kann nicht verwendet werden.“) — no account enumeration.
- **Password change:** `ChangePasswordSchema` exists; on success sign out all OTHER devices.
- **Chronik resolver:** derive milestones (user.createdAt, oldest post/listing/event,
  aggregated danke ≥ 100) at read time, cache 24h. Zero new schema fields.
- **Cross-surface activity feed:** reverse-chrono merge of the user's posts, listings,
  events, news submissions + saved items (◈ toggle, own view only).

---

## Non-negotiables (don't regress these)

- **Public profile NEVER shows:** e-mail, saved items, moderation standing, settings. It
  shows: name, handle, seit, verified badge, hobbies, Chronik, public activity only.
- **No DM system.** Contact runs through content (listing contact form, forum replies). The
  dashed footnote card on the public profile says exactly this.
- **Edit happens IN the card** — no separate screen, no modal. Optimistic save; failure
  returns to edit state with inputs intact (state §05). Legacy swallows errors — don't.
- **E-mail is not editable in edit mode.** Its change is its own verified flow (§03).
- **Anti-enumeration everywhere** — same rule as Auth. Taken e-mail ⇒ neutral error.
- **Moderation standing is always visible** on the own profile: 0 strikes ⇒ green rule +
  one line („Alles im Reinen“); otherwise strike dots x/3 + rejected-items list
  (strikethrough + reason). Rejected content is visible only to its author — same rule as
  Forum. Strike data ties to the admin pass's 3-strike system.
- **State §09 (gesperrt)** binds to the admin pass's ban enforcement (Plan 1): profile stays
  readable, all writes disabled, moderation block shows ●●● + reason.
- **Hobbies stay free-text chips** — max 10 × 50 chars (ProfileUpdateSchema). No taxonomy.
- **Delete-account consequences are the designed ledger:** posts/comments + created events
  remain anonymized („Ehemaliges Mitglied“); listings, saved items, RSVPs and personal data
  are deleted; the moderation log keeps anonymized entries. CTA enabled only when the typed
  username matches. Execution is deferred by the **7-day grace** — no code path may wipe
  data before day 7 or hide the „Widerrufen“ control during the window.
- **Curly quotes in German strings.** Opener `„` (U+201E) + closer `“` (U+201C). Straight
  ASCII `"` breaks Babel and is wrong typography. The JSX here is lint-checked clean; keep
  it that way.
- **DE + EN parity** on all screens of this pass (flows included).

---

## Out of scope for this pass

- **DM / messaging system** — rejected, not deferred.
- **Un-ban / appeals UI** — belongs to the admin pass's out-of-scope list.
- **Avatar cropping/editing** — upload as-is, Cloudinary preset as in codebase.
- **QR library choice for the Steckbrief** — small + local, no external service; pick at
  implementation time.
- **Notification infra** (e.g. „your e-mail change was confirmed“ push) — e-mail notices
  only, via the existing Resend setup.

When in doubt about app behaviour, read from `main`.
