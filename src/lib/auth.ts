import jwt from 'jsonwebtoken';
import { getSession } from 'auth-astro/server';

interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * Admin guard for API endpoints. Returns either a usable session
 * (admin role confirmed) or a Response object the caller should
 * return immediately.
 *
 * Usage:
 *   const guard = await requireAdminSession(request);
 *   if (!guard.ok) return guard.response;
 *   // ...guard.userId is set
 *
 * Why a tagged-union return instead of throwing: keeps endpoint
 * handlers as plain async functions without try/catch noise, and the
 * Response is already pre-shaped with the right status code +
 * JSON body.
 */
export async function requireAdminSession(
  request: Request
): Promise<{ ok: true; userId: string } | { ok: false; response: Response }> {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    };
  }
  if (session.user.role !== 'admin') {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      })
    };
  }
  return { ok: true, userId: session.user.id };
}

const JWT_SECRET = import.meta.env.JWT_SECRET || 'default-secret-key';

export function signToken(payload: { userId: string; email: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}