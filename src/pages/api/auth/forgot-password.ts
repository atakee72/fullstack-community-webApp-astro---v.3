import type { APIRoute } from 'astro';
import { connectDB } from '../../../lib/mongodb';
import { PasswordResetSchema } from '../../../schemas/auth.schema';
import { createPasswordResetToken } from '../../../lib/auth/passwordReset';
import { sendPasswordResetEmail } from '../../../lib/auth/sendResetEmail';
import { getTrustedBaseUrl } from '../../../lib/auth/baseUrl';

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
        // SECURITY: trusted-base + prod fail-closed logic lives in
        // src/lib/auth/baseUrl.ts (CWE-640 — see comment there).
        const base = getTrustedBaseUrl(request);
        if (base) {
          await sendPasswordResetEmail(email, `${base}/reset-password?token=${rawToken}`);
        } else {
          console.error('forgot-password: NEXTAUTH_URL not configured in production — refusing to build a reset link from the untrusted Host header');
        }
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
