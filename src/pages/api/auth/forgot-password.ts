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
        const origin = new URL(request.url).origin;
        const link = `${origin}/reset-password?token=${rawToken}`;
        await sendPasswordResetEmail(email, link);
      }
      // rawToken === null → resend guard hit; silently succeed (still generic).
    }

    return generic();
  } catch (err) {
    console.error('forgot-password error:', err);
    // Still generic on internal error — don't leak anything.
    return generic();
  }
};
