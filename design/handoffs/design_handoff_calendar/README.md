# Calendar Kiosk Handoff — Notes from Claude Design

> Reference only. Not for the codebase. CD's verbatim guidance to Claude Code before Calendar implementation.

## Read order

1. `kiosk-system.jsx` — already in context from Forum (lives in `../design_handoff_forum/forum-design-jsx-files/`)
2. `jsx/kiosk-calendar.jsx` — tokens, seed events, month grid
3. `jsx/kiosk-calendar-views.jsx` — agenda + drag-select
4. `jsx/kiosk-calendar-flows.jsx` — event modal, create flow, states, mobile

`tokens-calendar.css` and `motion-calendar.css` are convenience extracts — **JSX wins on disagreement**.

## Implementation rules

- **Reuse Forum primitives.** `KioskNav`, paper-grain `body::before`, carved-title device, strap labels, riso shadows, type ramp — all already in the codebase. Don't re-derive them. Calendar adds tokens (6 category colors) and motion keyframes on top, nothing replaces.

- **Carved-title accent for Calendar = teal `#2e6f7a`.** Set `--carved-accent` on the Calendar route, same mechanism Forum uses for wine.

- **RSVP is two states only: Going + Maybe.** No "Not going" / "Nope". Removed from artboards before bundling — don't reintroduce them from intuition.

- **Drag-select is the headline interaction.** Hold + drag across days → on mouse-up, a `+` pin springs in (≈600ms) at the release point → click pin opens create modal with start/end dates pre-filled. Don't shortcut it to a single-click flow.

- **Create flow is a single modal, not a wizard.** Optimistic publish: event appears in the grid immediately; AI moderation runs in parallel and can retroactively flag/hide it. Same pattern as Forum posts.

- **Capacity bar color shifts at thresholds.** ≤59 % moss, 60–84 % ochre, ≥85 % wine. Sold out → `Warteliste · N voraus` with auto-promote on cancellations.

- **Categories use token colors only** — Kiez wine, Öffentlich teal, Markt ochre, Kultur plum, Sport moss, Privat inkSoft. Don't invent new ones.

- **German curly quotes**: opener `„` (U+201E) + closer `"` (U+201C). Straight `"` will break JS string literals — bit the design build twice.

- **Today reference** in seed data is **Mi 6. Mai 2026**. Adjust if you reseed.

- **Paper grain stays as-is** — `body::before` with the two stacked radial-gradients. Don't reapply to Calendar surfaces; already there from Forum.

- **JSX is the spec.** Tokens-CSS + motion-CSS are convenience extracts. If they disagree with the JSX, JSX wins.
