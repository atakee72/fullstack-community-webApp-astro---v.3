import type { APIRoute } from 'astro';
import { ResetPasswordSchema } from '../../../schemas/auth.schema';
import { resetPasswordWithToken } from '../../../lib/auth/passwordReset';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = ResetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      const fields = parsed.error.flatten().fieldErrors;
      const reason = fields.password ? 'weak_password' : fields.confirmPassword ? 'mismatch' : 'invalid_input';
      return new Response(JSON.stringify({ error: reason }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const ok = await resetPasswordWithToken(parsed.data.token, parsed.data.password);
    if (!ok) {
      // Generic — never reveal whether the token was unknown, expired, or already used.
      return new Response(JSON.stringify({ error: 'invalid_or_expired' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('reset-password error:', err);
    return new Response(JSON.stringify({ error: 'server_error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
