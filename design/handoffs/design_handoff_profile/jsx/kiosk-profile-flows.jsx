/* global React */

// ══════════════════════════════════════════════════════════
//  PROFILE PASS · flows
//  Edit-in-place · avatar upload states · change-email (verify
//  new address) · change-password · delete account.
//  Grounded in ProfileUpdateSchema + ChangePasswordSchema.
//  NOTE: the current UI shows an email input that is never
//  saved — this pass replaces it with an honest verify-flow.
// ══════════════════════════════════════════════════════════

// ─── Shared flow scaffolding ─────────────────────────────

function PFlowStage({ n, title, children, width = 380 }) {
  return (
    <div style={{ width, flexShrink: 0 }}>
      <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, letterSpacing: "0.14em", color: PROFILE_ACCENT, fontWeight: 600, marginBottom: 8 }}>{n} · {title}</div>
      {children}
    </div>
  );
}

function PField({ label, value, placeholder, focused, error, hint, type = "text" }) {
  const borderColor = error ? kiosk.color.danger : focused ? kiosk.color.ink : kiosk.color.rule;
  const display = value && type === "password" ? "•".repeat(value.length) : (value || "");
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, letterSpacing: "0.14em", color: kiosk.color.inkMute, marginBottom: 5 }}>{label}</div>
      <div style={{ padding: "10px 13px", background: kiosk.color.paperSoft, border: `1.5px solid ${borderColor}`, borderRadius: kiosk.r.md, fontFamily: kiosk.font.display, fontSize: 14, fontWeight: 500, color: display ? kiosk.color.ink : kiosk.color.inkMute, minHeight: 20 }}>
        {display || placeholder}
      </div>
      {error && <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.danger, marginTop: 4 }}>✕ {error}</div>}
      {hint && !error && <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

// ─── §01 · Edit-in-place (identity card in edit mode) ────

function ProfileEditDesktop({ lang = "DE" }) {
  const t = lang === "DE" ? {
    eyebrow: "PROFIL · BEARBEITEN", saving: "Änderungen werden sofort sichtbar — Speichern läuft im Hintergrund (optimistisch).",
    name: "ANZEIGENAME", hobbys: "INTERESSEN · MAX 10", add: "hinzufügen und ⏎", save: "Speichern", cancel: "Abbrechen",
    emailNote: "E-Mail wird hier nur angezeigt. Ändern läuft über den eigenen Bestätigungs-Flow →",
  } : {
    eyebrow: "PROFILE · EDITING", saving: "Changes appear immediately — saving runs in the background (optimistic).",
    name: "DISPLAY NAME", hobbys: "INTERESTS · MAX 10", add: "type and ⏎", save: "Save", cancel: "Cancel",
    emailNote: "Email is display-only here. Changing it runs through its own verification flow →",
  };
  return (
    <div style={{ width: 1280, minHeight: 860, background: kiosk.color.paper, color: kiosk.color.ink, fontFamily: kiosk.font.display, position: "relative", overflow: "hidden", padding: "36px 40px" }}>
      <style>{kioskFonts}{profileKeyframes}</style>
      <div style={paperGrainStyle}></div>
      <div style={{ fontFamily: kiosk.font.mono, fontSize: 11, letterSpacing: "0.14em", color: PROFILE_ACCENT, fontWeight: 600 }}>{t.eyebrow}</div>
      <div style={{ display: "grid", gridTemplateColumns: "440px 1fr", gap: 40, marginTop: 18, alignItems: "start" }}>
        {/* the card, editing */}
        <PCard pad={22}>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 18 }}>
            <PAvatar initials="EA" editable={true} lang={lang} />
            <div style={{ flex: 1 }}>
              <PField label={t.name} value="Emre Aydın" focused={true} hint={lang === "DE" ? "3–30 Zeichen · Buchstaben, Zahlen, - und _" : "3–30 chars · letters, numbers, - and _"} />
            </div>
          </div>
          <div style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, letterSpacing: "0.14em", color: kiosk.color.inkMute, marginBottom: 8 }}>{t.hobbys}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {SEED_ME.hobbies.map((h) => <PHobbyChip key={h} removable>{h}</PHobbyChip>)}
            <span style={{ padding: "5px 12px", border: `1.5px dashed ${kiosk.color.inkMute}`, borderRadius: kiosk.r.pill, fontFamily: kiosk.font.display, fontSize: 12.5, color: kiosk.color.inkMute }}>+ {t.add}</span>
          </div>
          <div style={{ padding: "10px 13px", background: kiosk.color.paperSoft, border: `1px dashed ${kiosk.color.rule}`, borderRadius: kiosk.r.md, fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, lineHeight: 1.6, marginBottom: 16 }}>
            E-MAIL · emre.aydin@posteo.de<br />{t.emailNote}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <PBtn primary>{t.save}</PBtn>
            <PBtn>{t.cancel}</PBtn>
          </div>
        </PCard>
        {/* spec notes */}
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 11, color: kiosk.color.inkSoft, lineHeight: 1.8, maxWidth: 560 }}>
          <div style={{ fontFamily: kiosk.font.display, fontSize: 18, fontWeight: 800, color: kiosk.color.ink, marginBottom: 10 }}>{lang === "DE" ? "Bearbeiten · Regeln" : "Editing · rules"}</div>
          {(lang === "DE" ? [
            "01 · Bearbeiten passiert IN der Karte — kein separater Screen, kein Modal.",
            "02 · Speichern ist optimistisch: Karte kehrt sofort in den Lese-Zustand zurück, Chip „gespeichert ✓“ bestätigt (siehe State-Matrix §04/§05 für Fehlerpfad).",
            "03 · Validierung wie ProfileUpdateSchema: Name 3–30 Zeichen, Hobbys max. 10 × 50 Zeichen.",
            "04 · E-Mail ist hier bewusst NICHT editierbar — der Bestand zeigt ein E-Mail-Feld, das nie gespeichert wird. Das ersetzen wir durch den Bestätigungs-Flow (§03).",
            "05 · Avatar-Klick öffnet den Upload-Flow (§02) — auch im Lese-Zustand erreichbar.",
          ] : [
            "01 · Editing happens IN the card — no separate screen, no modal.",
            "02 · Saving is optimistic: the card returns to read state immediately, a „saved ✓“ chip confirms (see state matrix §04/§05 for the failure path).",
            "03 · Validation mirrors ProfileUpdateSchema: name 3–30 chars, hobbies max 10 × 50 chars.",
            "04 · Email is deliberately NOT editable here — the legacy UI shows an email input that never saves. We replace it with the verification flow (§03).",
            "05 · Clicking the avatar opens the upload flow (§02) — reachable from read state too.",
          ]).map((s, i) => <div key={i} style={{ padding: "7px 0", borderBottom: `1px dashed ${kiosk.color.rule}` }}>{s}</div>)}
        </div>
      </div>
    </div>
  );
}

// ─── §02 · Avatar upload states ──────────────────────────

function PAvatarState({ label, children, note }) {
  return (
    <div style={{ width: 216, flexShrink: 0 }}>
      <div style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, letterSpacing: "0.12em", color: kiosk.color.inkMute, marginBottom: 10 }}>{label}</div>
      <div style={{ height: 168, background: kiosk.color.paperWarm, border: kiosk.border.ink, borderRadius: kiosk.r.lg, boxShadow: kiosk.shadow.printSm(), display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: 14, position: "relative" }}>
        {children}
      </div>
      <div style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkSoft, lineHeight: 1.55, marginTop: 8 }}>{note}</div>
    </div>
  );
}

function AvatarUploadStates({ lang = "DE" }) {
  const de = lang === "DE";
  return (
    <div style={{ width: 1280, minHeight: 560, background: kiosk.color.paper, color: kiosk.color.ink, fontFamily: kiosk.font.display, position: "relative", overflow: "hidden", padding: "36px 40px" }}>
      <style>{kioskFonts}{profileKeyframes}</style>
      <div style={paperGrainStyle}></div>
      <div style={{ fontFamily: kiosk.font.mono, fontSize: 11, letterSpacing: "0.14em", color: PROFILE_ACCENT, fontWeight: 600 }}>{de ? "AVATAR-UPLOAD · 5 ZUSTÄNDE" : "AVATAR UPLOAD · 5 STATES"}</div>
      <h2 style={{ fontFamily: kiosk.font.display, fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em", margin: "8px 0 24px" }}>
        {de ? <React.Fragment>Ein Foto, <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: PROFILE_ACCENT }}>ehrlich</span> hochgeladen</React.Fragment>
            : <React.Fragment>One photo, <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: PROFILE_ACCENT }}>honestly</span> uploaded</React.Fragment>}
      </h2>
      <div style={{ display: "flex", gap: 20 }}>
        <PAvatarState label={de ? "01 · RUHEND" : "01 · IDLE"} note={de ? "Monogramm-Fallback (ui-avatars entfällt — eigenes Riso-Monogramm). Hover zeigt ÄNDERN-Chip." : "Monogram fallback (drop ui-avatars — own riso monogram). Hover shows CHANGE chip."}>
          <PAvatar initials="EA" size={76} editable={true} lang={lang} />
        </PAvatarState>
        <PAvatarState label={de ? "02 · AUSWAHL" : "02 · PICKING"} note={de ? "Dropzone + Dateiwahl. JPG/PNG/WebP · max 5 MB. Cloudinary-Preset wie im Bestand." : "Dropzone + file picker. JPG/PNG/WebP · max 5 MB. Cloudinary preset as in codebase."}>
          <div style={{ width: 130, height: 100, border: `2px dashed ${kiosk.color.inkMute}`, borderRadius: kiosk.r.md, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5 }}>
            <span style={{ fontSize: 20 }}>⇪</span>
            <span style={{ fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.inkMute, textAlign: "center" }}>{de ? "Foto hierher ziehen" : "drag photo here"}</span>
          </div>
        </PAvatarState>
        <PAvatarState label={de ? "03 · LÄDT HOCH" : "03 · UPLOADING"} note={de ? "Balken statt Spinner — ehrlicher Fortschritt. Abbrechen jederzeit möglich." : "Bar instead of spinner — honest progress. Cancel available anytime."}>
          <PAvatar initials="EA" size={64} lang={lang} />
          <div style={{ width: 140, height: 10, border: kiosk.border.ink, borderRadius: kiosk.r.pill, overflow: "hidden", background: kiosk.color.paperSoft }}>
            <div style={{ height: "100%", width: "62%", background: PROFILE_ACCENT, animation: "profUploadBar 2.8s ease-out infinite" }}></div>
          </div>
          <span style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute }}>62% · {de ? "abbrechen" : "cancel"}</span>
        </PAvatarState>
        <PAvatarState label={de ? "04 · FEHLER" : "04 · ERROR"} note={de ? "Konkreter Grund: zu groß / falsches Format / Netz weg. Altes Bild bleibt unangetastet." : "Concrete reason: too large / wrong format / network lost. Old image stays untouched."}>
          <PAvatar initials="EA" size={64} lang={lang} />
          <div style={{ padding: "6px 10px", background: "#f6e3e3", border: `1.5px solid ${kiosk.color.danger}`, borderRadius: kiosk.r.sm, fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.danger, textAlign: "center", lineHeight: 1.5 }}>
            ✕ {de ? "Datei größer als 5 MB" : "File larger than 5 MB"}<br />
            <b style={{ borderBottom: `1.5px solid ${kiosk.color.danger}` }}>{de ? "nochmal versuchen" : "try again"}</b>
          </div>
        </PAvatarState>
        <PAvatarState label={de ? "05 · GESPEICHERT" : "05 · SAVED"} note={de ? "WICHTIG: Bestand lädt hoch, speichert aber nie (handleImageUpload-TODO). Dieser Flow schreibt userPicture wirklich." : "IMPORTANT: legacy uploads but never persists (handleImageUpload TODO). This flow actually writes userPicture."}>
          <div style={{ position: "relative" }}>
            <PAvatar initials="EA" size={76} lang={lang} />
            <span style={{ position: "absolute", top: -6, right: -8, width: 24, height: 24, borderRadius: "50%", background: kiosk.color.success, color: kiosk.color.paper, border: kiosk.border.ink, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, animation: "profChipIn 0.3s cubic-bezier(.2,.8,.2,1.2) both" }}>✓</span>
          </div>
          <span style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.success }}>{de ? "gespeichert" : "saved"}</span>
        </PAvatarState>
      </div>
    </div>
  );
}

// ─── §03 · Change email (verify new address) ─────────────

function EmailChangeFlow({ lang = "DE" }) {
  const de = lang === "DE";
  return (
    <div style={{ width: 1280, minHeight: 700, background: kiosk.color.paper, color: kiosk.color.ink, fontFamily: kiosk.font.display, position: "relative", overflow: "hidden", padding: "36px 40px" }}>
      <style>{kioskFonts}{profileKeyframes}</style>
      <div style={paperGrainStyle}></div>
      <div style={{ fontFamily: kiosk.font.mono, fontSize: 11, letterSpacing: "0.14em", color: PROFILE_ACCENT, fontWeight: 600 }}>{de ? "E-MAIL ÄNDERN · 3 STUFEN" : "CHANGE EMAIL · 3 STAGES"}</div>
      <h2 style={{ fontFamily: kiosk.font.display, fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em", margin: "8px 0 24px" }}>
        {de ? <React.Fragment>Erst <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: PROFILE_ACCENT }}>bestätigen</span>, dann wechseln</React.Fragment>
            : <React.Fragment>First <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: PROFILE_ACCENT }}>verify</span>, then switch</React.Fragment>}
      </h2>
      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        <PFlowStage n="01" title={de ? "NEUE ADRESSE" : "NEW ADDRESS"}>
          <PCard pad={18}>
            <PField label={de ? "NEUE E-MAIL" : "NEW EMAIL"} value="emre@mailbox.org" focused={true} />
            <PField label={de ? "AKTUELLES PASSWORT" : "CURRENT PASSWORD"} value="········" type="password" hint={de ? "zur Sicherheit — nicht das neue" : "for safety — not the new one"} />
            <PBtn primary>{de ? "Bestätigungslink senden" : "Send verification link"}</PBtn>
            <div style={{ marginTop: 12, fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute, lineHeight: 1.6 }}>
              {de ? "Bei vergebener Adresse: neutraler Fehler „Diese Adresse kann nicht verwendet werden.“ — keine Konto-Enumeration." : "If address is taken: neutral error „This address cannot be used.“ — no account enumeration."}
            </div>
          </PCard>
        </PFlowStage>
        <span style={{ fontFamily: kiosk.font.mono, fontSize: 18, color: kiosk.color.inkMute, marginTop: 120 }}>→</span>
        <PFlowStage n="02" title={de ? "BESTÄTIGEN" : "VERIFY"}>
          <PCard pad={18}>
            <div style={{ fontSize: 30, marginBottom: 8 }}>✉</div>
            <div style={{ fontFamily: kiosk.font.display, fontSize: 15, fontWeight: 700, lineHeight: 1.35 }}>
              {de ? "Link ist unterwegs an" : "Link is on its way to"}<br /><span style={{ fontFamily: kiosk.font.mono, fontSize: 13 }}>emre@mailbox.org</span>
            </div>
            <div style={{ marginTop: 10, fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkSoft, lineHeight: 1.7 }}>
              {de ? "Gültig 30 Minuten · einmalig. Die alte Adresse bekommt parallel eine Info-Mail. Bis zur Bestätigung gilt die alte Adresse weiter." : "Valid 30 minutes · single-use. The old address gets a notice in parallel. Until confirmed, the old address stays active."}
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 12, fontFamily: kiosk.font.display, fontSize: 12.5, fontWeight: 700 }}>
              <span style={{ borderBottom: `2px solid ${PROFILE_ACCENT}`, cursor: "pointer" }}>{de ? "erneut senden" : "resend"}</span>
              <span style={{ color: kiosk.color.inkMute, cursor: "pointer" }}>{de ? "abbrechen" : "cancel"}</span>
            </div>
          </PCard>
        </PFlowStage>
        <span style={{ fontFamily: kiosk.font.mono, fontSize: 18, color: kiosk.color.inkMute, marginTop: 120 }}>→</span>
        <PFlowStage n="03" title={de ? "GEWECHSELT" : "SWITCHED"}>
          <PCard pad={18} accent={kiosk.color.success}>
            <div style={{ fontSize: 30, marginBottom: 8 }}>✓</div>
            <div style={{ fontFamily: kiosk.font.display, fontSize: 15, fontWeight: 700, lineHeight: 1.35 }}>
              {de ? "Neue Adresse bestätigt." : "New address confirmed."}
            </div>
            <div style={{ marginTop: 10, fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkSoft, lineHeight: 1.7 }}>
              {de ? "Login läuft ab jetzt über emre@mailbox.org. Bestehende Sitzungen bleiben angemeldet." : "Login now uses emre@mailbox.org. Existing sessions stay signed in."}
            </div>
            <div style={{ marginTop: 12 }}><PBtn primary small>{de ? "zurück zum Profil" : "back to profile"}</PBtn></div>
          </PCard>
        </PFlowStage>
      </div>
      <KioskAnnotate bottom={28} right={44} rotate={1.5} color={kiosk.color.sky}>
        {de ? "CC: braucht neuen Endpoint + pendingEmail-Feld. Bestand hat KEINEN E-Mail-Wechsel — das Formularfeld im alten UI speichert nie." : "CC: needs a new endpoint + pendingEmail field. Codebase has NO email change — the old UI form field never saves."}
      </KioskAnnotate>
    </div>
  );
}

// ─── §04 · Change password ───────────────────────────────

function PasswordChangeCard({ lang = "DE" }) {
  const de = lang === "DE";
  return (
    <div style={{ width: 1280, minHeight: 560, background: kiosk.color.paper, color: kiosk.color.ink, fontFamily: kiosk.font.display, position: "relative", overflow: "hidden", padding: "36px 40px" }}>
      <style>{kioskFonts}{profileKeyframes}</style>
      <div style={paperGrainStyle}></div>
      <div style={{ fontFamily: kiosk.font.mono, fontSize: 11, letterSpacing: "0.14em", color: PROFILE_ACCENT, fontWeight: 600 }}>{de ? "PASSWORT ÄNDERN" : "CHANGE PASSWORD"}</div>
      <div style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 40, marginTop: 18, alignItems: "start" }}>
        <PCard pad={20}>
          <PField label={de ? "AKTUELLES PASSWORT" : "CURRENT PASSWORD"} value="········" type="password" />
          <PField label={de ? "NEUES PASSWORT" : "NEW PASSWORD"} value="KiezRad2026" type="password" focused={true} />
          <div style={{ margin: "-4px 0 12px" }}><AuthStrength score={3} lang={lang} /></div>
          <PField label={de ? "NEUES PASSWORT · WIEDERHOLEN" : "NEW PASSWORD · REPEAT"} value="KiezRad2026" type="password" />
          <PBtn primary>{de ? "Passwort ändern" : "Change password"}</PBtn>
          <div style={{ marginTop: 12, fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute, lineHeight: 1.6 }}>
            {de ? "Danach: alle anderen Geräte werden abgemeldet, dieses bleibt angemeldet." : "Afterwards: all other devices are signed out, this one stays signed in."}
          </div>
        </PCard>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 11, color: kiosk.color.inkSoft, lineHeight: 1.8, maxWidth: 560 }}>
          <div style={{ fontFamily: kiosk.font.display, fontSize: 18, fontWeight: 800, color: kiosk.color.ink, marginBottom: 10 }}>{de ? "Regeln" : "Rules"}</div>
          {(de ? [
            "01 · Validierung = ChangePasswordSchema aus dem Bestand: min. 8 Zeichen, Groß + Klein + Zahl, Wiederholung muss passen.",
            "02 · Stärke-Meter aus dem Auth-Pass wiederverwendet (gleiche 4 Segmente, gleiche Labels).",
            "03 · Falsches aktuelles Passwort → Inline-Fehler am ersten Feld, generisch formuliert.",
            "04 · Vergessen? → verweist auf den Forgot-Flow aus dem Auth-Pass (kein Duplikat hier).",
          ] : [
            "01 · Validation = ChangePasswordSchema from the codebase: min 8 chars, upper + lower + digit, repeat must match.",
            "02 · Strength meter reused from the auth pass (same 4 segments, same labels).",
            "03 · Wrong current password → inline error on the first field, phrased generically.",
            "04 · Forgot it? → points to the forgot-flow from the auth pass (no duplicate here).",
          ]).map((s, i) => <div key={i} style={{ padding: "7px 0", borderBottom: `1px dashed ${kiosk.color.rule}` }}>{s}</div>)}
        </div>
      </div>
    </div>
  );
}

// ─── §05 · Delete account ────────────────────────────────

function DeleteAccountModal({ lang = "DE" }) {
  const de = lang === "DE";
  const rows = de ? [
    { what: "Beiträge & Kommentare", fate: "bleiben, anonymisiert („Ehemaliges Mitglied“)", keep: true },
    { what: "Anzeigen", fate: "werden gelöscht", keep: false },
    { what: "Erstellte Termine", fate: "bleiben, anonymisiert · Zusagen werden entfernt", keep: true },
    { what: "Gespeichertes & Zusagen", fate: "werden gelöscht", keep: false },
    { what: "Name, E-Mail, Foto, Interessen", fate: "werden gelöscht", keep: false },
    { what: "Moderations-Protokoll", fate: "behält anonymisierte Einträge (Nachweispflicht)", keep: true },
  ] : [
    { what: "Posts & comments", fate: "remain, anonymized (“Former member”)", keep: true },
    { what: "Listings", fate: "are deleted", keep: false },
    { what: "Created events", fate: "remain, anonymized · RSVPs are removed", keep: true },
    { what: "Saved items & RSVPs", fate: "are deleted", keep: false },
    { what: "Name, email, photo, interests", fate: "are deleted", keep: false },
    { what: "Moderation log", fate: "keeps anonymized entries (audit duty)", keep: true },
  ];
  return (
    <div style={{ width: 1280, minHeight: 780, background: kiosk.color.paper, color: kiosk.color.ink, fontFamily: kiosk.font.display, position: "relative", overflow: "hidden" }}>
      <style>{kioskFonts}{profileKeyframes}</style>
      <div style={paperGrainStyle}></div>
      {/* dimmed page behind */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(27,26,23,0.45)" }}></div>
      <div style={{ position: "relative", maxWidth: 560, margin: "60px auto", background: kiosk.color.paperWarm, border: kiosk.border.inkBold, borderTop: `5px solid ${kiosk.color.danger}`, borderRadius: kiosk.r.lg, boxShadow: `6px 6px 0 ${kiosk.color.ink}`, padding: 28 }}>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, letterSpacing: "0.16em", color: kiosk.color.danger, fontWeight: 600 }}>{de ? "KONTO LÖSCHEN · ENDGÜLTIG" : "DELETE ACCOUNT · PERMANENT"}</div>
        <h3 style={{ fontFamily: kiosk.font.display, fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", margin: "8px 0 4px" }}>
          {de ? <React.Fragment>Das ist ein <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: kiosk.color.danger }}>Abschied</span>, kein Umzug</React.Fragment>
              : <React.Fragment>This is a <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: kiosk.color.danger }}>goodbye</span>, not a move</React.Fragment>}
        </h3>
        <div style={{ fontFamily: kiosk.font.display, fontSize: 13, color: kiosk.color.inkSoft, marginBottom: 16 }}>
          {de ? "Was mit deinen Spuren im Kiez passiert:" : "What happens to your traces in the kiez:"}
        </div>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "18px 1fr 1.2fr", gap: 10, padding: "8px 0", borderTop: `1px dashed ${kiosk.color.rule}`, alignItems: "baseline" }}>
            <span style={{ fontFamily: kiosk.font.mono, fontSize: 11, color: r.keep ? kiosk.color.inkMute : kiosk.color.danger }}>{r.keep ? "◍" : "✕"}</span>
            <span style={{ fontFamily: kiosk.font.display, fontSize: 13, fontWeight: 700 }}>{r.what}</span>
            <span style={{ fontFamily: kiosk.font.mono, fontSize: 10.5, color: kiosk.color.inkSoft, lineHeight: 1.5 }}>{r.fate}</span>
          </div>
        ))}
        <div style={{ marginTop: 16 }}>
          <PField label={de ? "ZUR BESTÄTIGUNG: NUTZERNAME EINTIPPEN" : "TO CONFIRM: TYPE YOUR USERNAME"} placeholder="emre_a" focused={true} />
          <PField label={de ? "PASSWORT" : "PASSWORD"} value="········" type="password" />
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 6, alignItems: "center" }}>
          <button style={{ padding: "10px 18px", background: kiosk.color.danger, color: kiosk.color.paper, border: kiosk.border.ink, borderRadius: kiosk.r.pill, fontFamily: kiosk.font.display, fontSize: 13.5, fontWeight: 700, boxShadow: kiosk.shadow.printSm(), opacity: 0.45, cursor: "not-allowed" }}>
            {de ? "endgültig löschen" : "delete permanently"}
          </button>
          <PBtn small>{de ? "abbrechen" : "cancel"}</PBtn>
          <span style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute }}>{de ? "CTA erst aktiv, wenn Name passt" : "CTA enabled only when the name matches"}</span>
        </div>
      </div>
      <KioskAnnotate bottom={26} right={44} rotate={-1.5}>
        {de ? "ENTSCHIEDEN: 7 Tage Karenz mit Widerruf. Nach Bestätigung Stufe 02 „vorgemerkt“ analog E-Mail-Flow — Banner auf der Konto-Karte + Widerrufs-Link per Mail." : "DECIDED: 7-day grace with undo. After confirm, stage 02 „scheduled“ like the e-mail flow — banner on the account card + undo link via mail."}
      </KioskAnnotate>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════

Object.assign(window, {
  PFlowStage, PField,
  ProfileEditDesktop, AvatarUploadStates, EmailChangeFlow, PasswordChangeCard, DeleteAccountModal,
});
