import { auth } from "../../../auth";
import type { APIRoute } from "astro";

/**
 * Catch-all route handler for Better Auth
 * This handles all authentication-related requests:
 * - POST /api/auth/sign-up
 * - POST /api/auth/sign-in
 * - POST /api/auth/sign-out
 * - GET /api/auth/session
 * - POST /api/auth/forgot-password
 * - POST /api/auth/reset-password
 * - And more...
 */
export const ALL: APIRoute = async (ctx) => {
  console.error('🔍 [NETLIFY DEBUG] Auth endpoint hit:', ctx.request.method, ctx.request.url);

  // Optional: Set forwarded IP for rate limiting
  if (ctx.clientAddress) {
    ctx.request.headers.set("x-forwarded-for", ctx.clientAddress);
  }

  console.error('🔍 [NETLIFY DEBUG] Request headers:', Object.fromEntries(ctx.request.headers.entries()));

  try {
    const body = await ctx.request.clone().text();
    console.error('🔍 [NETLIFY DEBUG] Request body:', body);
  } catch (e) {
    console.error('🔍 [NETLIFY DEBUG] Could not read body:', e);
  }

  // Pass the request to Better Auth handler
  const response = await auth.handler(ctx.request);
  console.error('🔍 [NETLIFY DEBUG] Response status:', response.status);

  return response;
};

// Also export individual methods for clarity
export const GET: APIRoute = ALL;
export const POST: APIRoute = ALL;
export const PUT: APIRoute = ALL;
export const DELETE: APIRoute = ALL;
export const PATCH: APIRoute = ALL;