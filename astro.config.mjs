import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import netlify from '@astrojs/netlify';

// https://astro.build/config
export default defineConfig({
  output: 'server', // Server mode with prerendering in Astro 5

  adapter: netlify({
    edgeMiddleware: false, // Disable edge middleware to avoid bundling issues
    cacheOnDemandPages: true,
    functionPerRoute: false, // Bundle auth routes together to reduce cold starts
    imageCDN: false
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