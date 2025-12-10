/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly MONGODB_URI: string;
  readonly DB: string;
  readonly JWT_SECRET: string;
  readonly NEXTAUTH_SECRET: string;
  readonly NEXTAUTH_URL: string;
  readonly CLOUD_NAME: string;
  readonly CLOUDINARY_API_KEY: string;
  readonly CLOUDINARY_API_SECRET: string;
  readonly PUBLIC_API_URL: string;
  readonly NODE_ENV: 'development' | 'production' | 'test';
  // Social provider keys (optional)
  readonly GITHUB_CLIENT_ID?: string;
  readonly GITHUB_CLIENT_SECRET?: string;
  readonly GOOGLE_CLIENT_ID?: string;
  readonly GOOGLE_CLIENT_SECRET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Netlify types
type NetlifyLocals = import('@astrojs/netlify').NetlifyLocals;

declare namespace App {
  interface Locals extends NetlifyLocals {
    session: import("@auth/core/types").Session | null;
  }
}