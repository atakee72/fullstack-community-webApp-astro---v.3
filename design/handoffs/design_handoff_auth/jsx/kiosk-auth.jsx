/* global React, kiosk, kioskFonts, paperGrainStyle, KioskBtn */

// ══════════════════════════════════════════════════════════
//  KIOSK · AUTH  (Batch 3 · lead surface)
//  Editorial Kiosk applied to the front door: splash · login ·
//  register · email-verify. Auth is the brand-front, so it gets
//  its own carved accent — OCHRE — the one primary hue no other
//  surface uses (Forum=wine · Calendar=teal · Marketplace=wine ·
//  Newsboard=ink). Warm, welcoming, "come in".
//
//  Codebase facts honored:
//   · Login/Register currently use BaseLayout (grain-less). These
//     mocks show what KioskLayout brings: paper grain + masthead.
//   · Splash = 56KB H.264 logo video, one-per-session. Mocked here
//     as a CSS reveal (canvas can't play the real video) + 3 stills.
//   · Kiez-verification stays OUT of auth (hardcoded badge earned
//     later) — register asks only name · email · password.
//   · Novel: the splash + login carry a "heute im Kiez" heartbeat —
//     a live line (events · posts · air) so the door feels alive
//     before you're even in.
//  Tokens extend window.kiosk; nothing duplicated.
// ══════════════════════════════════════════════════════════

const AUTH_ACCENT = kiosk.color.ochre;

// ─── Auth-only keyframes (splash reveal + heartbeat pulse) ───
const authKeyframes = `
  @keyframes authCarveIn {
    0%   { opacity: 0; transform: translateY(14px) scale(0.82) rotate(-8deg); }
    14%  { opacity: 1; transform: translateY(0) scale(1) rotate(-4deg); }
    74%  { opacity: 1; transform: translateY(0) scale(1) rotate(-4deg); }
    88%  { opacity: 0; transform: translateY(-8px) scale(0.96) rotate(-4deg); }
    100% { opacity: 0; transform: translateY(-8px) scale(0.96) rotate(-4deg); }
  }
  @keyframes authWordIn {
    0%, 10%  { opacity: 0; letter-spacing: 0.24em; transform: translateY(8px); }
    26%      { opacity: 1; letter-spacing: -0.03em; transform: translateY(0); }
    74%      { opacity: 1; letter-spacing: -0.03em; transform: translateY(0); }
    88%, 100%{ opacity: 0; transform: translateY(-6px); }
  }
  @keyframes authFadeUp {
    0%, 24%  { opacity: 0; transform: translateY(10px); }
    42%      { opacity: 1; transform: translateY(0); }
    74%      { opacity: 1; transform: translateY(0); }
    88%, 100%{ opacity: 0; }
  }
  @keyframes authPulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50%      { transform: scale(1.55); opacity: 0.35; }
  }
  @keyframes authBlink { 0%,49%{opacity:1;} 50%,100%{opacity:0;} }
  @keyframes authProgress {
    0% { transform: scaleX(0); } 78% { transform: scaleX(1); } 100% { transform: scaleX(1); }
  }
  @keyframes authTick {
    0%, 46% { transform: translateY(0); }
    50%     { transform: translateY(-1.05em); }
    96%,100%{ transform: translateY(-1.05em); }
  }
`;

// ═══════════════════════════════════════════════════════════
//  Atoms
// ═══════════════════════════════════════════════════════════

// Carved 'm' lockup — the riso monogram, ink rule + offset print
function AuthMonogram({ size = 64, accent = AUTH_ACCENT, animClass }) {
  return (
    <div className={animClass} style={{
      width: size, height: size, flexShrink: 0,
      background: accent, color: kiosk.color.ink,
      borderRadius: "50%", border: kiosk.border.inkBold,
      boxShadow: kiosk.shadow.print(),
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400,
      fontSize: size * 0.62, lineHeight: 1, transform: "rotate(-4deg)",
    }}>m</div>
  );
}

function AuthWordmark({ size = 40, sub = true }) {
  return (
    <div>
      <div style={{ fontFamily: kiosk.font.display, fontWeight: 800, fontSize: size, letterSpacing: "-0.035em", lineHeight: 0.95, color: kiosk.color.ink }}>mahalle</div>
      {sub && <div style={{ fontFamily: kiosk.font.mono, fontSize: size * 0.22, color: kiosk.color.inkMute, letterSpacing: "0.14em", marginTop: 3 }}>SCHILLERKIEZ · NEUKÖLLN</div>}
    </div>
  );
}

// DE/EN switcher (logged-out chrome)
function AuthLangToggle({ lang = "DE" }) {
  return (
    <div style={{ display: "flex", border: kiosk.border.ink, borderRadius: kiosk.r.pill, overflow: "hidden", fontFamily: kiosk.font.mono, fontSize: 11, fontWeight: 600 }}>
      <span style={{ padding: "5px 11px", background: lang === "DE" ? kiosk.color.ink : "transparent", color: lang === "DE" ? kiosk.color.paper : kiosk.color.ink }}>DE</span>
      <span style={{ padding: "5px 11px", background: lang === "EN" ? kiosk.color.ink : "transparent", color: lang === "EN" ? kiosk.color.paper : kiosk.color.ink, borderLeft: kiosk.border.ink }}>EN</span>
    </div>
  );
}

// Top masthead ribbon for auth pages
function AuthMasthead({ lang = "DE", mobile = false }) {
  return (
    <header style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: mobile ? "12px 18px" : "18px 32px",
      borderBottom: `1px dashed ${kiosk.color.rule}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: mobile ? 30 : 34, height: mobile ? 30 : 34, background: AUTH_ACCENT,
          borderRadius: "50%", border: kiosk.border.ink, transform: "rotate(-4deg)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: mobile ? 18 : 20, color: kiosk.color.ink,
        }}>m</div>
        <div style={{ fontSize: mobile ? 17 : 20, fontWeight: 800, letterSpacing: "-0.03em" }}>mahalle</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {!mobile && <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, letterSpacing: "0.12em" }}>SCHILLERKIEZ · NEUKÖLLN · BERLIN</span>}
        <AuthLangToggle lang={lang} />
      </div>
    </header>
  );
}

// Eyebrow label above headline
function AuthEyebrow({ children, accent = AUTH_ACCENT }) {
  return (
    <div style={{ fontFamily: kiosk.font.mono, fontSize: 11, letterSpacing: "0.18em", color: accent, fontWeight: 600 }}>{children}</div>
  );
}

// Italic-accent headline helper
function AuthHeadline({ children, size = 38 }) {
  return (
    <h1 style={{ fontFamily: kiosk.font.display, fontWeight: 800, fontSize: size, letterSpacing: "-0.035em", lineHeight: 1.0, margin: "8px 0 0", color: kiosk.color.ink }}>{children}</h1>
  );
}
function AuthAccentWord({ children }) {
  return <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: AUTH_ACCENT }}>{children}</span>;
}

// Field — recessed paper, ink rule on focus, supports error / hint / show-toggle
function AuthField({ label, placeholder, value, type = "text", focused, error, success, icon, hint, showToggle, revealed, disabled }) {
  const borderColor = error ? kiosk.color.danger : success ? kiosk.color.success : focused ? kiosk.color.ink : kiosk.color.rule;
  const display = value && type === "password" && !revealed ? "•".repeat(value.length) : (value || "");
  return (
    <label style={{ display: "block", opacity: disabled ? 0.55 : 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
        <span style={{ fontFamily: kiosk.font.mono, fontSize: 10.5, letterSpacing: "0.1em", color: kiosk.color.inkSoft, textTransform: "uppercase" }}>{label}</span>
        {hint && <span style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: error ? kiosk.color.danger : kiosk.color.inkMute }}>{hint}</span>}
      </div>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        background: kiosk.color.paperSoft,
        border: `${focused || error ? "1.5px" : "1px"} solid ${borderColor}`,
        borderRadius: kiosk.r.md, padding: "11px 13px",
        boxShadow: focused ? `inset 0 0 0 2px ${kiosk.color.paper}` : "none",
      }}>
        {icon && <span style={{ fontSize: 13, opacity: 0.55 }}>{icon}</span>}
        <span style={{ flex: 1, fontSize: 14.5, fontFamily: kiosk.font.display, color: value ? kiosk.color.ink : kiosk.color.inkMute, letterSpacing: type === "password" && !revealed && value ? "0.12em" : "0" }}>
          {display || placeholder}
        </span>
        {focused && <span style={{ width: 1.5, height: 16, background: kiosk.color.ink, animation: "authBlink 1s step-end infinite" }} />}
        {showToggle && (
          <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, letterSpacing: "0.05em", cursor: "pointer", borderBottom: `1px dashed ${kiosk.color.inkMute}` }}>
            {revealed ? "verbergen" : "zeigen"}
          </span>
        )}
        {success && <span style={{ color: kiosk.color.success, fontSize: 13 }}>✓</span>}
      </div>
      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 5, fontFamily: kiosk.font.mono, fontSize: 10.5, color: kiosk.color.danger }}>
          <span>✕</span>{error}
        </div>
      )}
    </label>
  );
}

// Password strength meter — 4 segments
function AuthStrength({ score = 0, lang = "DE" }) {
  const labels = lang === "DE"
    ? ["zu kurz", "schwach", "ok", "gut", "stark"]
    : ["too short", "weak", "ok", "good", "strong"];
  const colors = [kiosk.color.danger, kiosk.color.danger, kiosk.color.warn, kiosk.color.moss, kiosk.color.success];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 7 }}>
      <div style={{ display: "flex", gap: 4, flex: 1 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{
            flex: 1, height: 5, borderRadius: 3,
            background: i < score ? colors[score] : kiosk.color.rule,
            border: `1px solid ${i < score ? kiosk.color.ink : "transparent"}`,
            transition: "background 220ms",
          }} />
        ))}
      </div>
      <span style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: colors[score], letterSpacing: "0.06em", width: 44, textAlign: "right" }}>{labels[score]}</span>
    </div>
  );
}

// Primary button — ink fill, ochre print shadow, full-width auth variant
function AuthPrimaryBtn({ children, loading, disabled, accent = AUTH_ACCENT, lang = "DE" }) {
  return (
    <button disabled={disabled} style={{
      width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
      background: disabled ? kiosk.color.inkMute : kiosk.color.ink, color: kiosk.color.paper,
      fontFamily: kiosk.font.display, fontSize: 15, fontWeight: 700, letterSpacing: "-0.005em",
      padding: "13px 18px", borderRadius: kiosk.r.pill,
      border: `1.5px solid ${kiosk.color.ink}`,
      boxShadow: disabled ? "none" : kiosk.shadow.print(accent),
      cursor: disabled ? "not-allowed" : "pointer",
    }}>
      {loading && <span style={{ width: 13, height: 13, borderRadius: "50%", border: `2px solid ${kiosk.color.paper}`, borderTopColor: "transparent", display: "inline-block", animation: "spin 0.7s linear infinite" }} />}
      {children}
    </button>
  );
}

// Secondary text link row
function AuthAltRow({ children }) {
  return <div style={{ textAlign: "center", fontFamily: kiosk.font.display, fontSize: 13.5, color: kiosk.color.inkSoft }}>{children}</div>;
}
function AuthInlineLink({ children, accent }) {
  return <span style={{ fontWeight: 700, color: kiosk.color.ink, borderBottom: `2px solid ${accent || AUTH_ACCENT}`, cursor: "pointer" }}>{children}</span>;
}

// "oder" divider
function AuthOrRule({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "2px 0" }}>
      <div style={{ flex: 1, borderTop: `1px dashed ${kiosk.color.rule}` }} />
      <span style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute, letterSpacing: "0.16em", textTransform: "uppercase" }}>{label}</span>
      <div style={{ flex: 1, borderTop: `1px dashed ${kiosk.color.rule}` }} />
    </div>
  );
}

// ─── Novel feature · "heute im Kiez" heartbeat ───
// Live line so the door feels alive before login. Pulsing dot + ticking count.
function KiezHeartbeat({ lang = "DE", animated = false, compact = false }) {
  const stats = lang === "DE"
    ? [{ n: "3", l: "Events heute" }, { n: "12", l: "neue Beiträge" }, { n: "18", l: "µg/m³ · Luft gut" }]
    : [{ n: "3", l: "events today" }, { n: "12", l: "new posts" }, { n: "18", l: "µg/m³ · air good" }];
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: compact ? 10 : 16,
      padding: compact ? "7px 12px" : "9px 16px",
      background: kiosk.color.paperWarm, border: kiosk.border.ink, borderRadius: kiosk.r.pill,
      boxShadow: kiosk.shadow.printSm(),
      fontFamily: kiosk.font.mono, fontSize: compact ? 10 : 11, color: kiosk.color.inkSoft,
    }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: kiosk.color.ink, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", fontSize: compact ? 9 : 10 }}>
        <span style={{ position: "relative", width: 8, height: 8 }}>
          <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: kiosk.color.success, animation: animated ? "authPulse 1.8s ease-in-out infinite" : "none" }} />
          <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: kiosk.color.success }} />
        </span>
        {lang === "DE" ? "live im Kiez" : "live in the Kiez"}
      </span>
      {stats.map((s, i) => (
        <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 1, height: 12, background: kiosk.color.rule }} />
          <b style={{ color: kiosk.color.ink, fontWeight: 700 }}>{s.n}</b> {s.l}
        </span>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  Shells — desktop frame + mobile frame (centered card on paper)
// ═══════════════════════════════════════════════════════════

function AuthShellDesktop({ lang = "DE", children, footer, width = 1280, height = 860, maxCard = 460 }) {
  return (
    <div style={{ width, height, background: kiosk.color.paper, color: kiosk.color.ink, fontFamily: kiosk.font.display, position: "relative", overflow: "hidden" }}>
      <style>{kioskFonts}</style>
      <style>{authKeyframes + "@keyframes spin{to{transform:rotate(360deg)}}"}</style>
      <div style={paperGrainStyle} />
      <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column" }}>
        <AuthMasthead lang={lang} />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "28px 32px" }}>
          <div style={{ width: "100%", maxWidth: maxCard }}>{children}</div>
        </div>
        {footer !== undefined ? footer : (
          <div style={{ display: "flex", justifyContent: "center", padding: "0 0 26px" }}>
            <KiezHeartbeat lang={lang} animated />
          </div>
        )}
      </div>
    </div>
  );
}

function AuthShellMobile({ lang = "DE", children, footer }) {
  return (
    <div style={{ width: 390, height: 844, background: kiosk.color.paper, color: kiosk.color.ink, fontFamily: kiosk.font.display, position: "relative", overflow: "hidden" }}>
      <style>{kioskFonts}</style>
      <style>{authKeyframes + "@keyframes spin{to{transform:rotate(360deg)}}"}</style>
      <div style={paperGrainStyle} />
      <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column" }}>
        <AuthMasthead lang={lang} mobile />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "20px 22px" }}>
          {children}
        </div>
        {footer !== undefined ? footer : (
          <div style={{ display: "flex", justifyContent: "center", padding: "0 0 18px" }}>
            <KiezHeartbeat lang={lang} animated compact />
          </div>
        )}
      </div>
    </div>
  );
}

// The card surface that holds form content
function AuthCard({ children, accent = AUTH_ACCENT }) {
  return (
    <div style={{
      background: kiosk.color.paperWarm, border: kiosk.border.ink, borderRadius: kiosk.r.xl,
      boxShadow: kiosk.shadow.print(), padding: 30,
      borderTop: `4px solid ${accent}`,
    }}>{children}</div>
  );
}

// ═══════════════════════════════════════════════════════════
//  SPLASH  (one-per-session H.264 logo video → CSS mock)
// ═══════════════════════════════════════════════════════════

// Animated splash — loops a ~6s reveal so the canvas shows it's alive.
function AuthSplash({ lang = "DE", width = 1280, height = 860 }) {
  return (
    <div style={{ width, height, background: kiosk.color.paper, color: kiosk.color.ink, fontFamily: kiosk.font.display, position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{kioskFonts}</style>
      <style>{authKeyframes}</style>
      <div style={paperGrainStyle} />

      {/* corner registration marks — riso print feel */}
      {[["18px","18px",null,null],[null,"18px","18px",null],["18px",null,null,"18px"],[null,null,"18px","18px"]].map((p, i) => (
        <div key={i} style={{ position: "absolute", top: p[0], right: p[1], bottom: p[2], left: p[3], width: 18, height: 18, borderTop: i < 2 ? `1.5px solid ${kiosk.color.inkMute}` : "none", borderBottom: i >= 2 ? `1.5px solid ${kiosk.color.inkMute}` : "none", borderLeft: (i === 0 || i === 2) ? `1.5px solid ${kiosk.color.inkMute}` : "none", borderRight: (i === 1 || i === 3) ? `1.5px solid ${kiosk.color.inkMute}` : "none", opacity: 0.5 }} />
      ))}

      <div style={{ position: "relative", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <div style={{ animation: "authCarveIn 6s ease-in-out infinite" }}>
            <AuthMonogram size={110} />
          </div>
        </div>
        <div style={{ animation: "authWordIn 6s ease-in-out infinite" }}>
          <div style={{ fontFamily: kiosk.font.display, fontWeight: 800, fontSize: 76, letterSpacing: "-0.04em", lineHeight: 0.9, color: kiosk.color.ink }}>mahalle</div>
        </div>
        <div style={{ animation: "authFadeUp 6s ease-in-out infinite" }}>
          <div style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 21, color: kiosk.color.inkSoft, marginTop: 10 }}>
            {lang === "DE" ? "dein Kiez, an einem Ort" : "your Kiez, in one place"}
          </div>
          <div style={{ display: "flex", justifyContent: "center", marginTop: 26 }}>
            <KiezHeartbeat lang={lang} animated />
          </div>
        </div>
      </div>

      {/* loading progress hairline */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 4, background: kiosk.color.paperSoft }}>
        <div style={{ height: "100%", background: AUTH_ACCENT, transformOrigin: "left", animation: "authProgress 6s ease-in-out infinite" }} />
      </div>
      <div style={{ position: "absolute", bottom: 14, left: 0, right: 0, textAlign: "center", fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, letterSpacing: "0.16em" }}>
        {lang === "DE" ? "WIRD GELADEN · SCHILLERKIEZ" : "LOADING · SCHILLERKIEZ"}
      </div>
    </div>
  );
}

// Static keyframe still — for developer handoff (shows the arc frame-by-frame)
function AuthSplashStill({ lang = "DE", frame = "mid", width = 410, height = 520 }) {
  // frame: "in" (m carving) | "mid" (wordmark appearing) | "full" (settled + heartbeat)
  const showWord = frame !== "in";
  const showRest = frame === "full";
  const mTransform = frame === "in" ? "translateY(10px) scale(0.84) rotate(-8deg)" : "rotate(-4deg)";
  const mOpacity = 1;
  return (
    <div style={{ width, height, background: kiosk.color.paper, color: kiosk.color.ink, fontFamily: kiosk.font.display, position: "relative", overflow: "hidden", border: kiosk.border.ink, borderRadius: kiosk.r.lg }}>
      <style>{kioskFonts}</style>
      <div style={paperGrainStyle} />
      <div style={{ position: "absolute", top: 10, left: 12, fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute, letterSpacing: "0.14em" }}>
        {frame === "in" ? "t ≈ 0.4s" : frame === "mid" ? "t ≈ 1.4s" : "t ≈ 2.6s"}
      </div>
      <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ transform: mTransform, opacity: mOpacity, marginBottom: 18 }}>
          <AuthMonogram size={70} />
        </div>
        {showWord && (
          <div style={{ fontFamily: kiosk.font.display, fontWeight: 800, fontSize: 44, letterSpacing: frame === "mid" ? "0.04em" : "-0.04em", lineHeight: 0.9, opacity: frame === "mid" ? 0.6 : 1 }}>mahalle</div>
        )}
        {showRest && (
          <>
            <div style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 15, color: kiosk.color.inkSoft, marginTop: 7 }}>{lang === "DE" ? "dein Kiez, an einem Ort" : "your Kiez, in one place"}</div>
            <div style={{ marginTop: 16 }}><KiezHeartbeat lang={lang} compact /></div>
          </>
        )}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 4, background: kiosk.color.paperSoft }}>
        <div style={{ height: "100%", width: frame === "in" ? "28%" : frame === "mid" ? "62%" : "100%", background: AUTH_ACCENT }} />
      </div>
    </div>
  );
}

// Three-still strip + annotation, for the handoff artboard
function AuthSplashSpec({ lang = "DE" }) {
  return (
    <div style={{ width: 1280, background: kiosk.color.paper, color: kiosk.color.ink, fontFamily: kiosk.font.display, position: "relative", padding: "32px 40px 40px" }}>
      <style>{kioskFonts}</style>
      <div style={paperGrainStyle} />
      <div style={{ position: "relative" }}>
        <AuthEyebrow>SPLASH · {lang === "DE" ? "EINMAL PRO SITZUNG" : "ONCE PER SESSION"}</AuthEyebrow>
        <AuthHeadline size={34}>{lang === "DE" ? <>Der <AuthAccentWord>Vorhang</AuthAccentWord> geht auf.</> : <>The <AuthAccentWord>curtain</AuthAccentWord> rises.</>}</AuthHeadline>
        <p style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 16, color: kiosk.color.inkSoft, maxWidth: 720, margin: "10px 0 24px" }}>
          {lang === "DE"
            ? "Heute: 56 KB H.264-Logovideo, genau einmal pro Sitzung. Hier als CSS-Reveal nachgebaut (Canvas spielt kein Video) — links die echte Animation, rechts die Keyframes für die Übergabe."
            : "Today: a 56KB H.264 logo video, exactly once per session. Mocked here as a CSS reveal (canvas can't play video) — the live animation on the left, the keyframes on the right for handoff."}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1fr", gap: 16, alignItems: "stretch" }}>
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", top: -9, left: 12, zIndex: 2, fontFamily: kiosk.font.mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", background: AUTH_ACCENT, color: kiosk.color.ink, border: kiosk.border.ink, borderRadius: kiosk.r.sm, padding: "2px 8px" }}>LIVE · LOOP</div>
            <AuthSplash lang={lang} width="100%" height={520} />
          </div>
          <AuthSplashStill lang={lang} frame="in" width="100%" height={520} />
          <AuthSplashStill lang={lang} frame="mid" width="100%" height={520} />
          <AuthSplashStill lang={lang} frame="full" width="100%" height={520} />
        </div>
        <div style={{ display: "flex", gap: 24, marginTop: 22, fontFamily: kiosk.font.mono, fontSize: 11, lineHeight: 1.7, color: kiosk.color.inkSoft, flexWrap: "wrap" }}>
          <div><b style={{ color: kiosk.color.ink }}>0 → 1.2s</b> · {lang === "DE" ? "Monogramm carved-in (pop · rotate −8→−4°)" : "monogram carves in (pop · rotate −8→−4°)"}</div>
          <div><b style={{ color: kiosk.color.ink }}>0.8 → 1.8s</b> · {lang === "DE" ? "Wortmarke tracking-in" : "wordmark tracks in"}</div>
          <div><b style={{ color: kiosk.color.ink }}>1.8 → 2.6s</b> · {lang === "DE" ? "Tagline + Heartbeat fade-up" : "tagline + heartbeat fade-up"}</div>
          <div><b style={{ color: kiosk.color.ink }}>→</b> {lang === "DE" ? "danach: Auto-Übergang zu /login oder Feed" : "then: auto-advance to /login or feed"}</div>
        </div>
        <div style={{ marginTop: 14, fontFamily: kiosk.font.mono, fontSize: 10.5, color: kiosk.color.inkMute, borderTop: `1px dashed ${kiosk.color.rule}`, paddingTop: 12 }}>
          {lang === "DE"
            ? "CC-Hinweis · prefers-reduced-motion: Reveal überspringen, direkt Vollbild zeigen. sessionStorage-Flag „splashSeen“ gate behält die Einmal-pro-Sitzung-Logik bei."
            : "CC note · prefers-reduced-motion: skip the reveal, show the settled frame. sessionStorage flag „splashSeen“ preserves the once-per-session gate."}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  LOGIN
// ═══════════════════════════════════════════════════════════

function AuthLoginBody({ lang = "DE", state = "idle" }) {
  // state: idle | filled | wrongpw | notfound | unverified | ratelimited | loading | success
  const t = lang === "DE" ? {
    eye: "ANMELDEN", h1a: "Willkommen ", h1b: "zurück", h1c: " im Kiez.",
    email: "E-Mail", pw: "Passwort", forgot: "Passwort vergessen?",
    cta: "anmelden", or: "oder", alt: "Neu im Kiez? ", altlink: "Registrieren",
    emailPh: "du@beispiel.de", pwPh: "dein Passwort",
  } : {
    eye: "SIGN IN", h1a: "Welcome ", h1b: "back", h1c: " to the Kiez.",
    email: "Email", pw: "Password", forgot: "Forgot password?",
    cta: "sign in", or: "or", alt: "New to the Kiez? ", altlink: "Register",
    emailPh: "you@example.com", pwPh: "your password",
  };

  const emailVal = state === "idle" ? "" : "lena.bergmann@posteo.de";
  const pwVal = state === "idle" || state === "notfound" ? "" : "••••••••••";

  const errors = {
    wrongpw: lang === "DE" ? "Passwort stimmt nicht. Noch 3 Versuche." : "Wrong password. 3 attempts left.",
    notfound: lang === "DE" ? "Kein Konto mit dieser E-Mail." : "No account with this email.",
  };

  return (
    <AuthCard>
      <AuthEyebrow>{t.eye}</AuthEyebrow>
      <AuthHeadline>{t.h1a}<AuthAccentWord>{t.h1b}</AuthAccentWord>{t.h1c}</AuthHeadline>

      {/* Banners for special states */}
      {state === "unverified" && (
        <AuthBanner kind="warn" lang={lang}
          title={lang === "DE" ? "E-Mail noch nicht bestätigt" : "Email not verified yet"}
          body={lang === "DE" ? "Wir haben dir einen Link geschickt. Bitte bestätige zuerst dein Postfach." : "We sent you a link. Please confirm your inbox first."}
          action={lang === "DE" ? "Link erneut senden" : "Resend link"} />
      )}
      {state === "ratelimited" && (
        <AuthBanner kind="danger" lang={lang}
          title={lang === "DE" ? "Zu viele Versuche" : "Too many attempts"}
          body={lang === "DE" ? "Aus Sicherheitsgründen pausiert. Versuch es in 4:32 Min. erneut." : "Paused for security. Try again in 4:32 min."} />
      )}
      {state === "success" && (
        <AuthBanner kind="success" lang={lang}
          title={lang === "DE" ? "Willkommen zurück, Lena" : "Welcome back, Lena"}
          body={lang === "DE" ? "Du wirst weitergeleitet …" : "Redirecting you …"} />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 22 }}>
        <AuthField label={t.email} placeholder={t.emailPh} value={emailVal} icon="✉"
          error={state === "notfound" ? errors.notfound : null}
          success={["filled","wrongpw","unverified","loading","success"].includes(state)}
          disabled={state === "ratelimited"} />
        <div>
          <AuthField label={t.pw} placeholder={t.pwPh} type="password" value={pwVal}
            focused={state === "filled"} showToggle
            error={state === "wrongpw" ? errors.wrongpw : null}
            disabled={state === "ratelimited"} />
          <div style={{ textAlign: "right", marginTop: 7 }}>
            <span style={{ fontFamily: kiosk.font.mono, fontSize: 11, color: kiosk.color.inkSoft, borderBottom: `1px dashed ${kiosk.color.inkMute}`, cursor: "pointer" }}>{t.forgot}</span>
          </div>
        </div>
        <AuthPrimaryBtn loading={state === "loading"} disabled={state === "ratelimited"} lang={lang}>
          {state === "loading" ? (lang === "DE" ? "anmelden …" : "signing in …") : state === "success" ? (lang === "DE" ? "angemeldet ✓" : "signed in ✓") : t.cta}
        </AuthPrimaryBtn>
      </div>

      <div style={{ margin: "20px 0 16px" }}><AuthOrRule label={t.or} /></div>
      <AuthAltRow>{t.alt}<AuthInlineLink>{t.altlink}</AuthInlineLink></AuthAltRow>
    </AuthCard>
  );
}

// Banner used across auth states
function AuthBanner({ kind = "warn", title, body, action, lang }) {
  const map = {
    warn: { bg: "#fbf1d8", bd: kiosk.color.warn, ic: "◐", fg: kiosk.color.warn },
    danger: { bg: "#f7e2e2", bd: kiosk.color.danger, ic: "✕", fg: kiosk.color.danger },
    success: { bg: "#e7f0dd", bd: kiosk.color.success, ic: "✓", fg: kiosk.color.success },
    info: { bg: kiosk.color.sky + "55", bd: kiosk.color.info, ic: "i", fg: kiosk.color.info },
  };
  const m = map[kind];
  return (
    <div style={{ display: "flex", gap: 11, marginTop: 18, padding: "12px 14px", background: m.bg, border: `1.5px solid ${m.bd}`, borderRadius: kiosk.r.md }}>
      <span style={{ width: 20, height: 20, flexShrink: 0, borderRadius: "50%", background: m.bd, color: kiosk.color.paper, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, marginTop: 1 }}>{m.ic}</span>
      <div>
        <div style={{ fontFamily: kiosk.font.display, fontWeight: 700, fontSize: 13.5, color: kiosk.color.ink }}>{title}</div>
        {body && <div style={{ fontFamily: kiosk.font.display, fontSize: 12.5, color: kiosk.color.inkSoft, lineHeight: 1.45, marginTop: 2 }}>{body}</div>}
        {action && <div style={{ marginTop: 7 }}><span style={{ fontFamily: kiosk.font.mono, fontSize: 11, color: kiosk.color.ink, fontWeight: 600, borderBottom: `2px solid ${m.bd}`, cursor: "pointer" }}>{action} →</span></div>}
      </div>
    </div>
  );
}

function AuthLoginDesktop({ lang = "DE", state = "idle" }) {
  return <AuthShellDesktop lang={lang}><AuthLoginBody lang={lang} state={state} /></AuthShellDesktop>;
}
function AuthLoginMobile({ lang = "DE", state = "idle" }) {
  return <AuthShellMobile lang={lang}><AuthLoginBody lang={lang} state={state} /></AuthShellMobile>;
}

// ═══════════════════════════════════════════════════════════
//  REGISTER
// ═══════════════════════════════════════════════════════════

function AuthRegisterBody({ lang = "DE", state = "idle" }) {
  // state: idle | filled | emailtaken | weakpw | mismatch | termsunchecked | loading
  const t = lang === "DE" ? {
    eye: "REGISTRIEREN", h1a: "Werde Teil vom ", h1b: "Kiez", h1c: ".",
    name: "Anzeigename", email: "E-Mail", pw: "Passwort", pw2: "Passwort wiederholen",
    namePh: "wie sollen Nachbarn dich nennen?", emailPh: "du@beispiel.de", pwPh: "mind. 8 Zeichen",
    cta: "Konto erstellen", alt: "Schon dabei? ", altlink: "Anmelden",
    terms: "Ich akzeptiere die ", termsA: "Nutzungsbedingungen", termsMid: " und ", termsB: "Datenschutz",
    note: "Kein Klarname nötig. Dein „Verifiziert im Kiez“-Abzeichen vergibt das Team später separat.",
  } : {
    eye: "REGISTER", h1a: "Become part of the ", h1b: "Kiez", h1c: ".",
    name: "Display name", email: "Email", pw: "Password", pw2: "Repeat password",
    namePh: "what should neighbors call you?", emailPh: "you@example.com", pwPh: "min. 8 characters",
    cta: "Create account", alt: "Already here? ", altlink: "Sign in",
    terms: "I accept the ", termsA: "Terms of Use", termsMid: " and ", termsB: "Privacy Policy",
    note: "No legal name required. Your „Verified in the Kiez“ badge is granted separately by the team later.",
  };

  const filled = state !== "idle";
  const nameVal = filled ? "Lena B." : "";
  const emailVal = filled ? "lena.bergmann@posteo.de" : "";
  const pwVal = state === "idle" ? "" : state === "weakpw" ? "lena12" : "••••••••••";
  const pw2Val = state === "idle" || state === "weakpw" ? "" : state === "mismatch" ? "•••••••" : "••••••••••";

  return (
    <AuthCard>
      <AuthEyebrow>{t.eye}</AuthEyebrow>
      <AuthHeadline>{t.h1a}<AuthAccentWord>{t.h1b}</AuthAccentWord>{t.h1c}</AuthHeadline>

      {state === "emailtaken" && (
        <AuthBanner kind="danger" lang={lang}
          title={lang === "DE" ? "E-Mail bereits registriert" : "Email already registered"}
          body={lang === "DE" ? "Es gibt schon ein Konto mit dieser Adresse." : "An account with this address already exists."}
          action={lang === "DE" ? "Stattdessen anmelden" : "Sign in instead"} />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 20 }}>
        <AuthField label={t.name} placeholder={t.namePh} value={nameVal} icon="◷"
          success={filled} />
        <AuthField label={t.email} placeholder={t.emailPh} value={emailVal} icon="✉"
          error={state === "emailtaken" ? (lang === "DE" ? "Diese E-Mail ist vergeben." : "This email is taken.") : null}
          success={filled && state !== "emailtaken"} />
        <div>
          <AuthField label={t.pw} placeholder={t.pwPh} type="password" value={pwVal} showToggle
            focused={state === "weakpw"}
            error={state === "weakpw" ? (lang === "DE" ? "Zu schwach — füge Zahlen & Zeichen hinzu." : "Too weak — add numbers & symbols.") : null} />
          {pwVal && <AuthStrength score={state === "weakpw" ? 1 : 4} lang={lang} />}
        </div>
        <AuthField label={t.pw2} placeholder={t.pwPh} type="password" value={pw2Val}
          error={state === "mismatch" ? (lang === "DE" ? "Passwörter stimmen nicht überein." : "Passwords don't match.") : null}
          success={["filled","loading"].includes(state)} />

        {/* terms checkbox */}
        <label style={{ display: "flex", gap: 9, alignItems: "flex-start", cursor: "pointer", marginTop: 2 }}>
          <span style={{
            width: 18, height: 18, flexShrink: 0, marginTop: 1, borderRadius: 5,
            border: `1.5px solid ${state === "termsunchecked" ? kiosk.color.danger : kiosk.color.ink}`,
            background: (filled && state !== "termsunchecked") ? kiosk.color.ink : "transparent",
            color: kiosk.color.paper, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700,
          }}>{(filled && state !== "termsunchecked") ? "✓" : ""}</span>
          <span style={{ fontFamily: kiosk.font.display, fontSize: 12.5, lineHeight: 1.45, color: state === "termsunchecked" ? kiosk.color.danger : kiosk.color.inkSoft }}>
            {t.terms}<span style={{ color: kiosk.color.ink, fontWeight: 600, borderBottom: `1px solid ${kiosk.color.ink}` }}>{t.termsA}</span>{t.termsMid}<span style={{ color: kiosk.color.ink, fontWeight: 600, borderBottom: `1px solid ${kiosk.color.ink}` }}>{t.termsB}</span>.
          </span>
        </label>

        <AuthPrimaryBtn loading={state === "loading"} lang={lang}>
          {state === "loading" ? (lang === "DE" ? "Konto wird erstellt …" : "creating account …") : t.cta}
        </AuthPrimaryBtn>
      </div>

      <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, lineHeight: 1.5, marginTop: 14, paddingTop: 12, borderTop: `1px dashed ${kiosk.color.rule}` }}>{t.note}</div>
      <div style={{ marginTop: 14 }}><AuthAltRow>{t.alt}<AuthInlineLink>{t.altlink}</AuthInlineLink></AuthAltRow></div>
    </AuthCard>
  );
}

function AuthRegisterDesktop({ lang = "DE", state = "idle" }) {
  return <AuthShellDesktop lang={lang} height={920} maxCard={470}><AuthRegisterBody lang={lang} state={state} /></AuthShellDesktop>;
}
function AuthRegisterMobile({ lang = "DE", state = "idle" }) {
  return <AuthShellMobile lang={lang} footer={null}><AuthRegisterBody lang={lang} state={state} /></AuthShellMobile>;
}

// ═══════════════════════════════════════════════════════════
//  EMAIL VERIFY  (post-register step)
// ═══════════════════════════════════════════════════════════

function AuthVerifyBody({ lang = "DE", state = "sent" }) {
  // state: sent | resent | confirmed
  const email = "lena.bergmann@posteo.de";
  const t = lang === "DE" ? {
    eye: "FAST GESCHAFFT", h1a: "Schau in dein ", h1b: "Postfach", h1c: ".",
    sub: "Wir haben einen Bestätigungslink geschickt an",
    body: "Klick den Link in der Mail, um dein Konto zu aktivieren. Kein Brief da? Prüf den Spam-Ordner.",
    resend: "Link erneut senden", change: "E-Mail ändern", back: "← zurück zur Anmeldung",
    resentNote: "Neuer Link verschickt — gültig für 30 Min.",
    confH: "Bestätigt — willkommen im Kiez.", confB: "Dein Konto ist aktiv. Du wirst weitergeleitet …",
  } : {
    eye: "ALMOST THERE", h1a: "Check your ", h1b: "inbox", h1c: ".",
    sub: "We sent a confirmation link to",
    body: "Click the link in the email to activate your account. No mail? Check your spam folder.",
    resend: "Resend link", change: "Change email", back: "← back to sign in",
    resentNote: "New link sent — valid for 30 min.",
    confH: "Confirmed — welcome to the Kiez.", confB: "Your account is active. Redirecting you …",
  };

  if (state === "confirmed") {
    return (
      <AuthCard>
        <div style={{ textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: kiosk.color.success, border: kiosk.border.inkBold, boxShadow: kiosk.shadow.print(), color: kiosk.color.paper, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, transform: "rotate(-4deg)" }}>✓</div>
          </div>
          <AuthEyebrow accent={kiosk.color.success}>{lang === "DE" ? "KONTO AKTIV" : "ACCOUNT ACTIVE"}</AuthEyebrow>
          <h1 style={{ fontFamily: kiosk.font.display, fontWeight: 800, fontSize: 30, letterSpacing: "-0.03em", lineHeight: 1.05, margin: "8px 0 8px" }}>{t.confH}</h1>
          <p style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 16, color: kiosk.color.inkSoft, margin: 0 }}>{t.confB}</p>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
        <div style={{ position: "relative", width: 72, height: 56 }}>
          <div style={{ width: 72, height: 52, border: kiosk.border.inkBold, borderRadius: kiosk.r.sm, background: kiosk.color.paper, boxShadow: kiosk.shadow.printSm() }} />
          <div style={{ position: "absolute", top: 0, left: 0, width: 0, height: 0, borderLeft: "36px solid transparent", borderRight: "36px solid transparent", borderTop: `26px solid ${AUTH_ACCENT}` }} />
          <div style={{ position: "absolute", top: 2, left: 2, right: 2, height: 24, borderBottom: `2px solid ${kiosk.color.ink}`, clipPath: "polygon(0 0, 50% 90%, 100% 0)" }} />
          <span style={{ position: "absolute", top: -7, right: -7, width: 22, height: 22, borderRadius: "50%", background: kiosk.color.wine, border: kiosk.border.ink, color: kiosk.color.paper, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>1</span>
        </div>
      </div>

      <div style={{ textAlign: "center" }}>
        <AuthEyebrow>{t.eye}</AuthEyebrow>
        <h1 style={{ fontFamily: kiosk.font.display, fontWeight: 800, fontSize: 30, letterSpacing: "-0.03em", lineHeight: 1.05, margin: "8px 0 10px" }}>{t.h1a}<AuthAccentWord>{t.h1b}</AuthAccentWord>{t.h1c}</h1>
        <p style={{ fontFamily: kiosk.font.display, fontSize: 13.5, color: kiosk.color.inkSoft, margin: "0 0 4px" }}>{t.sub}</p>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 13, fontWeight: 600, color: kiosk.color.ink, padding: "5px 0" }}>{email}</div>
        <p style={{ fontFamily: kiosk.font.display, fontSize: 12.5, color: kiosk.color.inkSoft, lineHeight: 1.5, maxWidth: 340, margin: "8px auto 0" }}>{t.body}</p>
      </div>

      {state === "resent" && (
        <AuthBanner kind="success" lang={lang} title={t.resentNote} />
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
        <button style={{ flex: 1, background: kiosk.color.ink, color: kiosk.color.paper, fontFamily: kiosk.font.display, fontSize: 13.5, fontWeight: 700, padding: "11px 14px", borderRadius: kiosk.r.pill, border: kiosk.border.ink, boxShadow: kiosk.shadow.print(AUTH_ACCENT), cursor: "pointer" }}>{t.resend}</button>
        <button style={{ flex: 1, background: "transparent", color: kiosk.color.ink, fontFamily: kiosk.font.display, fontSize: 13.5, fontWeight: 700, padding: "11px 14px", borderRadius: kiosk.r.pill, border: kiosk.border.ink, cursor: "pointer" }}>{t.change}</button>
      </div>
      <div style={{ textAlign: "center", marginTop: 16 }}>
        <span style={{ fontFamily: kiosk.font.mono, fontSize: 11, color: kiosk.color.inkSoft, borderBottom: `1px dashed ${kiosk.color.inkMute}`, cursor: "pointer" }}>{t.back}</span>
      </div>
    </AuthCard>
  );
}

function AuthVerifyDesktop({ lang = "DE", state = "sent" }) {
  return <AuthShellDesktop lang={lang}><AuthVerifyBody lang={lang} state={state} /></AuthShellDesktop>;
}
function AuthVerifyMobile({ lang = "DE", state = "sent" }) {
  return <AuthShellMobile lang={lang}><AuthVerifyBody lang={lang} state={state} /></AuthShellMobile>;
}

// ═══════════════════════════════════════════════════════════
//  Export
// ═══════════════════════════════════════════════════════════

Object.assign(window, {
  AUTH_ACCENT, authKeyframes,
  AuthMonogram, AuthWordmark, AuthLangToggle, AuthMasthead,
  AuthEyebrow, AuthHeadline, AuthAccentWord, AuthField, AuthStrength,
  AuthPrimaryBtn, AuthAltRow, AuthInlineLink, AuthOrRule, KiezHeartbeat,
  AuthShellDesktop, AuthShellMobile, AuthCard, AuthBanner,
  AuthSplash, AuthSplashStill, AuthSplashSpec,
  AuthLoginBody, AuthLoginDesktop, AuthLoginMobile,
  AuthRegisterBody, AuthRegisterDesktop, AuthRegisterMobile,
  AuthVerifyBody, AuthVerifyDesktop, AuthVerifyMobile,
});
