import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      devOptions: { enabled: true },
      manifest: {
        name: 'SafeHer - Women Safety',
        short_name: 'SafeHer',
        description: 'Offline-first personal safety and emergency response app',
        theme_color: '#e11d48',
        background_color: '#020617',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: { maxEntries: 3000, maxAgeSeconds: 60 * 60 * 24 * 60 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /^https:\/\/(unpkg\.com|cdnjs\.cloudflare\.com)\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'cdn-assets' }
          },
          {
            urlPattern: /\/api\/.*/i,
            method: 'POST',
            handler: 'NetworkOnly',
            options: {
              backgroundSync: {
                name: 'safeher-sync-queue',
                options: { maxRetentionTime: 24 * 60 }
              }
            }
          },
          {
            urlPattern: /\/api\/.*/i,
            method: 'GET',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'api-get' }
          }
        ]
      }
    })
  ]
});
