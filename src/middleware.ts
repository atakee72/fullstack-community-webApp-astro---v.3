import { getSession } from 'auth-astro/server';
import { defineMiddleware } from "astro:middleware";
// Side-effect import REQUIRED (live-debugged 2026-07-19): Astro bundles
// sentry.server.config's Sentry.init() into PAGE chunks only — entry.mjs,
// this middleware, and most /api/* modules never load it, so an API
// request on a cold serverless instance ran with an UNINITIALIZED SDK
// (captureException silently no-ops). This was the true mechanism behind
// the "#14054 server errors missing on Vercel" symptom here. Importing
// the config from the middleware (which loads on EVERY SSR request)
// guarantees init; ESM module caching keeps it a single evaluation even
// when a page chunk also imports it.
import '../sentry.server.config';
import * as Sentry from '@sentry/astro';

export const onRequest = defineMiddleware(async (context, next) => {
  try {
    // Skip middleware for static assets and prerendered routes
    const pathname = context.url.pathname;
    if (
      pathname.startsWith("/_image") ||
      pathname.startsWith("/favicon") ||
      pathname.includes(".") // Skip for files with extensions
    ) {
      return await next();
    }

    // Skip session fetching for prerendered routes (no request headers available)
    if (context.isPrerendered) {
      context.locals.user = null;
      context.locals.session = null;
      return await next();
    }

    try {
      // Get session from NextAuth via auth-astro
      const session = await getSession(context.request);

      if (session?.user) {
        // Populate Astro.locals with user and session data
        context.locals.user = session.user;
        context.locals.session = session;
      } else {
        // No session found
        context.locals.user = null;
        context.locals.session = null;
      }
    } catch (error) {
      // Log error but don't break the request
      console.error("Error getting session:", error);
      context.locals.user = null;
      context.locals.session = null;
    }

    // Protected routes configuration
    // "/profile" is deliberately NOT here — logged-out /profile renders its own
    // in-page state (§10 "sign in" card) instead of a hard redirect.
    const protectedRoutes = ["/dashboard", "/settings"];
    const authRoutes = ["/login", "/register"];

    // Check if current path is protected
    const isProtectedRoute = protectedRoutes.some((route) =>
      pathname.startsWith(route)
    );
    const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

    // Redirect logic
    if (isProtectedRoute && !context.locals.user) {
      // Redirect to login if trying to access protected route without auth
      return context.redirect("/login?redirect=" + encodeURIComponent(pathname));
    }

    if (isAuthRoute && context.locals.user) {
      // Redirect to home if trying to access auth routes while logged in
      const redirectTo = new URL(context.request.url).searchParams.get("redirect");
      return context.redirect(redirectTo || "/");
    }

    return await next();
  } catch (err) {
    // Serverless freeze eats async event delivery: Vercel suspends the
    // function the moment the response leaves, so Sentry's queued POST
    // never completes for the LAST error before idle (live-verified
    // 2026-07-19: single smoke errors vanished from Sentry; rapid
    // re-invocations thawed the frozen function and delivered the
    // predecessor's queued event). Capture + flush INSIDE the request
    // window, then rethrow to Astro's error handling. The SDK's own
    // request handler is disabled in astro.config.mjs
    // (autoInstrumentation.requestHandler: false), making this the
    // single capture point — no duplicate events. `await next()` (not
    // bare `return next()`) everywhere above is what routes downstream
    // rejections into this catch.
    Sentry.captureException(err);
    await Sentry.flush(2000);
    throw err;
  }
});
