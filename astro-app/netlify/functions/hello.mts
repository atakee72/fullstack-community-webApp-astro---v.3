import type { Context, Config } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  const { geo, ip } = context;

  // Parse query parameters
  const url = new URL(req.url);
  const name = url.searchParams.get('name') || 'World';

  const response = {
    message: `Hello, ${name}!`,
    location: geo?.city || 'Unknown',
    ip: ip || 'Unknown',
    timestamp: new Date().toISOString(),
    env: Netlify.env.NODE_ENV || 'development'
  };

  return new Response(JSON.stringify(response, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    }
  });
};

export const config: Config = {
  path: "/api/hello"
};