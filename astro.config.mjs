import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import svelte from '@astrojs/svelte';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel';
import auth from 'auth-astro';
import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  output: 'server', // Server mode for Vercel serverless functions

  adapter: vercel({
    webAnalytics: {
      enabled: true
    }
  }),

  integrations: [
    auth(),
    react({
      experimentalReactChildren: true
    }),
    svelte(),
    tailwind({
      applyBaseStyles: false, // We'll use our own base styles
    }),
    mdx()
  ],

  vite: {
    optimizeDeps: {
      include: ['zustand', 'zustand/middleware'],
      exclude: ['mongodb', 'bcrypt', '@mongodb-js/saslprep', 'node-gyp-build']
    },
    ssr: {
      external: [
        'mongodb',
        'mongoose',
        'bcrypt',
        'jsonwebtoken',
        '@mongodb-js/saslprep',
        'node-gyp-build',
        'kerberos',
        'snappy',
        'socks',
        'mongodb-client-encryption',
        'bson-ext',
        'win32-x64-msvc',
        'darwin-x64',
        'linux-x64-gnu'
      ],
      noExternal: ['zustand', 'zustand/middleware']
    },
    resolve: {
      alias: {
        '@': new URL('./src', import.meta.url).pathname
      }
    },
    build: {
      rollupOptions: {
        external: [
          'mongodb',
          'bcrypt',
          '@mongodb-js/saslprep',
          'node-gyp-build'
        ]
      }
    }
  },

  server: {
    port: 3000,
    host: true
  },

  build: {
    inlineStylesheets: 'auto'
  }
});