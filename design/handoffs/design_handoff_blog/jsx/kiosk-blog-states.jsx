/* global React */

// ══════════════════════════════════════════════════════════
//  KIOSK · BLOG — Rubrik-Seite (desktop) · Novel-Spezifikation
//  (6 Module) · Zustandsmatrix (4 Zustände).
//  Loads AFTER kiosk-blog-mobile.jsx.
// ══════════════════════════════════════════════════════════

const { kiosk: BSK, KioskAnnotate: BsNote, StripedPlaceholder: BsImg, KioskNav: BsNav, KB_POSTS: BS_POSTS, KB_TAGS: BS_TAGS, KB_RUST: BS_RUST, KB_RUST_DEEP: BS_RUST_DEEP, BlPage: BsPage, BlRubrik: BsRubrik, BlMeta: BsMeta, BlLayoutBadge: BsBadge, BlogMasthead: BsMasthead, BlogReadBar: BsReadBar, BlogArchivModule: BsArchiv, BlogContributorCall: BsCall } = window;

// ═══════════════════════════════════════════════════════════
//  RUBRIK-SEITE · /blog/tag/[tag] — statisch generiert
// ═══════════════════════════════════════════════════════════
function BlogTagDesktop({ lang = "DE", tag = "local" }) {
  const posts = BS_POSTS.filter((p) => p.tags.includes(tag));
  return (
    <BsPage minHeight={690}>
      <BsNav active="Blog" lang={lang} />
      <BsMasthead lang={lang} compact />
      <div style={{ padding: "20px 48px 10px", display: "flex", alignItems: "baseline", gap: 14, borderBottom: `1px dashed ${BSK.color.rule}` }}>
        <h1 style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.03em", margin: 0 }}>Rubrik <span style={{ fontFamily: BSK.font.serif, fontStyle: "italic", fontWeight: 400, color: BS_RUST }}>#{tag}</span></h1>
        <span style={{ fontFamily: BSK.font.mono, fontSize: 11, color: BSK.color.inkMute }}>{posts.length} {lang === "DE" ? "BEITRÄGE" : "POSTS"}</span>
        <span style={{ marginLeft: "auto", fontFamily: BSK.font.mono, fontSize: 11, color: BS_RUST_DEEP, border: `1.5px solid ${BS_RUST}`, borderRadius: 999, padding: "4px 12px" }}>✕ {lang === "DE" ? "Rubrik aufheben" : "clear rubric"}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, padding: "24px 48px 10px" }}>
        {posts.map((p) => (
          <div key={p.id}>
            <div style={{ border: BSK.border.ink, borderRadius: BSK.r.lg, overflow: "hidden", boxShadow: BSK.shadow.printSm() }}>
              <BsImg color={p.layout === "gallery" ? BSK.color.moss : BS_RUST} label={p.cover} height={130} />
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "10px 0 0" }}>
              <span style={{ fontFamily: BSK.font.mono, fontSize: 9.5, letterSpacing: "0.12em", color: BS_RUST }}>{p.date.toUpperCase()}</span>
              <BsBadge layout={p.layout} lang={lang} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.015em", lineHeight: 1.15, margin: "5px 0 6px" }}>{p.title}</h3>
            <div style={{ fontSize: 12.5, lineHeight: 1.45, color: BSK.color.inkSoft, marginBottom: 8 }}>{p.desc}</div>
            <BsMeta post={p} lang={lang} />
          </div>
        ))}
      </div>
      <div style={{ margin: "18px 48px 40px", borderTop: `1px dashed ${BSK.color.rule}`, paddingTop: 14, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontFamily: BSK.font.mono, fontSize: 10, letterSpacing: "0.14em", color: BSK.color.inkMute }}>{lang === "DE" ? "ANDERE RUBRIKEN" : "OTHER RUBRICS"}</span>
        {BS_TAGS.filter(([t]) => t !== tag).map(([t, n]) => <BsRubrik key={t} t={t} n={n} small />)}
      </div>
      {lang === "DE" && <BsNote top={230} right={22} color={BSK.color.sky}>Route /blog/tag/[tag] — statisch aus den echten Tags generiert. Kompakter Masthead: die Rubrik führt, das Heft bleibt erkennbar.</BsNote>}
    </BsPage>
  );
}

// ═══════════════════════════════════════════════════════════
//  NOVEL-SPEZIFIKATION — 6 Module mit Anatomie + Logik
// ═══════════════════════════════════════════════════════════
function BsModule({ no, title, children, notes }) {
  return (
    <div style={{ border: BSK.border.inkBold, borderRadius: BSK.r.lg, background: BSK.color.paperWarm, boxShadow: BSK.shadow.print(), padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, borderBottom: `2px solid ${BSK.color.ink}`, paddingBottom: 8 }}>
        <span style={{ fontFamily: BSK.font.mono, fontSize: 11, fontWeight: 500, color: BSK.color.paper, background: BS_RUST, border: `1px solid ${BSK.color.ink}`, borderRadius: 4, padding: "1px 7px" }}>§{no}</span>
        <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.015em" }}>{title}</span>
      </div>
      <div style={{ position: "relative" }}>{children}</div>
      <ul style={{ margin: 0, paddingLeft: 16, fontFamily: BSK.font.mono, fontSize: 9.5, lineHeight: 1.65, color: BSK.color.inkSoft }}>
        {notes.map((n, i) => <li key={i}>{n}</li>)}
      </ul>
    </div>
  );
}
function BlogNovelDesktop({ lang = "DE" }) {
  return (
    <BsPage minHeight={1170}>
      <div style={{ padding: "34px 48px 40px" }}>
        <div style={{ fontFamily: BSK.font.mono, fontSize: 11, letterSpacing: "0.18em", color: BS_RUST }}>BLOG · NOVEL-MODULE · 6 / 6 GEWÜNSCHT</div>
        <h1 style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 0.95, margin: "8px 0 6px" }}>Was die Beilage <span style={{ fontFamily: BSK.font.serif, fontStyle: "italic", fontWeight: 400, color: BS_RUST }}>lebendig</span> macht</h1>
        <div style={{ fontFamily: BSK.font.serif, fontStyle: "italic", fontSize: 16, color: BSK.color.inkSoft, marginBottom: 24 }}>Alle sechs Module ohne neues Backend — abgeleitet, vorbefüllt oder gedruckt.</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
          <BsModule no="01" title="Lesezeit + Lesefaden" notes={["Lesezeit: Wortzahl des MDX-Bodys / 200 wpm, beim Build berechnet", "Balken = Scrollposition, sticky Leiste, Rost auf paperSoft", "100 % ⇒ „gelesen ✓“ — nur Anzeige, nichts wird gespeichert", "reduced-motion: unverändert (scrollgebunden, keine Eigenanimation)"]}>
            <BsReadBar lang={lang} title="The Cafe Guide…" progress={0.42} min={6} />
          </BsModule>
          <BsModule no="02" title="Rubrik-Rail (verwandte Beiträge)" notes={["Rang = Anzahl geteilter Tags · ohne den aktuellen Beitrag · max 3", "0 gemeinsame Tags ⇒ Auffüllen mit den neuesten Beiträgen", "reine Build-Zeit-Logik über die Content Collection — kein API-Call"]}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[["Your Guide to the Weekly Kiez Market", "GEMEINSAM: #local #food"], ["A Visual Tour of Our Neighborhood", "GEMEINSAM: #local"]].map(([t, s]) => (
                <div key={t} style={{ border: BSK.border.ink, borderRadius: BSK.r.md, background: BSK.color.paper, padding: "10px 12px" }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.2 }}>{t}</div>
                  <div style={{ fontFamily: BSK.font.mono, fontSize: 8.5, color: BS_RUST_DEEP, marginTop: 5 }}>{s}</div>
                </div>
              ))}
            </div>
          </BsModule>
          <BsModule no="03" title="Archiv nach Monat" notes={["Monatsgruppen beim Build aus pubDate abgeleitet — null Schema, null API", "Klick = clientseitig gefilterte Liste (gleicher Mechanismus wie Rubrik-Filter)", "wächst ehrlich mit: bei 6 Posts vier Zeilen, nie leeres Gerüst"]}>
            <BsArchiv lang={lang} activeMonth="JAN 2025" />
          </BsModule>
          <BsModule no="04" title="„Im Forum besprechen“" notes={["öffnet /topics/create vorbefüllt: Titel „Beilage: …“ + Link auf den Beitrag", "nichts wird automatisch gepostet — zählt regulär zu den 5 Beiträgen/Tag", "Wein = Forum-Akzent: die Brücke ist farblich als Forum markiert", "durchläuft normal die AI-Moderation wie jedes Thema"]}>
            <div style={{ border: BSK.border.inkBold, borderRadius: BSK.r.md, background: BSK.color.paper, padding: "12px 16px", display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontSize: 14, fontWeight: 800 }}>Und was sagst <i style={{ fontFamily: BSK.font.serif, fontWeight: 400, color: BSK.color.wine }}>du</i> dazu?</span>
              <span style={{ marginLeft: "auto", padding: "8px 16px", background: BSK.color.wine, color: BSK.color.paper, border: BSK.border.ink, borderRadius: 999, fontSize: 12.5, fontWeight: 700, boxShadow: BSK.shadow.printSm() }}>Im Forum besprechen →</span>
            </div>
          </BsModule>
          <BsModule no="05" title="Druckbogen (A4)" notes={["Print-CSS auf der Artikel-Route — @media print, kein eigener Endpoint", "2-Farb-Riso: Ink + Rost · Serif-Satz · Bilder als Rahmen mit Unterschrift", "Fußzeile Pflicht: Stand-Datum + QR (lokal generiert) auf /blog/[slug]", "gleiches Rezept wie Kiez-Daten §03 + Profil-Steckbrief — dritte Druck-Fläche"]}>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ width: 150, height: 210, background: "#fdfaf2", border: BSK.border.ink, boxShadow: BSK.shadow.printSm(), padding: "12px 12px", flexShrink: 0 }}>
                <div style={{ fontFamily: BSK.font.mono, fontSize: 5.5, letterSpacing: "0.16em", color: BSK.color.inkMute }}>DIE BEILAGE · SCHILLERKIEZ KURIER</div>
                <div style={{ fontSize: 11, fontWeight: 800, lineHeight: 1.1, margin: "5px 0 4px" }}>The Cafe Guide: Where Schillerkiez Gets Its Coffee</div>
                <div style={{ height: 2, background: BS_RUST, width: 30, marginBottom: 5 }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 2.5 }}>{Array.from({ length: 11 }).map((_, i) => <div key={i} style={{ height: 2.5, background: BSK.color.ink, opacity: 0.22, width: `${[98, 94, 97, 90, 96, 92, 98, 88, 95, 91, 60][i]}%` }} />)}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 10 }}>
                  <div style={{ fontFamily: BSK.font.mono, fontSize: 5, color: BSK.color.inkMute }}>STAND: 8. APR 2025<br />mahalle.berlin/blog/…</div>
                  <div style={{ width: 22, height: 22, border: `1.5px solid ${BSK.color.ink}`, background: `repeating-linear-gradient(90deg, ${BSK.color.ink} 0 2px, transparent 2px 4px)` }} />
                </div>
              </div>
              <div style={{ fontFamily: BSK.font.mono, fontSize: 9.5, lineHeight: 1.7, color: BSK.color.inkSoft }}>A4 hoch · Ränder 18 mm<br />Kopf: Heft-Zeile + Titel + Rost-Regel<br />Satz: einspaltig Serif 11 pt<br />Chrome (Nav, CTAs, Rail): display:none<br />Fuß: Stand + QR → Artikel</div>
            </div>
          </BsModule>
          <BsModule no="06" title="„Schreib für den Kiez“" notes={["ehrlich zur Realität: KEIN Upload-Pfad, Beiträge kommen übers Repo", "CTA = vorbereitetes Forum-Thema mit #blogidee — Redaktion liest mit", "Modul steht im Seitenrand des Index — Aufruf, nicht Versprechen"]}>
            <BsCall lang={lang} />
          </BsModule>
        </div>
      </div>
    </BsPage>
  );
}

// ═══════════════════════════════════════════════════════════
//  ZUSTANDSMATRIX — 4 Zustände (statische Fläche = kleine Matrix)
// ═══════════════════════════════════════════════════════════
function BsStateTile({ no, title, note, children }) {
  return (
    <div style={{ border: BSK.border.inkBold, borderRadius: BSK.r.lg, background: BSK.color.paper, boxShadow: BSK.shadow.print(), overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "10px 16px", borderBottom: `2px solid ${BSK.color.ink}`, background: BSK.color.paperWarm }}>
        <span style={{ fontFamily: BSK.font.mono, fontSize: 10.5, fontWeight: 500, color: BS_RUST }}>{no}</span>
        <span style={{ fontSize: 14.5, fontWeight: 800 }}>{title}</span>
      </div>
      <div style={{ padding: "18px 16px" }}>{children}</div>
      <div style={{ padding: "9px 16px 12px", fontFamily: BSK.font.mono, fontSize: 9, lineHeight: 1.6, color: BSK.color.inkMute, borderTop: `1px dashed ${BSK.color.rule}` }}>{note}</div>
    </div>
  );
}
function BlogStatesDesktop({ lang = "DE" }) {
  return (
    <BsPage minHeight={750}>
      <div style={{ padding: "34px 48px 40px" }}>
        <div style={{ fontFamily: BSK.font.mono, fontSize: 11, letterSpacing: "0.18em", color: BS_RUST }}>BLOG · ZUSTANDSMATRIX · 4 ZUSTÄNDE</div>
        <h1 style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.03em", margin: "8px 0 4px" }}>Wenn die Beilage <span style={{ fontFamily: BSK.font.serif, fontStyle: "italic", fontWeight: 400, color: BS_RUST }}>dünn</span> ist</h1>
        <div style={{ fontFamily: BSK.font.serif, fontStyle: "italic", fontSize: 15, color: BSK.color.inkSoft, marginBottom: 22 }}>Statische Fläche, kleine Matrix — kein Laden, kein Fehler, kein Netz-Zustand nötig.</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
          <BsStateTile no="01 · LEER" title="Noch keine Beiträge" note="Content Collection leer beim Build ⇒ Masthead bleibt, Karte erklärt. Kein Spinner — statisch heißt: dieser Zustand existiert nur vor der ersten Ausgabe.">
            <div style={{ textAlign: "center", border: `1.5px dashed ${BSK.color.rule}`, borderRadius: BSK.r.md, padding: "26px 20px" }}>
              <div style={{ fontSize: 30 }}>⏳</div>
              <div style={{ fontSize: 17, fontWeight: 800, margin: "6px 0 4px" }}>Die erste Ausgabe ist noch im Druck.</div>
              <div style={{ fontSize: 12.5, color: BSK.color.inkSoft }}>Die Redaktion schreibt — schau bald wieder vorbei.</div>
            </div>
          </BsStateTile>
          <BsStateTile no="02 · SUCHE" title="Keine Treffer" note="Live-Suche (BlogSearch.svelte) über Titel/Beschreibung/Tags. Rubriken bleiben sichtbar — ein Klick daneben ist der Ausweg. Reset stellt die volle Liste wieder her.">
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: BSK.color.paperSoft, border: `1.5px solid ${BSK.color.ink}`, borderRadius: BSK.r.md, padding: "8px 12px", marginBottom: 12 }}>
              <span style={{ fontSize: 13, opacity: 0.5 }}>⌕</span><span style={{ fontSize: 13, fontWeight: 600 }}>ubahn</span><span style={{ marginLeft: "auto", fontFamily: BSK.font.mono, fontSize: 10, color: BSK.color.inkMute }}>✕</span>
            </div>
            <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
              <div style={{ fontSize: 15.5, fontWeight: 800 }}>Nichts gefunden zu <span style={{ fontFamily: BSK.font.serif, fontStyle: "italic", color: BS_RUST }}>„ubahn“</span></div>
              <div style={{ fontSize: 12, color: BSK.color.inkSoft, margin: "4px 0 10px" }}>0 von 6 Beiträgen — probier eine Rubrik:</div>
              <div style={{ display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap" }}>{BS_TAGS.slice(0, 4).map(([t, n]) => <BsRubrik key={t} t={t} n={n} small />)}</div>
            </div>
          </BsStateTile>
          <BsStateTile no="03 · RUBRIK" title="Leere Rubrik" note="Regulär unerreichbar — Tag-Seiten werden nur aus echten Tags generiert. Fängt veraltete Links ab (Tag entfernt, Beitrag depubliziert). Zurück-Pfad statt Sackgasse.">
            <div style={{ textAlign: "center", border: `1.5px dashed ${BSK.color.rule}`, borderRadius: BSK.r.md, padding: "22px 20px" }}>
              <div style={{ fontSize: 17, fontWeight: 800 }}>Rubrik <span style={{ fontFamily: BSK.font.serif, fontStyle: "italic", color: BS_RUST }}>#verkehr</span> ist (noch) leer.</div>
              <div style={{ fontSize: 12.5, color: BSK.color.inkSoft, margin: "5px 0 12px" }}>Hier hat die Redaktion noch nichts abgelegt.</div>
              <span style={{ fontFamily: BSK.font.mono, fontSize: 11, padding: "7px 16px", border: `1.5px solid ${BSK.color.ink}`, borderRadius: 999 }}>‹ zur Beilage</span>
            </div>
          </BsStateTile>
          <BsStateTile no="04 · ENTWURF" title="draft: true bleibt unsichtbar" note="Frontmatter draft:true ⇒ beim Build gefiltert: keine Route, kein Suchtreffer, kein Archiv-Eintrag, keine Rubrik-Zählung. Sichtbar nur lokal im Dev-Modus (Astro-Standard).">
            <div style={{ position: "relative", border: `1.5px dashed ${BS_RUST}`, borderRadius: BSK.r.md, padding: "14px 16px", opacity: 0.75 }}>
              <div style={{ position: "absolute", top: -10, right: 14, fontFamily: BSK.font.mono, fontSize: 9, letterSpacing: "0.12em", background: BS_RUST, color: BSK.color.paper, border: `1px solid ${BSK.color.ink}`, borderRadius: 3, padding: "2px 8px", transform: "rotate(2deg)" }}>ENTWURF · NICHT IM BUILD</div>
              <div style={{ fontFamily: BSK.font.mono, fontSize: 9, color: BS_RUST }}>MAI 2025 · draft: true</div>
              <div style={{ fontSize: 15, fontWeight: 700, textDecoration: "line-through", textDecorationColor: BS_RUST, margin: "4px 0 3px" }}>Kiez Sports Clubs: A Field Guide</div>
              <div style={{ fontSize: 11.5, color: BSK.color.inkSoft }}>Draft in progress — where the neighborhood plays…</div>
            </div>
          </BsStateTile>
        </div>
      </div>
    </BsPage>
  );
}

Object.assign(window, { BlogTagDesktop, BlogNovelDesktop, BlogStatesDesktop });
