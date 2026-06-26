/* global React, kiosk, kioskFonts, paperGrainStyle, AUTH_ACCENT, authKeyframes, AuthShellDesktop, AuthShellMobile, AuthCard, AuthEyebrow, AuthHeadline, AuthAccentWord, AuthField, AuthStrength, AuthPrimaryBtn, AuthBanner, AuthLoginBody, AuthRegisterBody, AuthVerifyBody, AuthMonogram */

// ══════════════════════════════════════════════════════════
//  KIOSK · AUTH — flows + state matrix
//   · Forgot-password: request → sent → reset → done (4 stages)
//   · State matrix: every login + register + verify state, one grid
//  Accent stays OCHRE. Imports atoms from kiosk-auth.jsx.
// ══════════════════════════════════════════════════════════

// ─── tiny pill button (text link styled) ───
function AuthGhostLink({ children }) {
  return <span style={{ fontFamily: kiosk.font.mono, fontSize: 11, color: kiosk.color.inkSoft, borderBottom: `1px dashed ${kiosk.color.inkMute}`, cursor: "pointer" }}>{children}</span>;
}

// ═══════════════════════════════════════════════════════════
//  FORGOT PASSWORD — 4 stages
// ═══════════════════════════════════════════════════════════

function AuthForgotBody({ lang = "DE", stage = "request" }) {
  // stage: request | sent | reset | done
  const email = "lena.bergmann@posteo.de";
  const t = lang === "DE" ? {
    eye: "PASSWORT ZUR\u00dCCKSETZEN",
    rH: ["Kein Problem, ", "Nachbar", "."], rSub: "Gib deine E-Mail ein \u2014 wir schicken dir einen Link zum Zur\u00fccksetzen.",
    email: "E-Mail", emailPh: "du@beispiel.de", rCta: "Link senden", back: "\u2190 zur\u00fcck zur Anmeldung",
    sentH: ["Link ist ", "unterwegs", "."], sentSub: "Wir haben einen Zur\u00fccksetz-Link geschickt an", sentBody: "Der Link ist 30 Minuten g\u00fcltig. Nichts da? Pr\u00fcf den Spam-Ordner oder sende erneut.",
    resend: "Erneut senden",
    resetEye: "NEUES PASSWORT", resetH: ["W\u00e4hl ein ", "neues", " Passwort."], resetSub: "F\u00fcr das Konto " ,
    pw: "Neues Passwort", pw2: "Wiederholen", pwPh: "mind. 8 Zeichen", resetCta: "Passwort speichern",
    doneH: ["Erledigt \u2014 ", "fertig", "."], doneSub: "Dein Passwort wurde ge\u00e4ndert. Du kannst dich jetzt anmelden.", doneCta: "Zur Anmeldung",
  } : {
    eye: "RESET PASSWORD",
    rH: ["No problem, ", "neighbor", "."], rSub: "Enter your email \u2014 we'll send you a reset link.",
    email: "Email", emailPh: "you@example.com", rCta: "Send link", back: "\u2190 back to sign in",
    sentH: ["Link is ", "on its way", "."], sentSub: "We sent a reset link to", sentBody: "The link is valid for 30 minutes. Nothing there? Check spam or resend.",
    resend: "Resend",
    resetEye: "NEW PASSWORD", resetH: ["Choose a ", "new", " password."], resetSub: "For the account ",
    pw: "New password", pw2: "Repeat", pwPh: "min. 8 characters", resetCta: "Save password",
    doneH: ["Done \u2014 ", "all set", "."], doneSub: "Your password has been changed. You can sign in now.", doneCta: "To sign in",
  };

  if (stage === "request") {
    return (
      <AuthCard>
        <AuthEyebrow>{t.eye}</AuthEyebrow>
        <AuthHeadline>{t.rH[0]}<AuthAccentWord>{t.rH[1]}</AuthAccentWord>{t.rH[2]}</AuthHeadline>
        <p style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 15, color: kiosk.color.inkSoft, margin: "10px 0 20px" }}>{t.rSub}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <AuthField label={t.email} placeholder={t.emailPh} value={email} icon="\u2709" focused />
          <AuthPrimaryBtn lang={lang}>{t.rCta}</AuthPrimaryBtn>
        </div>
        <div style={{ textAlign: "center", marginTop: 16 }}><AuthGhostLink>{t.back}</AuthGhostLink></div>
      </AuthCard>
    );
  }

  if (stage === "sent") {
    return (
      <AuthCard>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: AUTH_ACCENT, border: kiosk.border.inkBold, boxShadow: kiosk.shadow.print(), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, transform: "rotate(-4deg)" }}>{"\u2709"}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <AuthEyebrow>{t.eye}</AuthEyebrow>
          <h1 style={{ fontFamily: kiosk.font.display, fontWeight: 800, fontSize: 30, letterSpacing: "-0.03em", lineHeight: 1.05, margin: "8px 0 10px" }}>{t.sentH[0]}<AuthAccentWord>{t.sentH[1]}</AuthAccentWord>{t.sentH[2]}</h1>
          <p style={{ fontFamily: kiosk.font.display, fontSize: 13.5, color: kiosk.color.inkSoft, margin: "0 0 4px" }}>{t.sentSub}</p>
          <div style={{ fontFamily: kiosk.font.mono, fontSize: 13, fontWeight: 600, color: kiosk.color.ink, padding: "5px 0" }}>{email}</div>
          <p style={{ fontFamily: kiosk.font.display, fontSize: 12.5, color: kiosk.color.inkSoft, lineHeight: 1.5, maxWidth: 330, margin: "8px auto 0" }}>{t.sentBody}</p>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <button style={{ flex: 1, background: kiosk.color.ink, color: kiosk.color.paper, fontFamily: kiosk.font.display, fontSize: 13.5, fontWeight: 700, padding: "11px 14px", borderRadius: kiosk.r.pill, border: kiosk.border.ink, boxShadow: kiosk.shadow.print(AUTH_ACCENT), cursor: "pointer" }}>{t.resend}</button>
        </div>
        <div style={{ textAlign: "center", marginTop: 16 }}><AuthGhostLink>{t.back}</AuthGhostLink></div>
      </AuthCard>
    );
  }

  if (stage === "reset") {
    return (
      <AuthCard>
        <AuthEyebrow>{t.resetEye}</AuthEyebrow>
        <AuthHeadline>{t.resetH[0]}<AuthAccentWord>{t.resetH[1]}</AuthAccentWord>{t.resetH[2]}</AuthHeadline>
        <p style={{ fontFamily: kiosk.font.display, fontSize: 13, color: kiosk.color.inkSoft, margin: "10px 0 20px" }}>{t.resetSub}<b style={{ color: kiosk.color.ink }}>{email}</b>.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <AuthField label={t.pw} placeholder={t.pwPh} type="password" value={"\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"} showToggle focused />
            <AuthStrength score={4} lang={lang} />
          </div>
          <AuthField label={t.pw2} placeholder={t.pwPh} type="password" value={"\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"} success />
          <AuthPrimaryBtn lang={lang}>{t.resetCta}</AuthPrimaryBtn>
        </div>
      </AuthCard>
    );
  }

  // done
  return (
    <AuthCard>
      <div style={{ textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: kiosk.color.success, border: kiosk.border.inkBold, boxShadow: kiosk.shadow.print(), color: kiosk.color.paper, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, transform: "rotate(-4deg)" }}>{"\u2713"}</div>
        </div>
        <AuthEyebrow accent={kiosk.color.success}>{lang === "DE" ? "GESPEICHERT" : "SAVED"}</AuthEyebrow>
        <h1 style={{ fontFamily: kiosk.font.display, fontWeight: 800, fontSize: 30, letterSpacing: "-0.03em", lineHeight: 1.05, margin: "8px 0 8px" }}>{t.doneH[0]}<AuthAccentWord>{t.doneH[1]}</AuthAccentWord>{t.doneH[2]}</h1>
        <p style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 15, color: kiosk.color.inkSoft, margin: "0 0 22px" }}>{t.doneSub}</p>
        <AuthPrimaryBtn lang={lang}>{t.doneCta}</AuthPrimaryBtn>
      </div>
    </AuthCard>
  );
}

// Forgot-password flow strip — all 4 stages side by side (handoff artboard)
function AuthForgotFlow({ lang = "DE" }) {
  const stages = [
    { id: "request", n: "01", l: lang === "DE" ? "Anfrage" : "Request" },
    { id: "sent", n: "02", l: lang === "DE" ? "Gesendet" : "Sent" },
    { id: "reset", n: "03", l: lang === "DE" ? "Neu setzen" : "Reset" },
    { id: "done", n: "04", l: lang === "DE" ? "Fertig" : "Done" },
  ];
  return (
    <div style={{ width: 1280, background: kiosk.color.paper, color: kiosk.color.ink, fontFamily: kiosk.font.display, position: "relative", padding: "30px 36px 40px" }}>
      <style>{kioskFonts}</style>
      <style>{authKeyframes + "@keyframes spin{to{transform:rotate(360deg)}}"}</style>
      <div style={paperGrainStyle} />
      <div style={{ position: "relative" }}>
        <AuthEyebrow>PASSWORT VERGESSEN \u00b7 {lang === "DE" ? "VOLLER FLUSS" : "FULL FLOW"}</AuthEyebrow>
        <AuthHeadline size={32}>{lang === "DE" ? <>Vier Schritte, <AuthAccentWord>kein Drama</AuthAccentWord>.</> : <>Four steps, <AuthAccentWord>no drama</AuthAccentWord>.</>}</AuthHeadline>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, marginTop: 24, alignItems: "start" }}>
          {stages.map((s) => (
            <div key={s.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontFamily: kiosk.font.mono, fontSize: 11, fontWeight: 700, background: kiosk.color.ink, color: kiosk.color.paper, borderRadius: kiosk.r.sm, padding: "2px 7px" }}>{s.n}</span>
                <span style={{ fontFamily: kiosk.font.mono, fontSize: 11, letterSpacing: "0.1em", color: kiosk.color.inkSoft }}>{s.l}</span>
              </div>
              <AuthForgotBody lang={lang} stage={s.id} />
            </div>
          ))}
        </div>
        <div style={{ marginTop: 18, fontFamily: kiosk.font.mono, fontSize: 10.5, color: kiosk.color.inkMute, borderTop: `1px dashed ${kiosk.color.rule}`, paddingTop: 12, lineHeight: 1.6 }}>
          {lang === "DE"
            ? "CC-Hinweis \u00b7 Stufe 02 nennt nie, ob die E-Mail existiert (Anti-Enumeration) \u2014 selbe Best\u00e4tigung f\u00fcr bekannte und unbekannte Adressen. Reset-Token: einmalig, 30\u202fMin g\u00fcltig, an User-Hash gebunden."
            : "CC note \u00b7 Stage 02 never reveals whether the email exists (anti-enumeration) \u2014 same confirmation for known and unknown addresses. Reset token: single-use, 30 min, bound to user hash."}
        </div>
      </div>
    </div>
  );
}

function AuthForgotDesktop({ lang = "DE", stage = "request" }) {
  return <AuthShellDesktop lang={lang}><AuthForgotBody lang={lang} stage={stage} /></AuthShellDesktop>;
}
function AuthForgotMobile({ lang = "DE", stage = "request" }) {
  return <AuthShellMobile lang={lang}><AuthForgotBody lang={lang} stage={stage} /></AuthShellMobile>;
}

// ═══════════════════════════════════════════════════════════
//  STATE MATRIX — every auth state, scaled tiles in one grid
// ═══════════════════════════════════════════════════════════

// A scaled tile that frames any auth body at reduced scale
function StateTile({ n, label, sub, accent = AUTH_ACCENT, scale = 0.52, tileH = 430, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, fontWeight: 700, color: kiosk.color.paper, background: accent === AUTH_ACCENT ? kiosk.color.ink : accent, borderRadius: kiosk.r.sm, padding: "2px 7px" }}>{n}</span>
        <div>
          <div style={{ fontFamily: kiosk.font.display, fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em", color: kiosk.color.ink }}>{label}</div>
          {sub && <div style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute, letterSpacing: "0.04em" }}>{sub}</div>}
        </div>
      </div>
      <div style={{ height: tileH, border: kiosk.border.ink, borderRadius: kiosk.r.md, overflow: "hidden", background: kiosk.color.paper, position: "relative" }}>
        <div style={{ width: 460, transform: `scale(${scale})`, transformOrigin: "top left", position: "absolute", top: 18, left: 18 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function AuthStateMatrixDesktop({ lang = "DE" }) {
  const wrap = (node) => <AuthCard>{node}</AuthCard>;
  const G = (title) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "26px 0 4px" }}>
      <span style={{ fontFamily: kiosk.font.mono, fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", color: kiosk.color.ink, textTransform: "uppercase" }}>{title}</span>
      <div style={{ flex: 1, borderTop: `1.5px solid ${kiosk.color.ink}` }} />
    </div>
  );

  return (
    <div style={{ width: 1280, background: kiosk.color.paper, color: kiosk.color.ink, fontFamily: kiosk.font.display, position: "relative", padding: "30px 36px 44px" }}>
      <style>{kioskFonts}</style>
      <style>{authKeyframes + "@keyframes spin{to{transform:rotate(360deg)}}@keyframes authBlink{0%,49%{opacity:1}50%,100%{opacity:0}}"}</style>
      <div style={paperGrainStyle} />
      <div style={{ position: "relative" }}>
        <AuthEyebrow>AUTH \u00b7 {lang === "DE" ? "ZUSTANDSMATRIX" : "STATE MATRIX"}</AuthEyebrow>
        <AuthHeadline size={32}>{lang === "DE" ? <>Jeder <AuthAccentWord>Zustand</AuthAccentWord>, den die T\u00fcr kennt.</> : <>Every <AuthAccentWord>state</AuthAccentWord> the door knows.</>}</AuthHeadline>
        <p style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 15, color: kiosk.color.inkSoft, margin: "8px 0 0", maxWidth: 720 }}>
          {lang === "DE" ? "Login \u00b7 Registrieren \u00b7 Best\u00e4tigung \u2014 inline-Fehler, Banner, Lade- und Erfolgszust\u00e4nde. Alles ochre-akzentuiert." : "Login \u00b7 register \u00b7 verify \u2014 inline errors, banners, loading and success states. All ochre-accented."}
        </p>

        {G(lang === "DE" ? "ANMELDEN \u00b7 6 ZUST\u00c4NDE" : "SIGN IN \u00b7 6 STATES")}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18, marginTop: 12 }}>
          <StateTile n="01" label={lang === "DE" ? "Leer / Ruhe" : "Idle"} sub="default">{wrap(<AuthLoginBody lang={lang} state="idle" />)}</StateTile>
          <StateTile n="02" label={lang === "DE" ? "Falsches Passwort" : "Wrong password"} sub="inline error" accent={kiosk.color.danger}>{wrap(<AuthLoginBody lang={lang} state="wrongpw" />)}</StateTile>
          <StateTile n="03" label={lang === "DE" ? "E-Mail unbekannt" : "Email not found"} sub="inline error" accent={kiosk.color.danger}>{wrap(<AuthLoginBody lang={lang} state="notfound" />)}</StateTile>
          <StateTile n="04" label={lang === "DE" ? "Nicht best\u00e4tigt" : "Unverified"} sub="banner + resend" accent={kiosk.color.warn} tileH={470}>{wrap(<AuthLoginBody lang={lang} state="unverified" />)}</StateTile>
          <StateTile n="05" label={lang === "DE" ? "Gesperrt / Limit" : "Rate-limited"} sub="banner + disabled" accent={kiosk.color.danger} tileH={470}>{wrap(<AuthLoginBody lang={lang} state="ratelimited" />)}</StateTile>
          <StateTile n="06" label={lang === "DE" ? "Erfolg" : "Success"} sub="redirecting" accent={kiosk.color.success} tileH={470}>{wrap(<AuthLoginBody lang={lang} state="success" />)}</StateTile>
        </div>

        {G(lang === "DE" ? "REGISTRIEREN \u00b7 4 ZUST\u00c4NDE" : "REGISTER \u00b7 4 STATES")}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, marginTop: 12 }}>
          <StateTile n="07" label={lang === "DE" ? "E-Mail vergeben" : "Email taken"} sub="banner" accent={kiosk.color.danger} tileH={520} scale={0.46}>{wrap(<AuthRegisterBody lang={lang} state="emailtaken" />)}</StateTile>
          <StateTile n="08" label={lang === "DE" ? "Schwaches PW" : "Weak password"} sub="meter + error" accent={kiosk.color.warn} tileH={520} scale={0.46}>{wrap(<AuthRegisterBody lang={lang} state="weakpw" />)}</StateTile>
          <StateTile n="09" label={lang === "DE" ? "PW ungleich" : "Mismatch"} sub="inline error" accent={kiosk.color.danger} tileH={520} scale={0.46}>{wrap(<AuthRegisterBody lang={lang} state="mismatch" />)}</StateTile>
          <StateTile n="10" label={lang === "DE" ? "AGB fehlt" : "Terms unchecked"} sub="blocked submit" accent={kiosk.color.danger} tileH={520} scale={0.46}>{wrap(<AuthRegisterBody lang={lang} state="termsunchecked" />)}</StateTile>
        </div>

        {G(lang === "DE" ? "BEST\u00c4TIGUNG \u00b7 3 ZUST\u00c4NDE" : "VERIFY \u00b7 3 STATES")}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18, marginTop: 12 }}>
          <StateTile n="11" label={lang === "DE" ? "Mail gesendet" : "Mail sent"} sub="await confirm" tileH={430}>{wrap(<AuthVerifyBody lang={lang} state="sent" />)}</StateTile>
          <StateTile n="12" label={lang === "DE" ? "Erneut gesendet" : "Resent"} sub="success note" accent={kiosk.color.success} tileH={430}>{wrap(<AuthVerifyBody lang={lang} state="resent" />)}</StateTile>
          <StateTile n="13" label={lang === "DE" ? "Best\u00e4tigt" : "Confirmed"} sub="account active" accent={kiosk.color.success} tileH={430}>{wrap(<AuthVerifyBody lang={lang} state="confirmed" />)}</StateTile>
        </div>

        <div style={{ marginTop: 22, fontFamily: kiosk.font.mono, fontSize: 10.5, color: kiosk.color.inkMute, borderTop: `1px dashed ${kiosk.color.rule}`, paddingTop: 12, lineHeight: 1.6 }}>
          {lang === "DE"
            ? "CC-Hinweis \u00b7 Falsches-PW + E-Mail-unbekannt zeigen denselben generischen Ton nach au\u00dfen (kein Account-Enumeration-Leak); die feineren Texte hier sind nur f\u00fcr die Design-Abstimmung. Rate-Limit triggert nach 5 Fehlversuchen."
            : "CC note \u00b7 wrong-password + email-not-found present the same generic tone externally (no account-enumeration leak); the finer copy here is for design review only. Rate-limit triggers after 5 failed attempts."}
        </div>
      </div>
    </div>
  );
}

// Mobile vertical stack — key states only
function AuthStateMatrixMobile({ lang = "DE" }) {
  const items = [
    { n: "01", l: lang === "DE" ? "Anmelden \u00b7 Ruhe" : "Sign in \u00b7 idle", node: <AuthLoginBody lang={lang} state="idle" /> },
    { n: "02", l: lang === "DE" ? "Falsches Passwort" : "Wrong password", node: <AuthLoginBody lang={lang} state="wrongpw" /> },
    { n: "03", l: lang === "DE" ? "Nicht best\u00e4tigt" : "Unverified", node: <AuthLoginBody lang={lang} state="unverified" /> },
    { n: "04", l: lang === "DE" ? "Gesperrt" : "Rate-limited", node: <AuthLoginBody lang={lang} state="ratelimited" /> },
    { n: "05", l: lang === "DE" ? "Registrieren \u00b7 E-Mail vergeben" : "Register \u00b7 email taken", node: <AuthRegisterBody lang={lang} state="emailtaken" /> },
    { n: "06", l: lang === "DE" ? "Best\u00e4tigung gesendet" : "Verify sent", node: <AuthVerifyBody lang={lang} state="sent" /> },
    { n: "07", l: lang === "DE" ? "Best\u00e4tigt" : "Confirmed", node: <AuthVerifyBody lang={lang} state="confirmed" /> },
  ];
  return (
    <div style={{ width: 390, background: kiosk.color.paper, color: kiosk.color.ink, fontFamily: kiosk.font.display, position: "relative", padding: "22px 18px 30px" }}>
      <style>{kioskFonts}</style>
      <style>{authKeyframes + "@keyframes spin{to{transform:rotate(360deg)}}@keyframes authBlink{0%,49%{opacity:1}50%,100%{opacity:0}}"}</style>
      <div style={paperGrainStyle} />
      <div style={{ position: "relative" }}>
        <AuthEyebrow>AUTH \u00b7 {lang === "DE" ? "MOBIL \u00b7 ZUST\u00c4NDE" : "MOBILE \u00b7 STATES"}</AuthEyebrow>
        <AuthHeadline size={26}>{lang === "DE" ? <>Schl\u00fcssel\u00ad<AuthAccentWord>zust\u00e4nde</AuthAccentWord></> : <>Key <AuthAccentWord>states</AuthAccentWord></>}</AuthHeadline>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 18 }}>
          {items.map((it) => (
            <div key={it.n}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, fontWeight: 700, color: kiosk.color.paper, background: kiosk.color.ink, borderRadius: kiosk.r.sm, padding: "2px 7px" }}>{it.n}</span>
                <span style={{ fontFamily: kiosk.font.display, fontSize: 13.5, fontWeight: 700 }}>{it.l}</span>
              </div>
              <div style={{ border: kiosk.border.ink, borderRadius: kiosk.r.md, overflow: "hidden", background: kiosk.color.paper }}>
                <div style={{ padding: 14 }}><AuthCard>{it.node}</AuthCard></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  Export
// ═══════════════════════════════════════════════════════════

Object.assign(window, {
  AuthForgotBody, AuthForgotFlow, AuthForgotDesktop, AuthForgotMobile,
  AuthStateMatrixDesktop, AuthStateMatrixMobile,
});
