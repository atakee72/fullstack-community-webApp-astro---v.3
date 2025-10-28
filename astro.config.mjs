import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import netlify from '@astrojs/netlify';

// https://astro.build/config
export default defineConfig({
  output: 'server', // Server mode with prerendering in Astro 5

  adapter: netlify({
    edgeMiddleware: true,
    cacheOnDemandPages: true,
    functionPerRoute: false,
    builders: {
      // Configure esbuild to handle Node.js built-ins
      functionBuilder: {
        external: ['mongodb', 'bcrypt', '@mongodb-js/saslprep'],
        platform: 'node',
        target: 'node20',
        format: 'esm'
      }
    }
  }),

  integrations: [
    react({
      experimentalReactChildren: true
    }),
    tailwind({
      applyBaseStyles: false, // We'll use our own base styles
    })
  ],

  vite: {
    optimizeDeps: {
      include: ['zustand', 'zustand/middleware'],
      exclude: ['mongodb']
    },
    ssr: {
      external: ['mongodb', 'mongoose', 'bcrypt', 'jsonwebtoken'],
      noExternal: ['zustand', 'zustand/middleware']
    },
    resolve: {
      alias: {
        '@': new URL('./src', import.meta.url).pathname
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