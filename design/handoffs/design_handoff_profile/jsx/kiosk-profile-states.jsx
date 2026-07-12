/* global React */

// ══════════════════════════════════════════════════════════
//  PROFILE PASS · state matrix
//  10 states in 3 groups: Anzeige (laden / leer / nicht
//  gefunden) · Bearbeiten (speichert / Fehler / Avatar lädt /
//  Avatar-Fehler) · Konto (E-Mail-Wechsel ausstehend /
//  gesperrt / abgemeldet).
// ══════════════════════════════════════════════════════════

function PStateTile({ n, title, note, children, tall = false, accent = PROFILE_ACCENT }) {
  return (
    <div style={{ background: kiosk.color.paperWarm, border: kiosk.border.ink, borderRadius: kiosk.r.lg, boxShadow: kiosk.shadow.printSm(), overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "10px 14px", borderBottom: `1px dashed ${kiosk.color.rule}`, display: "flex", gap: 8, alignItems: "baseline" }}>
        <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: accent, fontWeight: 600 }}>§{n}</span>
        <span style={{ fontFamily: kiosk.font.display, fontSize: 13.5, fontWeight: 800 }}>{title}</span>
      </div>
      <div style={{ flex: 1, padding: 14, minHeight: tall ? 210 : 170, display: "flex", flexDirection: "column", gap: 8, justifyContent: "center" }}>
        {children}
      </div>
      <div style={{ padding: "9px 14px", borderTop: `1px dashed ${kiosk.color.rule}`, fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkSoft, lineHeight: 1.55 }}>{note}</div>
    </div>
  );
}

function PGroupHead({ children }) {
  return (
    <div style={{ gridColumn: "1 / -1", fontFamily: kiosk.font.mono, fontSize: 10.5, letterSpacing: "0.18em", color: kiosk.color.inkMute, fontWeight: 600, marginTop: 8, paddingBottom: 6, borderBottom: `1.5px dashed ${kiosk.color.rule}` }}>{children}</div>
  );
}

// mini skeleton bar
function PSkel({ w = "100%", h = 12 }) {
  return <div style={{ width: w, height: h, borderRadius: 4, background: `linear-gradient(90deg, ${kiosk.color.paperSoft} 25%, #e2d7bd 50%, ${kiosk.color.paperSoft} 75%)`, backgroundSize: "400px 100%", animation: "profSweep 1.4s linear infinite" }}></div>;
}

function PMiniBanner({ kind = "warn", children }) {
  const map = {
    warn:   { bg: "#fbf1d8", bd: kiosk.color.warn, fg: kiosk.color.warn, ic: "◐" },
    danger: { bg: "#f6e3e3", bd: kiosk.color.danger, fg: kiosk.color.danger, ic: "✕" },
    ok:     { bg: "#e7eedd", bd: kiosk.color.success, fg: kiosk.color.success, ic: "✓" },
    info:   { bg: "#e3edf0", bd: kiosk.color.info, fg: kiosk.color.info, ic: "◈" },
  };
  const m = map[kind];
  return (
    <div style={{ padding: "8px 11px", background: m.bg, border: `1.5px solid ${m.bd}`, borderRadius: kiosk.r.sm, fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkSoft, lineHeight: 1.55 }}>
      <b style={{ color: m.fg }}>{m.ic}</b> {children}
    </div>
  );
}

function ProfileStatesBody({ lang = "DE", cols = 3 }) {
  const de = lang === "DE";
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16 }}>
      <PGroupHead>{de ? "GRUPPE A · ANZEIGE" : "GROUP A · DISPLAY"}</PGroupHead>

      <PStateTile n="01" title={de ? "Lädt" : "Loading"} note={de ? "Skeleton spiegelt das echte Layout (Karte + Ledger) — kein ⏳-Emoji-Spinner wie im Bestand." : "Skeleton mirrors the real layout (card + ledger) — no ⏳ emoji spinner like the legacy UI."}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: kiosk.color.paperSoft, border: `1px dashed ${kiosk.color.rule}` }}></div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}><PSkel w="70%" /><PSkel w="45%" h={9} /></div>
        </div>
        <PSkel /><PSkel w="82%" /><PSkel w="64%" />
      </PStateTile>

      <PStateTile n="02" title={de ? "Archiv leer" : "Archive empty"} note={de ? "Neue Nachbar:innen: drei konkrete Einstiege statt leerem Karton." : "New neighbors: three concrete entry points instead of an empty box."}>
        <div style={{ textAlign: "center", fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 15, color: kiosk.color.inkSoft }}>
          {de ? "Noch keine Spuren im Kiez." : "No traces in the kiez yet."}
        </div>
        <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
          <PBtn small>{de ? "erstes Thema" : "first topic"}</PBtn>
          <PBtn small>{de ? "erste Anzeige" : "first listing"}</PBtn>
          <PBtn small>{de ? "Termin ansehen" : "browse events"}</PBtn>
        </div>
      </PStateTile>

      <PStateTile n="03" title={de ? "Profil nicht gefunden" : "Profile not found"} note={de ? "Gelöschtes/unbekanntes Konto: freundliche Karte, kein 404-Bruch. Gleiches Muster wie Markt-„nicht mehr verfügbar“." : "Deleted/unknown account: friendly card, no raw 404. Same pattern as the market's „no longer available“ page."}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 15, color: kiosk.color.inkSoft, marginBottom: 8 }}>
            {de ? "Diese Nachbarin ist nicht (mehr) hier." : "This neighbor is not (or no longer) here."}
          </div>
          <PBtn small>{de ? "← zurück zum Forum" : "← back to the forum"}</PBtn>
        </div>
      </PStateTile>

      <PGroupHead>{de ? "GRUPPE B · BEARBEITEN" : "GROUP B · EDITING"}</PGroupHead>

      <PStateTile n="04" title={de ? "Speichert" : "Saving"} note={de ? "Optimistisch: Karte sofort im Lese-Zustand, Chip bestätigt asynchron." : "Optimistic: card returns to read state instantly, chip confirms async."}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontFamily: kiosk.font.display, fontSize: 14, fontWeight: 800 }}>Emre Aydın</span>
          <span style={{ padding: "3px 9px", background: kiosk.color.paperSoft, border: kiosk.border.ink, borderRadius: kiosk.r.pill, fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.inkMute, animation: "profSaveTick 0.25s ease-out both" }}>
            {de ? "speichert …" : "saving …"}
          </span>
        </div>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute }}>{de ? "wird zu „gespeichert ✓“ (1.5s) und blendet aus" : "becomes „saved ✓“ (1.5s), then fades"}</div>
      </PStateTile>

      <PStateTile n="05" title={de ? "Speichern fehlgeschlagen" : "Save failed"} note={de ? "Eingaben bleiben erhalten, Karte kehrt in den Edit-Zustand zurück. Bestand schluckt Fehler nur in die Konsole." : "Inputs are kept, card returns to edit state. Legacy swallows errors into the console."}>
        <PMiniBanner kind="danger">{de ? "Nicht gespeichert — Netz weg? " : "Not saved — connection lost? "}<b style={{ borderBottom: `1.5px solid ${kiosk.color.danger}` }}>{de ? "nochmal" : "retry"}</b></PMiniBanner>
      </PStateTile>

      <PStateTile n="06" title={de ? "Avatar lädt hoch" : "Avatar uploading"} note={de ? "Fortschrittsbalken in der Karte selbst; Rest des Profils bleibt bedienbar." : "Progress bar inside the card itself; rest of the profile stays usable."}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: kiosk.color.wine, border: kiosk.border.ink, opacity: 0.5 }}></div>
          <div style={{ flex: 1 }}>
            <div style={{ height: 8, border: kiosk.border.ink, borderRadius: kiosk.r.pill, overflow: "hidden", background: kiosk.color.paperSoft }}>
              <div style={{ height: "100%", width: "62%", background: PROFILE_ACCENT, animation: "profUploadBar 2.8s ease-out infinite" }}></div>
            </div>
            <div style={{ fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.inkMute, marginTop: 4 }}>62% · {de ? "abbrechen" : "cancel"}</div>
          </div>
        </div>
      </PStateTile>

      <PStateTile n="07" title={de ? "Avatar-Fehler" : "Avatar error"} note={de ? "Konkreter Grund + ein Klick zum neuen Versuch. Altes Bild bleibt." : "Concrete reason + one click to retry. Old image stays."}>
        <PMiniBanner kind="danger">{de ? "Datei größer als 5 MB · " : "File larger than 5 MB · "}<b style={{ borderBottom: `1.5px solid ${kiosk.color.danger}` }}>{de ? "andere Datei wählen" : "pick another file"}</b></PMiniBanner>
      </PStateTile>

      <PGroupHead>{de ? "GRUPPE C · KONTO" : "GROUP C · ACCOUNT"}</PGroupHead>

      <PStateTile n="08" title={de ? "E-Mail-Wechsel ausstehend" : "Email change pending"} note={de ? "Banner auf der Konto-Karte, solange der Link nicht bestätigt ist. Alte Adresse gilt weiter." : "Banner on the account card while the link is unconfirmed. Old address stays active."}>
        <PMiniBanner kind="warn">
          {de ? "Wechsel zu emre@mailbox.org wartet auf Bestätigung · " : "Switch to emre@mailbox.org awaits confirmation · "}
          <b style={{ borderBottom: `1.5px solid ${kiosk.color.warn}` }}>{de ? "erneut senden" : "resend"}</b> · <b style={{ borderBottom: `1.5px solid ${kiosk.color.warn}` }}>{de ? "abbrechen" : "cancel"}</b>
        </PMiniBanner>
      </PStateTile>

      <PStateTile n="09" title={de ? "Konto gesperrt" : "Account suspended"} note={de ? "Bindet an die Sperr-Screens aus dem Admin-Pass: Profil bleibt lesbar, alles Schreibende ist aus. Verwarnungs-Block zeigt ●●● + Grund." : "Ties into the admin pass suspension screens: profile stays readable, all writes disabled. Warning block shows ●●● + reason."}>
        <PMiniBanner kind="danger">{de ? "Konto gesperrt seit 08.07 — kein Posten mehr. Details im Moderations-Block." : "Account suspended since 08.07 — no more posting. Details in the moderation block."}</PMiniBanner>
        <div style={{ display: "flex", gap: 6 }}>
          <span style={{ opacity: 0.45 }}><PBtn small primary>{de ? "Profil bearbeiten" : "Edit profile"}</PBtn></span>
          <span style={{ opacity: 0.45 }}><PBtn small>{de ? "Steckbrief" : "Steckbrief"}</PBtn></span>
        </div>
      </PStateTile>

      <PStateTile n="10" title={de ? "Abgemeldet" : "Signed out"} note={de ? "/profil ohne Session → Karte mit Login-CTA (ersetzt die 🔒-Karte des Bestands)." : "/profile without a session → card with login CTA (replaces the legacy 🔒 card)."}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 15, color: kiosk.color.inkSoft, marginBottom: 8 }}>
            {de ? "Der Meldebogen braucht einen Schlüssel." : "The Meldebogen needs a key."}
          </div>
          <PBtn primary small>{de ? "anmelden" : "sign in"}</PBtn>
        </div>
      </PStateTile>
    </div>
  );
}

function ProfileStatesDesktop({ lang = "DE" }) {
  const de = lang === "DE";
  return (
    <div style={{ width: 1280, minHeight: 1240, background: kiosk.color.paper, color: kiosk.color.ink, fontFamily: kiosk.font.display, position: "relative", overflow: "hidden", padding: "36px 40px" }}>
      <style>{kioskFonts}{profileKeyframes}</style>
      <div style={paperGrainStyle}></div>
      <div style={{ fontFamily: kiosk.font.mono, fontSize: 11, letterSpacing: "0.14em", color: PROFILE_ACCENT, fontWeight: 600 }}>{de ? "PROFIL · 10 ZUSTÄNDE" : "PROFILE · 10 STATES"}</div>
      <h2 style={{ fontFamily: kiosk.font.display, fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em", margin: "8px 0 22px" }}>
        {de ? <React.Fragment>Jeder Zustand hat <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: PROFILE_ACCENT }}>Haltung</span></React.Fragment>
            : <React.Fragment>Every state has <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: PROFILE_ACCENT }}>a posture</span></React.Fragment>}
      </h2>
      <ProfileStatesBody lang={lang} cols={3} />
    </div>
  );
}

function ProfileStatesMobile({ lang = "DE" }) {
  const de = lang === "DE";
  return (
    <div style={{ width: 390, minHeight: 2050, background: kiosk.color.paper, color: kiosk.color.ink, fontFamily: kiosk.font.display, position: "relative", overflow: "hidden", padding: "26px 16px" }}>
      <style>{kioskFonts}{profileKeyframes}</style>
      <div style={paperGrainStyle}></div>
      <div style={{ fontFamily: kiosk.font.mono, fontSize: 10.5, letterSpacing: "0.14em", color: PROFILE_ACCENT, fontWeight: 600, marginBottom: 14 }}>{de ? "PROFIL · STATES · MOBILE" : "PROFILE · STATES · MOBILE"}</div>
      <ProfileStatesBody lang={lang} cols={1} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════

Object.assign(window, {
  PStateTile, PMiniBanner, PSkel,
  ProfileStatesDesktop, ProfileStatesMobile,
});
