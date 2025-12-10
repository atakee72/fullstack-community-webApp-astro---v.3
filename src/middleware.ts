import { getSession } from 'auth-astro/server';
import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (context, next) => {
  // Skip middleware for static assets
  const pathname = context.url.pathname;
  if (
    pathname.startsWith("/_image") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".") // Skip for files with extensions
  ) {
    return next();
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
  const protectedRoutes = ["/profile", "/dashboard", "/settings"];
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

  return next();
});