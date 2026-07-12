# READ ME FIRST — Admin moderation pass (Batch 3, surface 2)

Hi Claude Code. This package is the **Editorial Kiosk** redesign of Mahalle's moderation
back-office: **review queue (Prüfstapel) · history (Protokoll) · decision flows · ban
enforcement screens**, with a 9-state matrix. Desktop DE + EN; mobile is triage-only.

This is the **6th surface** in the Kiosk rollout. Forum, Calendar, Marketplace, Newsboard and
Auth are all shipped — the design system, paper grain, riso shadows and `--carved-accent`
per-page variable are live. **You are applying the existing system, not bootstrapping one.**

---

## ⚠️ FIX THIS BEFORE (OR WITH) THIS IMPLEMENTATION — SECURITY

**`isAdmin()` in all 3 moderation API endpoints is a placeholder.** The `ADMIN_USER_IDS`
list is empty, and the current check lets **EVERYONE** through. Before this surface ships,
change the guard to a real role check: `user.role === 'admin'` (the same role that already
drives the „Mahalle-Team" badge in Forum). The §09 state (403 „Dieser Bereich gehört der
Moderation.") assumes that real check exists. Do not build the UI on top of the placeholder.

---

## Things to confirm with the user before you write code

1. **Plum accent.** Admin's carved accent is **plum** (`#6f2f59`) — the last free primary
   (Forum=wine · Calendar=teal · Marketplace=wine · Newsboard=ink · Auth=ochre). Confirmed in
   design review, but flag it if it collides with anything in the codebase.
2. **Ban enforcement is NEW code.** The 3-strike ban exists in the schema, but enforcement is
   a TODO comment in `review.ts`. This pass includes the two user-side screens (login-blocked
   card + suspended banner) — building them requires `isBanned` in the auth callback and a
   guard on all content-write APIs. Confirm the user wants enforcement wired in this pass, not
   just the admin-side UI.
3. **Reporter-outcome notification is deferred.** When a report is resolved, the reporter is
   NOT notified — that needs notification infra that doesn't exist. Don't invent it.

---

## What's in this folder

```
design_handoff_admin/
  READMEFIRST.md            ← you are here
  ADMIN_SCOPING.md          ← full spec: decisions, taxonomies, flows, states, open questions
  Mahalle Redesign.html     ← self-contained bundle of the whole canvas (open in a browser)
  tokens-admin.css          ← plum accent, severity ramp, straps, strike system, stat rules
  motion-admin.css          ← urgent pulse, settle-out, skeleton, modal stamp, reduced-motion
  jsx/
    kiosk-system.jsx        ← base design system (already in your context — reference copy)
    kiosk-admin.jsx         ← tokens + seeds + masthead + stat row + queue cards + queue
                              index (desktop DE/EN) + mobile triage
    kiosk-admin-history.jsx ← Protokoll table: sortable headers, column menu, decision filter
    kiosk-admin-flows.jsx   ← reject modal · Ban-Bremse · warning modal · bulk preview ·
                              user-side suspended screens
    kiosk-admin-states.jsx  ← 9-state matrix
```

**The JSX is the source of truth for layout + copy.** Read it directly — that worked best on
all five prior surfaces. The `.css` files give you tokens and keyframes; the `.jsx` gives you
exact structure, spacing and both-language strings.

---

## Step-by-step

**Step 0 — Look at it.** Open `Mahalle Redesign.html`. The top three canvas sections are the
admin pass: queue + mobile triage, flows + Sperre screens, and the 9-state matrix.

**Step 1 — Fix `isAdmin()`** (see the security box up top) and confirm items 1–3 with the user.

**Step 2 — Read `ADMIN_SCOPING.md`** end to end. Every locked decision, the category→severity
mapping, the strike/ban rules, and the open questions live there.

**Step 3 — Wire the tokens.** Add `tokens-admin.css` + `motion-admin.css` to the moderation
route. Emit `data-page="admin"` from the layout (mirrors `data-page="marketplace"` / `"auth"`)
so the plum accent is scoped.

**Step 4 — Build, in JSX dependency order:**
1. `kiosk-system.jsx` — already in your context.
2. `kiosk-admin.jsx` — atoms (`AdmSourceStrap`, `AdmCatChip`, `AdmStrikeDots`, `AdmActionBtn`),
   masthead + ribbon, stat row, filter rail, bulk bar, queue card, queue index, mobile triage.
3. `kiosk-admin-history.jsx` — Protokoll table + column-visibility menu + decision filter.
4. `kiosk-admin-flows.jsx` — the four modals + the two user-side Sperre screens.
5. `kiosk-admin-states.jsx` — the 9-state contract (loading / empty / errors / urgent / ban / 403).

**Step 5 — Replace the `prompt()` calls.** The current `ModerationQueue.svelte` uses browser
`prompt()` for rejection reason and warning text. The Kiosk modals in `kiosk-admin-flows.jsx`
replace them 1:1 — reason is required and shown to the author; internal note is optional and
protocol-only; the warning modal shows a live preview of the ochre „⚠ HINWEIS DER MODERATION"
strap as it will sit on the content.

**Step 6 — Honour the two novel guards.** These are the heart of the pass:
- **Ban-Bremse (§01):** any reject that would be the author's 3rd strike escalates the modal —
  inline strike ledger (3 rows with dates + surfaces) + an explicit checkbox before
  „ablehnen & sperren". A ban must never happen casually.
- **Bulk-Folgen-Vorschau (§02):** bulk reject shows per-author strike deltas (●●○ → ●●●)
  BEFORE confirm. Multiple hits on the same author are summed. Any resulting ban shows a
  „WIRD GESPERRT" flag, and the CTA stays disabled until the acknowledgment checkbox is
  ticked. Maps the `bansTriggered` / `results[]` of the bulk-review API (max 50 per call).

---

## Non-negotiables (don't regress these)

- **Plum is admin's accent.** No other surface may claim it.
- **Sperren passiert nie beiläufig.** No code path may trigger a ban without the Ban-Bremse
  (single) or the acknowledged Folgen-Vorschau (bulk) having been confirmed.
- **Rejected content stays in the DB** (proof of moderation) — same rule as Forum. Visible
  only to its author, with the rejection reason.
- **Strike dots ●●○ on every queue card** next to the author. 2-strike authors additionally
  get the inline „Ablehnung = Sperre (3/3)" flag on the card.
- **„Alle" in the Protokoll = approved + rejected — never pending** (`reviewStatus:
  'reviewed'` in the API). The queue and the history are disjoint sets.
- **Urgent rule:** score ≥ 0.85 in a critical category ⇒ urgent. 2px danger frame, red print
  shadow, pulsing DRINGEND strap, always sorted to top, own counter in the stat row.
- **Mobile = triage only.** One case at a time, 48px action row. History, bulk actions and
  the column menu are desktop-only — mobile triages, it doesn't manage.
- **Curly quotes in German strings.** Opener `„` (U+201E) + closer `"` (U+201C). Straight
  ASCII `"` breaks Babel and is wrong typography. The JSX here is clean; keep it that way.
- **DE + EN parity** on queue + history. Flows + state matrix are DE-only by design (internal
  tool; the copy contract is the DE version).

---

## Out of scope for this pass

- **Reporter-outcome notifications** (needs notification infra — deferred, see item 3).
- **Un-ban UI.** The §08 toast points to „im Protokoll → Autor → entsperren" — that popover
  is future work; a manual DB flip is acceptable interim. Don't build a full user-management
  surface.
- **Moderator roles/permissions beyond the single `admin` role.** No tiered moderation.
- **Appeal flow for banned users.** The login-blocked card shows the moderation contact
  address — that's the whole appeal mechanism for now.

When in doubt about app behaviour, read from `main` — `feature/dark-glass-redesign` has merged.
