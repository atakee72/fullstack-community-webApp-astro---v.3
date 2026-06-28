import type { APIRoute } from 'astro';
import { connectDB } from '../../../lib/mongodb';
import { PasswordResetSchema } from '../../../schemas/auth.schema';
import { createPasswordResetToken } from '../../../lib/auth/passwordReset';
import { sendPasswordResetEmail } from '../../../lib/auth/sendResetEmail';

// Anti-enumeration: this endpoint ALWAYS returns the same generic 200 — it never
// reveals whether an account exists for the given email.
export const POST: APIRoute = async ({ request }) => {
  const generic = () =>
    new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = PasswordResetSchema.safeParse(body);
    // Even a malformed email returns the generic response (no enumeration / probing signal).
    if (!parsed.success) return generic();

    const email = parsed.data.email;
    const db = await connectDB();
    const user = await db.collection('users').findOne({ email });

    if (user) {
      const rawToken = await createPasswordResetToken(user._id.toString());
      if (rawToken) {
        // SECURITY: build the link from the TRUSTED configured base URL, NOT the
        // request Host header. `new URL(request.url).origin` reflects the attacker-
        // controllable Host, which would let a poisoned-Host reset request mail the
        // victim a link pointing at an attacker domain (token-leak → account
        // takeover). NEXTAUTH_URL is the canonical app origin in prod; fall back to
        // the request origin only in dev (where NEXTAUTH_URL is unset / not a threat).
        const base = (import.meta.env.NEXTAUTH_URL || new URL(request.url).origin).replace(/\/+$/, '');
        const link = `${base}/reset-password?token=${rawToken}`;
        await sendPasswordResetEmail(email, link);
      }
      // rawToken === null → resend guard hit; silently succeed (still generic).
      // NOTE (accepted/deferred): the known-user path is measurably slower than the
      // unknown path (DB write + email I/O), a timing side-channel (CWE-208). The
      // response BODY/STATUS never enumerates; equalizing timing needs a constant-
      // time or background-job design — deferred to the auth rate-limit/hardening plan.
    }

    return generic();
  } catch (err) {
    console.error('forgot-password error:', err);
    // Still generic on internal error — don't leak anything.
    return generic();
  }
};
