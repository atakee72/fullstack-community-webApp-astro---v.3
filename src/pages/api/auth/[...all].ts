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
  // Optional: Set forwarded IP for rate limiting
  if (ctx.clientAddress) {
    ctx.request.headers.set("x-forwarded-for", ctx.clientAddress);
  }

  // Pass the request to Better Auth handler
  return auth.handler(ctx.request);
};

// Also export individual methods for clarity
export const GET: APIRoute = ALL;
export const POST: APIRoute = ALL;
export const PUT: APIRoute = ALL;
export const DELETE: APIRoute = ALL;
export const PATCH: APIRoute = ALL;