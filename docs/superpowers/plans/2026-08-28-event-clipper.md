# Event-Clipper Bookmarklet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let members clip an event from any webpage into Mahalle's event compose — a bookmarklet that opens `/events/create` prefilled with title, description (selection + source link), and dates when the page exposes them.

**Architecture:** Two pieces. (1) `EventComposePageInner.svelte`'s existing URL-prefill branch (`?from/to/allDay`, from drag-select) is extended to also accept `?title/body/location` — any prefill param triggers the branch, URL wins over the draft store, exactly like today. (2) A new ungated static page `/event-clipper` carries the drag-to-bookmarks link; a tiny inline script builds the `javascript:` href at load time from `location.origin`, so the same page works on dev and prod without hardcoded domains. The bookmarklet collects og:title/document.title, the user's text selection, the page URL, and (best-effort) schema.org JSON-LD Event dates, then opens `<origin>/events/create?…` in a new tab. The login gate's `?redirect=` bounce already preserves the query for logged-out clicks.

**Tech Stack:** Svelte 5 (compose island), Astro static page on `KioskLayout`, vanilla JS bookmarklet (no build step).

**Spec:** none — bounded feature, design approved in chat 2026-08-28 (this plan is self-contained). Ledger sketch: memory `project_open_followups` "event-clipper bookmarklet".

## Global Constraints

- The compose prefill change touches ONLY the client-side `computeInitialValues` — no server/API/moderation changes.
- URL prefill precedence stays: edit mode > URL params > draft store > defaults. Any of `from`, `title`, `body`, `location` present → URL branch wins (today only `from` triggers it).
- Defensive length caps on URL-sourced values: title/location 200 chars, body 3000 chars (`.slice`), applied in the compose branch AND in the bookmarklet.
- `/event-clipper` is deliberately NOT login-gated (instructions are harmless; the compose target is gated) and is NOT added to middleware lists.
- Page copy is German-only (matches legal pages / short-page pattern). Copy is given verbatim below — use as written.
- `.svelte` changes need a browser gate (no svelte-check in CI). Dev server ONLY on port 4655 (NEVER 3000 — that belongs to the user); kill with `fuser -k 4655/tcp` after. Dev-server log goes to `/tmp/claude-1000/-home-atakee-projects-fullstack-community-webApp-astro---v-3/93289b1a-264e-4c59-9617-31fa48b15c68/scratchpad/dev4655.log`.
- Login for browser gates: open the gated URL → bounce to `/login?redirect=…` → fill `admin@mahalle-dev.test` + the password from `/tmp/claude-1000/-home-atakee-projects-fullstack-community-webApp-astro---v-3/93289b1a-264e-4c59-9617-31fa48b15c68/scratchpad/devpw.txt` (NEVER print it) → submit lands on the target with query preserved.
- Commits: simple concise messages, NO "Generated with Claude Code" signature, NO Co-Authored-By footer.

---

### Task 1: Compose URL-prefill extension (`title`/`body`/`location`)

**Files:**
- Modify: `src/components/calendar/kiosk/compose/EventComposePageInner.svelte` (the `computeInitialValues` function, currently ~lines 80–105 — the `const from = …` block through the `if (from) { … }` return)

**Interfaces:**
- Consumes: existing `EventComposeValues` type (from `EventComposeForm.svelte`) — omitted `startDate/startTime/endDate/endTime` fall back to today / 09:00 / 17:00 in the `$state` seeder, so partial returns are safe.
- Produces: `/events/create?title=…&body=…&location=…[&from=…&to=…&allDay=1]` prefills the form. Task 2's bookmarklet and its verification rely on exactly these param names.

- [ ] **Step 1: Extend the URL branch**

In `computeInitialValues`, replace this block:

```ts
    const from = search.get('from');
    const to = search.get('to');
    const allDayParam = search.get('allDay') === '1';

    let saved: EventDraftValues | null = null;
    eventDraft.subscribe((v) => (saved = v))();

    if (from) {
      // URL params win — drag-select just landed on this page.
      return {
        title: '',
        body: '',
        category: 'kiez',
        startDate: from,
        endDate: to ?? from,
        allDay: allDayParam,
        location: '',
        capacity: null,
        visibility: 'public',
        tags: []
      };
    }
```

with:

```ts
    const from = search.get('from');
    const to = search.get('to');
    const allDayParam = search.get('allDay') === '1';
    // Event-clipper / external prefill (Aug 2026): title/body/location can
    // arrive alongside (or without) the drag-select date params. ANY prefill
    // param present → the URL wins over the draft store, same rule as `from`.
    // Length caps are defensive — URL values are caller-controlled.
    const titleParam = search.get('title');
    const bodyParam = search.get('body');
    const locationParam = search.get('location');

    let saved: EventDraftValues | null = null;
    eventDraft.subscribe((v) => (saved = v))();

    if (from || titleParam !== null || bodyParam !== null || locationParam !== null) {
      return {
        title: (titleParam ?? '').slice(0, 200),
        body: (bodyParam ?? '').slice(0, 3000),
        category: 'kiez',
        ...(from ? { startDate: from, endDate: to ?? from } : {}),
        allDay: allDayParam,
        location: (locationParam ?? '').slice(0, 200),
        capacity: null,
        visibility: 'public',
        tags: []
      };
    }
```

(Note: when `from` is absent, `startDate/endDate` are deliberately omitted so the form's today-defaults apply.)

- [ ] **Step 2: Browser-gate the prefill**

```bash
(pnpm dev --port 4655 > /tmp/claude-1000/-home-atakee-projects-fullstack-community-webApp-astro---v-3/93289b1a-264e-4c59-9617-31fa48b15c68/scratchpad/dev4655.log 2>&1 &) && sleep 12
playwright-cli open "http://localhost:4655/events/create?title=Clip-Test&body=Beschreibung%0A%0AQuelle:%20https://example.org/fest&location=Herrfurthplatz&from=2026-09-05" >/dev/null 2>&1
sleep 3
```

Then log in via the bounce (Global Constraints recipe — the redirect preserves the query). After landing, read the form values:

```bash
playwright-cli run-code "async (page) => { return await page.evaluate(() => { const ins=[...document.querySelectorAll('input,textarea')]; const by=(t)=>ins.find(i=>i.value&&String(i.value).includes(t)); return ['Clip-Test','Herrfurthplatz','2026-09-05','Quelle'].map(t=>t+'='+!!by(t)).join(' | '); }); }"
```

Expected: all four report `=true` (title, location, date, and body containing the Quelle line are in the form).

- [ ] **Step 3: Verify drag-select regression**

```bash
playwright-cli goto "http://localhost:4655/events/create?from=2026-09-10&to=2026-09-11&allDay=1" >/dev/null 2>&1; sleep 2
playwright-cli run-code "async (page) => { return await page.evaluate(() => { const ins=[...document.querySelectorAll('input,textarea')]; return ['2026-09-10','2026-09-11'].map(t=>t+'='+!!ins.find(i=>String(i.value).includes(t))).join(' | ')+' | titleEmpty='+!ins.find(i=>i.value==='Clip-Test'); }); }"
```

Expected: both dates `=true`, `titleEmpty=true` (the old path still works, no bleed from the previous page).

- [ ] **Step 4: Commit**

```bash
git add src/components/calendar/kiosk/compose/EventComposePageInner.svelte
git commit -m "feat: event compose accepts title/body/location URL prefill"
```

---

### Task 2: Bookmarklet + `/event-clipper` page (+ docs note)

**Files:**
- Create: `src/pages/event-clipper.astro`
- Modify: `src/components/calendar/kiosk/CLAUDE.md` (append the section given in Step 2)

**Interfaces:**
- Consumes: Task 1's param names (`title`, `body`, `from`, `to`) on `/events/create`; `KioskLayout` props (`title`, `description`, `page`).
- Produces: public page `/event-clipper` whose link's `href` is a `javascript:` bookmarklet targeting the page's own origin.

- [ ] **Step 1: Create the page**

Create `src/pages/event-clipper.astro` with exactly this content:

```astro
---
// /event-clipper — Termin-Clipper bookmarklet page.
//
// Deliberately NOT login-gated (instructions are harmless; the compose
// target /events/create is gated and its ?redirect= bounce preserves the
// prefill query). The bookmarklet href is built client-side from
// location.origin so the same page works on dev and prod.
import KioskLayout from '../layouts/KioskLayout.astro';
---

<KioskLayout
  title="Termin-Clipper | Mahalle"
  description="Veranstaltungen von anderen Webseiten mit einem Klick in den Mahalle-Kalender übernehmen."
  page="calendar"
>
  <main class="clip-wrap">
    <p class="clip-kicker font-dmmono">WERKZEUG · KALENDER</p>
    <h1 class="clip-title font-bricolage">Der Termin-Clipper</h1>
    <p class="clip-lead">
      Du findest im Netz eine Veranstaltung, die in den Kiez gehört? Mit dem
      Termin-Clipper übernimmst du sie mit einem Klick in den
      Mahalle-Kalender — Titel, Datum und Quelle inklusive.
    </p>

    <p class="clip-kicker clip-kicker--steps font-dmmono">SO GEHT ES</p>
    <ol class="clip-steps">
      <li><strong>Einmalig:</strong> Zieh den Knopf unten in deine Lesezeichen-Leiste (Bookmarks-Bar).</li>
      <li>Auf einer Veranstaltungsseite: markiere optional den Beschreibungstext, dann klicke das Lesezeichen.</li>
      <li>Der Mahalle-Termin öffnet sich vorausgefüllt — prüfen, ergänzen, veröffentlichen. Fertig.</li>
    </ol>

    <p class="clip-drag">
      <a id="clipper-link" href="#" class="clip-btn font-bricolage" draggable="true">📎 Zu Mahalle clippen</a>
    </p>
    <p class="clip-note">
      Titel und (wenn die Seite sie maschinenlesbar angibt) das Datum werden
      automatisch übernommen; markierter Text wird zur Beschreibung, die
      Quelle wird verlinkt. Auf dem Handy funktionieren Lesezeichen-Skripte
      leider nur eingeschränkt — der Clipper ist ein Desktop-Werkzeug.
    </p>
  </main>
</KioskLayout>

<script is:inline data-astro-rerun>
  (function () {
    // Bookmarklet source. __ORIGIN__ is replaced with this page's origin so
    // dev and prod each clip into themselves. Collected: og:title/document
    // title, text selection, page URL, best-effort schema.org Event dates.
    var SRC = "(function(){function q(s){var m=document.querySelector(s);return m?m.getAttribute('content'):null}var t=q('meta[property=\\\"og:title\\\"]')||document.title||'';var sel='';try{sel=String(window.getSelection())}catch(e){}var url=location.href;var from='',to='';try{var sc=document.querySelectorAll('script[type=\\\"application/ld+json\\\"]');outer:for(var i=0;i<sc.length;i++){var d=JSON.parse(sc[i].textContent);var arr=Array.isArray(d)?d:(d&&d['@graph']?d['@graph']:[d]);for(var j=0;j<arr.length;j++){var n=arr[j];if(n&&/Event/.test(String(n['@type']))&&n.startDate){from=String(n.startDate).slice(0,10);if(n.endDate){to=String(n.endDate).slice(0,10)}break outer}}}}catch(e){}var body=(sel?sel+'\\n\\n':'')+'Quelle: '+url;var p=new URLSearchParams();if(t){p.set('title',t.slice(0,200))}p.set('body',body.slice(0,3000));if(from){p.set('from',from)}if(to){p.set('to',to)}window.open('__ORIGIN__/events/create?'+p.toString(),'_blank')})();";
    var link = document.getElementById('clipper-link');
    if (link) {
      link.setAttribute(
        'href',
        'javascript:' + encodeURIComponent(SRC.replace('__ORIGIN__', location.origin))
      );
      // A click on the page itself shouldn't run the clipper here (it would
      // clip the clipper page) — nudge to drag instead.
      link.addEventListener('click', function (e) {
        e.preventDefault();
        alert('Zieh den Knopf in deine Lesezeichen-Leiste — von dort aus clippt er jede Seite.');
      });
    }
  })();
</script>

<style>
  .clip-wrap { max-width: 680px; margin: 0 auto; padding: 48px 22px 80px; }
  .clip-kicker { font-size: 11px; letter-spacing: 0.18em; color: var(--k-ink-mute); margin: 0 0 10px; }
  .clip-kicker--steps { margin: 36px 0 10px; }
  .clip-title { font-size: clamp(34px, 7vw, 52px); font-weight: 800; letter-spacing: -0.03em; margin: 0 0 14px; color: var(--k-ink); }
  .clip-lead { font-size: 16px; line-height: 1.6; color: var(--k-ink-soft); margin: 0; max-width: 520px; }
  .clip-steps { margin: 0; padding-left: 22px; font-size: 14px; line-height: 1.7; color: var(--k-ink-soft); }
  .clip-steps li { margin-bottom: 6px; }
  .clip-drag { margin: 30px 0 0; }
  .clip-btn { display: inline-block; font-size: 15px; font-weight: 700; letter-spacing: 0.02em; color: var(--k-paper, #f3ead8); background: var(--k-ink, #1b1a17); border: 1.5px solid var(--k-ink, #1b1a17); border-radius: 999px; padding: 12px 24px; text-decoration: none; box-shadow: 2px 2px 0 var(--k-teal, #3f8f9f); cursor: grab; }
  .clip-note { font-size: 12.5px; line-height: 1.6; color: var(--k-ink-mute); margin: 26px 0 0; max-width: 520px; }
</style>
```

- [ ] **Step 2: Append the docs section**

Append to `src/components/calendar/kiosk/CLAUDE.md` (end of file):

```markdown
## Compose URL prefill + Termin-Clipper (Aug 2026)

`EventComposePageInner.computeInitialValues` accepts `?title=`, `?body=`, `?location=` alongside the drag-select `?from/to/allDay` — ANY prefill param present makes the URL win over the draft store (edit mode still wins over everything). Values are length-capped client-side (title/location 200, body 3000). Consumer: the **Termin-Clipper bookmarklet** on the ungated page `/event-clipper` (`src/pages/event-clipper.astro`) — its `javascript:` href is built at load time from `location.origin` (dev clips into dev, prod into prod), collects og:title/selection/URL plus best-effort JSON-LD Event dates, and opens `/events/create?…`; the login gate's `?redirect=` bounce preserves the query for logged-out members. On-page clicks are intercepted with a drag-me hint (clicking would clip the clipper page itself).
```

- [ ] **Step 3: Browser-gate the page**

(Dev server on 4655 still running from Task 1; restart if needed.)

```bash
curl -s -o /dev/null -w "/event-clipper (no session): %{http_code}\n" http://localhost:4655/event-clipper
playwright-cli goto http://localhost:4655/event-clipper >/dev/null 2>&1; sleep 2
playwright-cli run-code "async (page) => { return await page.evaluate(() => { const a=document.getElementById('clipper-link'); const h=a?a.getAttribute('href'):''; return 'startsJs='+h.startsWith('javascript:')+' | hasOrigin='+decodeURIComponent(h).includes(location.origin+'/events/create')+' | len='+h.length; }); }"
```

Expected: `200` without a session (ungated), `startsJs=true`, `hasOrigin=true`, `len` > 500.

- [ ] **Step 4: End-to-end simulation of a clip**

Simulate exactly what the bookmarklet would produce and verify the compose form receives it (session from Task 1's login is still live in the playwright context; re-login via bounce if not):

```bash
playwright-cli run-code "async (page) => { const p=new URLSearchParams(); p.set('title','Sommerfest am Platz'); p.set('body','Tolles Fest.\n\nQuelle: https://example.org/sommerfest'); p.set('from','2026-09-12'); await page.goto('http://localhost:4655/events/create?'+p.toString()); await page.waitForTimeout(2500); return await page.evaluate(() => { const ins=[...document.querySelectorAll('input,textarea')]; return ['Sommerfest am Platz','2026-09-12','Quelle: https://example.org/sommerfest'].map(t=>t+'='+!!ins.find(i=>String(i.value).includes(t))).join(' | '); }); }"
playwright-cli close >/dev/null 2>&1
fuser -k 4655/tcp
```

Expected: all three `=true`.

- [ ] **Step 5: Verify prod build passes**

Run: `pnpm build`
Expected: build green; no new errors attributable to `event-clipper.astro` or the compose change (type-check baseline ~27 pre-existing errors elsewhere).

- [ ] **Step 6: Commit**

```bash
git add src/pages/event-clipper.astro src/components/calendar/kiosk/CLAUDE.md
git commit -m "feat: Termin-Clipper bookmarklet page at /event-clipper"
```

---

## Post-merge verification (controller, after deploy)

```bash
curl -s -o /dev/null -w "prod /event-clipper: %{http_code}\n" https://mahalle.digital/event-clipper
curl -s https://mahalle.digital/event-clipper | grep -c "Termin-Clipper"
```

Expected: 200 + content present. Real-browser drag test of the bookmarklet is the user's part (desktop browser, any event page — e.g. a Facebook event or venue site).
