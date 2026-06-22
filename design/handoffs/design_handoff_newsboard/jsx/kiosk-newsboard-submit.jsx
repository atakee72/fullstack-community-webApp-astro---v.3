/* global React, kiosk, kioskFonts, paperGrainStyle, KioskBtn, KioskInput, KioskTextarea, news, TODAY, SektionTag, SourceChip */

// ══════════════════════════════════════════════════════════
//  KIOSK · NEWSBOARD · SUBMIT FLOW
//  User-submitted news (5/day limit, AI-moderated before
//  appearing in feed). Three stages: blank · filled · pending.
//  + mobile.
//  Note: AI-fetched articles bypass this flow entirely — only
//  user submissions enter the moderation queue.
// ══════════════════════════════════════════════════════════

// ─── Quota indicator (5/day) ───
function QuotaIndicator({ used = 1, lang = "DE" }) {
  const max = 5;
  const remaining = max - used;
  return (
    <div style={{
      padding: "10px 12px",
      background: kiosk.color.paperSoft,
      border: `1px solid ${kiosk.color.rule}`,
      borderRadius: kiosk.r.sm,
      display: "flex", alignItems: "center", gap: 12,
    }}>
      <div style={{ display: "flex", gap: 3 }}>
        {Array.from({ length: max }).map((_, i) => (
          <div key={i} style={{
            width: 14, height: 18,
            background: i < used ? kiosk.color.ink : "transparent",
            border: `1px solid ${kiosk.color.ink}`,
            borderRadius: 2,
          }} />
        ))}
      </div>
      <div>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.ink, letterSpacing: "0.1em" }}>
          {used} / {max} {lang === "DE" ? "EINREICHUNGEN HEUTE" : "SUBMISSIONS TODAY"}
        </div>
        <div style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 11.5, color: kiosk.color.inkSoft }}>
          {remaining > 0
            ? (lang === "DE" ? `${remaining} verbleibend · Reset um Mitternacht` : `${remaining} remaining · resets at midnight`)
            : (lang === "DE" ? "Limit erreicht · morgen wieder" : "limit reached · back tomorrow")}
        </div>
      </div>
    </div>
  );
}

// ─── Field label + input row ───
function Field({ label, hint, children, required = false }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.ink, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700 }}>
          {label}
        </span>
        {required && <span style={{ fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.wine, letterSpacing: "0.06em" }}>· {label.toLowerCase().includes("pflicht") ? "" : "pflicht"}</span>}
        <div style={{ flex: 1 }} />
        {hint && <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 11, color: kiosk.color.inkMute }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

// ─── Sektion radio picker (visual chips) ───
function SektionPicker({ active, lang = "DE" }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {Object.keys(news.sektion).map((k) => (
        <span key={k} style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: "5px 10px", fontSize: 12.5, fontWeight: 600,
          background: k === active ? news.sektion[k].color : "transparent",
          color: k === active ? news.sektion[k].textOn : kiosk.color.ink,
          border: kiosk.border.ink, borderRadius: kiosk.r.pill,
          fontFamily: kiosk.font.display,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: news.sektion[k].color, border: k === active ? `1px solid ${news.sektion[k].textOn}` : "none" }} />
          {lang === "DE" ? news.sektion[k].de : news.sektion[k].en}
        </span>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Compose · blank
// ═══════════════════════════════════════════════════════════════════

function NewsSubmitBlank({ lang = "DE" }) {
  return (
    <div style={{ width: 1280, background: kiosk.color.paper, color: kiosk.color.ink, fontFamily: kiosk.font.display, position: "relative", minHeight: "100%" }}>
      <style>{kioskFonts}</style>
      <div style={paperGrainStyle} />
      <div style={{ position: "relative" }}>
        <window.KioskNav active="News" lang={lang} />
        <div style={{ padding: "14px 36px", display: "flex", alignItems: "center", gap: 8, borderBottom: `1px dashed ${kiosk.color.rule}`, fontFamily: kiosk.font.mono, fontSize: 11 }}>
          <span style={{ color: kiosk.color.inkSoft, textDecoration: "underline dashed", textUnderlineOffset: 3 }}>← {lang === "DE" ? "zurück zum Feed" : "back to feed"}</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 36, padding: "30px 36px 50px" }}>
          {/* Form */}
          <div>
            <div style={{ fontFamily: kiosk.font.mono, fontSize: 11, color: kiosk.color.ink, letterSpacing: "0.16em", marginBottom: 6 }}>
              NEWS EINREICHEN
            </div>
            <h1 style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1, margin: "0 0 10px" }}>
              {lang === "DE" ? <>Eine Nachricht aus dem <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400 }}>Kiez</span>.</>
                             : <>News from the <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400 }}>Kiez</span>.</>}
            </h1>
            <p style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 16, color: kiosk.color.inkSoft, margin: "0 0 22px", maxWidth: "55ch" }}>
              {lang === "DE"
                ? "Etwas, das wir wissen sollten? Eine Initiative, ein Bauprojekt, ein neues Café. Was nicht in den Nachrichten steht, aber im Kiez wichtig ist."
                : "Something we should know about? An initiative, a construction project, a new café. What's not in the news but matters here."}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              <Field label={lang === "DE" ? "Überschrift" : "Headline"} required hint={lang === "DE" ? "klar, konkret · max. 100 Zeichen" : "clear, concrete · max 100 chars"}>
                <KioskInput placeholder={lang === "DE" ? "Worum geht's?" : "What's it about?"} />
              </Field>

              <Field label={lang === "DE" ? "Kurzbeschreibung · Dek" : "Short description · dek"} hint={lang === "DE" ? "1–2 Sätze · optional" : "1–2 sentences · optional"}>
                <KioskTextarea placeholder={lang === "DE" ? "Worum geht's genauer? Ein Satz, der die Überschrift ergänzt." : "What is it about more specifically? One sentence supporting the headline."} />
              </Field>

              <Field label={lang === "DE" ? "Sektion" : "Section"} required hint={lang === "DE" ? "wo gehört's hin?" : "where does it belong?"}>
                <SektionPicker lang={lang} />
              </Field>

              <Field label={lang === "DE" ? "Inhalt · Hauptteil" : "Content · body"} required hint={lang === "DE" ? "min. 200 Zeichen" : "min 200 chars"}>
                <KioskTextarea placeholder={lang === "DE" ? "Was ist passiert? Wer ist beteiligt? Was kommt als Nächstes?" : "What happened? Who's involved? What comes next?"} />
              </Field>

              <Field label={lang === "DE" ? "Quelle · Link (optional)" : "Source · link (optional)"} hint={lang === "DE" ? "Pressemitteilung, Webseite, etc." : "press release, website, etc."}>
                <KioskInput placeholder="https://" icon="↗" />
              </Field>

              <Field label={lang === "DE" ? "Bild · Foto (optional)" : "Image · photo (optional)"} hint={lang === "DE" ? "max. 5 MB · JPG / PNG" : "max 5 MB · JPG / PNG"}>
                <div style={{
                  padding: "20px 12px", textAlign: "center",
                  background: kiosk.color.paperSoft,
                  border: `1.5px dashed ${kiosk.color.rule}`,
                  borderRadius: kiosk.r.md,
                  fontFamily: kiosk.font.mono, fontSize: 11, color: kiosk.color.inkMute, letterSpacing: "0.06em",
                }}>
                  + {lang === "DE" ? "Foto hierher ziehen oder klicken" : "drop photo here or click"}
                </div>
              </Field>
            </div>

            <div style={{ marginTop: 28, display: "flex", gap: 8, alignItems: "center" }}>
              <KioskBtn>{lang === "DE" ? "zur prüfung einreichen →" : "submit for review →"}</KioskBtn>
              <KioskBtn variant="ghost">{lang === "DE" ? "abbrechen" : "cancel"}</KioskBtn>
              <div style={{ flex: 1 }} />
              <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, letterSpacing: "0.06em" }}>0 / 100 · 0 / 200</span>
            </div>
          </div>

          {/* Side rail */}
          <aside style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <QuotaIndicator used={1} lang={lang} />
            <div style={{
              padding: 14,
              background: kiosk.color.paperWarm,
              border: `1.5px solid ${kiosk.color.ink}`,
              borderRadius: kiosk.r.md,
            }}>
              <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.ink, letterSpacing: "0.12em", marginBottom: 8 }}>
                {lang === "DE" ? "WAS WIR ANNEHMEN" : "WHAT WE ACCEPT"}
              </div>
              <ul style={{ margin: 0, padding: "0 0 0 18px", fontFamily: kiosk.font.display, fontSize: 13, color: kiosk.color.ink, lineHeight: 1.5 }}>
                <li>{lang === "DE" ? "Lokale Bauprojekte, Initiativen" : "Local construction, initiatives"}</li>
                <li>{lang === "DE" ? "Termine, die andere wissen sollten" : "Events others should know about"}</li>
                <li>{lang === "DE" ? "Politische Entscheidungen mit Kiez-Bezug" : "Political decisions affecting the Kiez"}</li>
                <li>{lang === "DE" ? "Wichtige Veränderungen" : "Important changes"}</li>
              </ul>
            </div>
            <div style={{
              padding: 14,
              background: kiosk.color.paperSoft,
              border: `1px dashed ${kiosk.color.danger}`,
              borderRadius: kiosk.r.md,
            }}>
              <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.danger, letterSpacing: "0.12em", marginBottom: 8 }}>
                {lang === "DE" ? "NICHT ANGENOMMEN" : "NOT ACCEPTED"}
              </div>
              <ul style={{ margin: 0, padding: "0 0 0 18px", fontFamily: kiosk.font.display, fontSize: 13, color: kiosk.color.inkSoft, lineHeight: 1.5 }}>
                <li>{lang === "DE" ? "Werbung & Eigenwerbung" : "Ads & self-promotion"}</li>
                <li>{lang === "DE" ? "Meinungsbeiträge (→ Forum)" : "Opinion pieces (→ Forum)"}</li>
                <li>{lang === "DE" ? "Veranstaltungen (→ Kalender)" : "Events (→ Calendar)"}</li>
                <li>{lang === "DE" ? "Marktplatz-Artikel (→ Markt)" : "Marketplace items (→ Markt)"}</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Compose · filled (ready to submit)
// ═══════════════════════════════════════════════════════════════════

function NewsSubmitFilled({ lang = "DE", submitting = false }) {
  return (
    <div style={{ width: 1280, background: kiosk.color.paper, color: kiosk.color.ink, fontFamily: kiosk.font.display, position: "relative", minHeight: "100%" }}>
      <style>{kioskFonts}</style>
      <div style={paperGrainStyle} />
      <div style={{ position: "relative" }}>
        <window.KioskNav active="News" lang={lang} />
        <div style={{ padding: "14px 36px", display: "flex", alignItems: "center", gap: 8, borderBottom: `1px dashed ${kiosk.color.rule}`, fontFamily: kiosk.font.mono, fontSize: 11 }}>
          <span style={{ color: kiosk.color.inkSoft, textDecoration: "underline dashed", textUnderlineOffset: 3 }}>← {lang === "DE" ? "zurück zum Feed" : "back to feed"}</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 36, padding: "30px 36px 50px" }}>
          <div>
            <div style={{ fontFamily: kiosk.font.mono, fontSize: 11, color: kiosk.color.ink, letterSpacing: "0.16em", marginBottom: 6 }}>NEWS EINREICHEN</div>
            <h1 style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1, margin: "0 0 22px" }}>
              {lang === "DE" ? <>Eine Nachricht aus dem <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400 }}>Kiez</span>.</>
                             : <>News from the <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400 }}>Kiez</span>.</>}
            </h1>

            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              <Field label={lang === "DE" ? "Überschrift" : "Headline"} required hint="63 / 100">
                <KioskInput value={lang === "DE" ? "Hasenheide: neue Spielgeräte am Spielplatz Süd ab Juni" : "Hasenheide: new playground equipment at south playground from June"} focused />
              </Field>

              <Field label={lang === "DE" ? "Kurzbeschreibung · Dek" : "Short description · dek"}>
                <div style={{ padding: 10, background: kiosk.color.paperSoft, border: `1px solid ${kiosk.color.rule}`, borderRadius: kiosk.r.md, fontSize: 14, color: kiosk.color.ink, lineHeight: 1.4, fontFamily: kiosk.font.display }}>
                  {lang === "DE"
                    ? "Bezirksamt hat Lieferung der neuen Klettergerüste für den 4. Juni bestätigt. Aufbau dauert vermutlich eine Woche."
                    : "District office has confirmed delivery of new climbing equipment for June 4. Construction expected to take about a week."}
                </div>
              </Field>

              <Field label={lang === "DE" ? "Sektion" : "Section"} required>
                <SektionPicker active="lokales" lang={lang} />
              </Field>

              <Field label={lang === "DE" ? "Inhalt · Hauptteil" : "Content · body"} required hint="287 / 200 ✓">
                <div style={{ padding: 12, background: kiosk.color.paperSoft, border: `1px solid ${kiosk.color.rule}`, borderRadius: kiosk.r.md, fontSize: 14, color: kiosk.color.ink, lineHeight: 1.55, fontFamily: kiosk.font.display }}>
                  {lang === "DE"
                    ? "Das Bezirksamt Neukölln hat die Lieferung der bestellten neuen Spielgeräte für den Spielplatz Hasenheide-Süd auf den 4. Juni 2026 terminiert. Geplant sind eine größere Kletterstruktur, zwei neue Schaukeln und eine Niedrigseil-Anlage. Die Sanierung wurde 2024 nach Initiative des Nachbarschaftshauses Centrum beschlossen. Während der Aufbauphase ist der südliche Teil des Spielplatzes für ca. eine Woche gesperrt."
                    : "The Neukölln district office has scheduled delivery of the ordered new playground equipment for Hasenheide South playground on June 4, 2026. Plans include a larger climbing structure, two new swings, and a low-rope course. The renovation was decided in 2024 following an initiative by Nachbarschaftshaus Centrum. During the construction phase, the southern part of the playground will be closed for approximately one week."}
                </div>
              </Field>

              <Field label={lang === "DE" ? "Quelle · Link" : "Source · link"}>
                <KioskInput value="berlin.de/ba-neukoelln/.../hasenheide-spielplatz" icon="↗" />
              </Field>

              <Field label={lang === "DE" ? "Bild" : "Image"}>
                <div style={{
                  padding: "12px 14px",
                  background: kiosk.color.paperWarm,
                  border: `1px solid ${kiosk.color.ink}`,
                  borderRadius: kiosk.r.md,
                  display: "flex", alignItems: "center", gap: 12,
                }}>
                  <div style={{ width: 80, height: 60, background: `repeating-linear-gradient(45deg, ${kiosk.color.ink}30 0 8px, ${kiosk.color.paper} 8px 16px)`, border: kiosk.border.ink, borderRadius: 4 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: kiosk.font.display, fontSize: 13, fontWeight: 600 }}>spielplatz-hasenheide.jpg</div>
                    <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute }}>1.8 MB · 1600×1200</div>
                  </div>
                  <KioskBtn small variant="ghost">{lang === "DE" ? "entfernen" : "remove"}</KioskBtn>
                </div>
              </Field>
            </div>

            <div style={{ marginTop: 28, display: "flex", gap: 8, alignItems: "center" }}>
              {submitting ? (
                <button disabled style={{
                  background: kiosk.color.inkMute, color: kiosk.color.paper,
                  fontFamily: kiosk.font.display, fontSize: 14, fontWeight: 700,
                  padding: "10px 18px", borderRadius: kiosk.r.pill,
                  border: `1.5px solid ${kiosk.color.inkMute}`,
                  boxShadow: kiosk.shadow.print(kiosk.color.wine),
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", border: `2px solid ${kiosk.color.paper}`, borderTopColor: "transparent" }} />
                  {lang === "DE" ? "wird eingereicht…" : "submitting…"}
                </button>
              ) : (
                <KioskBtn>{lang === "DE" ? "zur prüfung einreichen →" : "submit for review →"}</KioskBtn>
              )}
              <KioskBtn variant="ghost">{lang === "DE" ? "abbrechen" : "cancel"}</KioskBtn>
            </div>
          </div>

          <aside style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <QuotaIndicator used={1} lang={lang} />
            {/* Preview card — how it will look in the feed */}
            <div style={{
              padding: 14,
              background: kiosk.color.paperWarm,
              border: `1.5px solid ${kiosk.color.ink}`,
              borderRadius: kiosk.r.md,
              boxShadow: kiosk.shadow.printSm(),
            }}>
              <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.ink, letterSpacing: "0.12em", marginBottom: 8 }}>
                {lang === "DE" ? "VORSCHAU · IM FEED" : "PREVIEW · IN FEED"}
              </div>
              <div style={{ display: "flex", gap: 5, marginBottom: 6 }}>
                <SektionTag id="lokales" lang={lang} mini />
                <SourceChip id="user" lang={lang} mini />
              </div>
              <div style={{ fontFamily: kiosk.font.display, fontSize: 14, fontWeight: 700, lineHeight: 1.2, marginBottom: 4 }}>
                {lang === "DE" ? "Hasenheide: neue Spielgeräte am Spielplatz Süd ab Juni" : "Hasenheide: new playground equipment from June"}
              </div>
              <div style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 12, color: kiosk.color.inkSoft, lineHeight: 1.4 }}>
                {lang === "DE" ? "Bezirksamt hat Lieferung der neuen Klettergerüste für den 4. Juni bestätigt." : "District office confirmed delivery of new climbing equipment for June 4."}
              </div>
              <div style={{ fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.inkMute, marginTop: 8, letterSpacing: "0.06em" }}>
                eingereicht von Eda A. · {lang === "DE" ? "wird angezeigt nach Freigabe" : "shown after approval"}
              </div>
            </div>

            <div style={{ padding: "10px 12px", background: kiosk.color.paperSoft, border: `1px dashed ${kiosk.color.rule}`, borderRadius: kiosk.r.sm, fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute, lineHeight: 1.55, letterSpacing: "0.04em" }}>
              ↳ {lang === "DE"
                ? "Nach dem Absenden läuft AI-Moderation (Profanität / Hass / Spam / Werbung). Freigabe in der Regel < 5 Min."
                : "After submission, AI moderation runs (profanity / hate / spam / promotion). Approval usually < 5 min."}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Mobile compose
// ═══════════════════════════════════════════════════════════════════

function NewsSubmitMobile({ lang = "DE" }) {
  return (
    <div style={{ width: 390, height: 844, background: kiosk.color.paper, color: kiosk.color.ink, fontFamily: kiosk.font.display, position: "relative", overflow: "hidden" }}>
      <style>{kioskFonts}</style>
      <div style={paperGrainStyle} />
      <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column" }}>
        <header style={{ padding: "10px 16px 8px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px dashed ${kiosk.color.rule}` }}>
          <span style={{ fontFamily: kiosk.font.mono, fontSize: 11, color: kiosk.color.inkSoft, textDecoration: "underline dashed", textUnderlineOffset: 3 }}>← {lang === "DE" ? "abbrechen" : "cancel"}</span>
          <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.ink, fontWeight: 700, letterSpacing: "0.12em" }}>{lang === "DE" ? "EINREICHEN" : "SUBMIT"}</span>
          <KioskBtn small>{lang === "DE" ? "senden" : "send"}</KioskBtn>
        </header>

        <div style={{ flex: 1, overflow: "hidden", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
          <QuotaIndicator used={1} lang={lang} />

          <Field label={lang === "DE" ? "Überschrift" : "Headline"} required>
            <KioskInput value={lang === "DE" ? "Hasenheide: neue Spielgeräte" : "Hasenheide: new equipment"} focused />
          </Field>

          <Field label={lang === "DE" ? "Sektion" : "Section"} required>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {["lokales","politik","klima"].map((k) => (
                <span key={k} style={{
                  padding: "4px 10px", fontSize: 11.5, fontWeight: 600,
                  background: k === "lokales" ? news.sektion[k].color : "transparent",
                  color: k === "lokales" ? news.sektion[k].textOn : kiosk.color.ink,
                  border: kiosk.border.ink, borderRadius: kiosk.r.pill,
                }}>{lang === "DE" ? news.sektion[k].de : news.sektion[k].en}</span>
              ))}
            </div>
          </Field>

          <Field label={lang === "DE" ? "Inhalt" : "Content"} required hint="287/200 ✓">
            <div style={{ padding: 10, background: kiosk.color.paperSoft, border: `1px solid ${kiosk.color.rule}`, borderRadius: kiosk.r.md, fontSize: 13, color: kiosk.color.ink, lineHeight: 1.5, maxHeight: 110, overflow: "hidden" }}>
              {lang === "DE"
                ? "Das Bezirksamt Neukölln hat die Lieferung der bestellten neuen Spielgeräte für den Spielplatz Hasenheide-Süd auf den 4. Juni 2026 terminiert…"
                : "The Neukölln district office has scheduled delivery of new playground equipment for June 4, 2026…"}
            </div>
          </Field>

          <Field label={lang === "DE" ? "Bild" : "Image"}>
            <div style={{
              padding: "10px 12px",
              background: kiosk.color.paperWarm,
              border: `1px solid ${kiosk.color.ink}`,
              borderRadius: kiosk.r.md,
              display: "flex", alignItems: "center", gap: 10, fontSize: 12,
            }}>
              <div style={{ width: 50, height: 38, background: `repeating-linear-gradient(45deg, ${kiosk.color.ink}30 0 6px, ${kiosk.color.paper} 6px 12px)`, border: kiosk.border.ink, borderRadius: 3 }} />
              <span style={{ fontFamily: kiosk.font.mono, fontSize: 10 }}>spielplatz.jpg · 1.8 MB</span>
            </div>
          </Field>

          <div style={{ padding: "8px 10px", background: kiosk.color.paperSoft, border: `1px dashed ${kiosk.color.rule}`, borderRadius: kiosk.r.sm, fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.inkMute, lineHeight: 1.5, letterSpacing: "0.04em" }}>
            ↳ {lang === "DE"
              ? "AI-Moderation läuft nach Absenden. Freigabe < 5 Min."
              : "AI moderation runs after submit. Approval < 5 min."}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  NewsSubmitBlank, NewsSubmitFilled, NewsSubmitMobile,
});
