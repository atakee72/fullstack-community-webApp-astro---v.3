import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { fetchListingDetailForSSR } from '../../../lib/listingsQuery';
import { isValidObjectId } from '../../../schemas/validation.utils';

export const GET: APIRoute = async ({ params, request }) => {
  try {
    const { id } = params;

    if (!id || !isValidObjectId(id)) {
      return new Response(JSON.stringify({ error: 'Invalid listing ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const session = await getSession(request);
    const userId = (session?.user as any)?.id ?? null;

    // Canonical visibility helper — the same one /marketplace/[id].astro uses.
    // Replaces a raw findOne that returned ANY document to ANY caller:
    // rejected content, drafts, sold items and past-21d listings were all
    // publicly readable, and the response carried the seller's e-mail.
    // Owners still reach their own drafts/sold/stale listings (owner scope
    // lives inside the helper). Both non-visible kinds collapse to 404 so the
    // endpoint doesn't disclose which listings merely exist.
    const result = await fetchListingDetailForSSR(id, userId);

    if (result.kind !== 'visible') {
      return new Response(JSON.stringify({ error: 'Listing not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ listing: result.listing }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching listing:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch listing' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
