import type { APIRoute } from 'astro';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { connectDB } from '../../../../lib/mongodb';
import { requireAdminSession } from '../../../../lib/auth';

// PATCH /api/admin/users/[id] — toggle users.verified (Kiez-verification
// v1: an admin toggle IS the proof mechanism). Strictly server-controlled:
// this admin-gated endpoint is the ONLY writer of `verified` — keep it
// that way (no client/self-serve path may ever set it).
// Tombstoned accounts (anonymized: true) are excluded from the match →
// 404, so a deleted user can't be re-verified.

const BodySchema = z.object({ verified: z.boolean() }).strict();

export const PATCH: APIRoute = async ({ request, params }) => {
  const guard = await requireAdminSession(request);
  if (!guard.ok) return guard.response;

  const id = params.id ?? '';
  if (!ObjectId.isValid(id)) {
    return new Response(JSON.stringify({ error: 'invalid_id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'invalid_body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const db = await connectDB();
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(id), anonymized: { $ne: true } },
      { $set: { verified: parsed.data.verified } }
    );
    if (result.matchedCount === 0) {
      return new Response(JSON.stringify({ error: 'not_found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response(JSON.stringify({ success: true, verified: parsed.data.verified }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Admin user verify toggle error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
