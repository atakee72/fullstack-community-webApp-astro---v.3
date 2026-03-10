import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';

export const GET: APIRoute = async ({ url, request }) => {
  try {
    const session = await getSession(request);
    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const targetUrl = url.searchParams.get('url');
    if (!targetUrl) {
      return new Response(JSON.stringify({ error: 'URL parameter is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate URL
    try {
      new URL(targetUrl);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid URL' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fetch the page HTML
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MahalleBot/1.0; +https://mahalle.community)',
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: 'Failed to fetch the URL' }), {
        status: 422,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const html = await response.text();

    // Extract Open Graph and standard meta tags
    const getMetaContent = (property: string): string | undefined => {
      // Try og: property
      const ogMatch = html.match(new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'))
        || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i'));
      if (ogMatch) return ogMatch[1];

      // Try name attribute (for twitter: and standard meta)
      const nameMatch = html.match(new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'))
        || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`, 'i'));
      if (nameMatch) return nameMatch[1];

      return undefined;
    };

    // Extract <title> tag as fallback
    const titleTagMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const titleTag = titleTagMatch ? titleTagMatch[1].trim() : undefined;

    // Build preview data with fallback chain
    const title = getMetaContent('og:title')
      || getMetaContent('twitter:title')
      || titleTag;

    const description = getMetaContent('og:description')
      || getMetaContent('twitter:description')
      || getMetaContent('description');

    const image = getMetaContent('og:image')
      || getMetaContent('twitter:image');

    const siteName = getMetaContent('og:site_name')
      || getMetaContent('application-name');

    // Decode HTML entities
    const decodeEntities = (str: string | undefined): string | undefined => {
      if (!str) return undefined;
      return str
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'");
    };

    return new Response(JSON.stringify({
      title: decodeEntities(title) || '',
      description: decodeEntities(description) || '',
      image: image || '',
      siteName: decodeEntities(siteName) || '',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching URL preview:', error);
    const message = error instanceof Error && error.name === 'TimeoutError'
      ? 'Request timed out — the website took too long to respond'
      : 'Failed to fetch preview';

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
