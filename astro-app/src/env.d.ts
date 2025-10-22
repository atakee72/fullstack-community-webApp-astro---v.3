/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly MONGODB_URI: string;
  readonly DB: string;
  readonly JWT_SECRET: string;
  readonly CLOUD_NAME: string;
  readonly CLOUDINARY_API_KEY: string;
  readonly CLOUDINARY_API_SECRET: string;
  readonly PUBLIC_API_URL: string;
  readonly NODE_ENV: 'development' | 'production' | 'test';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Netlify types
type NetlifyLocals = import('@astrojs/netlify').NetlifyLocals;

declare namespace App {
  interface Locals extends NetlifyLocals {
    user?: import('./types').User;
    token?: string;
  }
}