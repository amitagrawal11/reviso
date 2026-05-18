import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
  'Surrogate-Control': 'no-store',
};

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    sourcemap: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Keep react-dom in its own chunk — largest single dep, always needed.
          if (id.includes('node_modules/react-dom')) return 'react-dom';
          // Mantine UI components — loaded with Shell, not on landing.
          if (id.includes('@mantine/')) return 'mantine';
          // react-router in its own chunk.
          if (id.includes('react-router')) return 'router';
          // Lucide icons — tree-shaken per icon, but group them so they don't
          // pollute the entry chunk.
          if (id.includes('lucide-react')) return 'icons';
        },
      },
    },
  },
  server: { host: true, headers: noCacheHeaders },
  preview: { host: true, headers: noCacheHeaders },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script-defer',
      includeAssets: [
        'favicon.svg',
        'robots.txt',
        'icon-192.png',
        'icon-512.png',
        'icon-maskable-512.png',
        'apple-touch-icon.png',
      ],
      manifest: {
        name: 'Reviso Notes',
        short_name: 'Reviso',
        description:
          'Markdown-first notes with live preview, mermaid diagrams, and offline support.',
        theme_color: '#0a0a0c',
        background_color: '#0a0a0c',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone'],
        start_url: '/?source=pwa',
        scope: '/',
        orientation: 'any',
        categories: ['productivity', 'utilities'],
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          // Maskable icon — full-bleed background so Android adaptive icon
          // masks (circle, squircle, etc.) never crop into the logo. The logo
          // sits within the inner 60% safe zone.
          {
            src: '/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'New note',
            short_name: 'New',
            description: 'Create a new note',
            url: '/?action=new',
            icons: [{ src: '/icon-192.png', sizes: '192x192' }],
          },
          {
            name: 'Search',
            short_name: 'Search',
            description: 'Search notes',
            url: '/?action=search',
            icons: [{ src: '/icon-192.png', sizes: '192x192' }],
          },
        ],
        share_target: {
          action: '/share-target',
          method: 'GET',
          params: { title: 'title', text: 'text', url: 'url' },
        },
        screenshots: [
          {
            src: '/landing/screenshot-dark.png',
            sizes: '1600x1000',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Reviso Notes — dark theme',
          },
          {
            src: '/landing/screenshot-light.png',
            sizes: '1600x1000',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Reviso Notes — light theme',
          },
        ],
      },
      workbox: {
        // No precache snapshot — every asset is fetched fresh; cache only as
        // an offline fallback.
        globPatterns: [],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/sw\.js/, /^\/registerSW\.js/],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          // HTML navigations: try network with a short timeout, fall back to cache offline.
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          // JS / CSS / Worker: NetworkFirst so a deploy never serves stale code.
          {
            urlPattern: ({ request }) =>
              request.destination === 'script' ||
              request.destination === 'style' ||
              request.destination === 'worker',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'assets',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          // Images / fonts: hashed URLs, safe to cache aggressively.
          {
            urlPattern: ({ request }) =>
              request.destination === 'image' || request.destination === 'font',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'media',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          // Supabase API: NetworkFirst — fresh data online, last-known data offline.
          {
            urlPattern: ({ url }) => url.hostname.endsWith('supabase.co'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
    }),
  ],
});
