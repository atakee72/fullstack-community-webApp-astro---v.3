import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { fetchListingsForSSR, type ListingsFetchInput } from '../../../lib/listingsQuery';

export const GET: APIRoute = async ({ url, request }) => {
  try {
    const session = await getSession(request);
    const userId = (session?.user as any)?.id ?? null;

    const input: ListingsFetchInput = {
      kind: (url.searchParams.get('kind') as any) ?? 'all',
      category: url.searchParams.get('category') ?? url.searchParams.get('cat') ?? 'all',
      search: url.searchParams.get('search') ?? url.searchParams.get('q') ?? undefined,
      view: (url.searchParams.get('view') as any) ?? null,
      limit: Math.min(Number(url.searchParams.get('limit') ?? 24), 50),
      offset: Number(url.searchParams.get('offset') ?? 0),
    };

    const result = await fetchListingsForSSR(input, userId);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (e: any) {
    console.error('GET /api/listings failed:', e);
    return new Response(JSON.stringify({ error: 'Failed to fetch listings' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
