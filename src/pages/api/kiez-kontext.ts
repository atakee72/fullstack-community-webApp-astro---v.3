import type { APIRoute } from 'astro';
import { getKiezKontext } from '../../lib/kiez/kontext';

export const GET: APIRoute = async () => {
  try {
    const kontext = await getKiezKontext();

    return new Response(JSON.stringify(kontext), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('kiez-kontext API error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch kiez kontext' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
