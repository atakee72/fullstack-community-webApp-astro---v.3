import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { ObjectId } from 'mongodb';
import { connectDB } from '../../../lib/mongodb';

// Live verified-state for the LOGGED-IN user, read from the DB (not the JWT).
// The JWT snapshots emailVerified at login and goes stale the moment the user
// verifies — the VerifyEmailBanner calls this to avoid nagging verified users.
export const GET: APIRoute = async ({ request }) => {
  const json = (body: object, status: number) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  try {
    const session = await getSession(request);
    if (!session?.user?.id) return json({ error: 'Unauthorized' }, 401);

    const db = await connectDB();
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(session.user.id) },
      { projection: { emailVerified: 1 } }
    );
    return json({ verified: user?.emailVerified === true }, 200);
  } catch (err) {
    console.error('verification-status error:', err);
    return json({ error: 'internal' }, 500);
  }
};
