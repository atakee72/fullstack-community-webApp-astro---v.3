// Auth.js / @auth/core module augmentation — extends the default
// Session/User/JWT shapes so `session.user.role` (and the matching JWT
// field) typecheck across the project. Without this, every read of
// `session.user.role` triggers TS2339 "Property 'role' does not exist".
//
// auth-astro wraps `@auth/core` (NOT `next-auth`), so we augment those
// module names. We also augment `next-auth` for any code paths that
// might import its types directly.
//
// Source of truth for the runtime values lives in `auth.config.ts`
// callbacks (authorize → jwt → session). Keep this file in sync if
// either side adds new fields.

import '@auth/core/types';
import '@auth/core/jwt';

declare module '@auth/core/types' {
  interface Session {
    user: {
      id: string;
      role?: 'user' | 'admin';
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
  }

  interface User {
    id?: string;
    role?: 'user' | 'admin';
    email?: string | null;
    name?: string | null;
    image?: string | null;
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id?: string;
    role?: 'user' | 'admin';
  }
}
