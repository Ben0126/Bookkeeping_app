import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

/** npm package → the separate file it's bundled into. */
const VENDOR_CHUNKS: Record<string, string> = {
  react: 'react',
  'react-dom': 'react',
  scheduler: 'react',
  'react-router': 'react',
  'react-router-dom': 'react',
  dexie: 'dexie',
  'dexie-react-hooks': 'dexie',
  i18next: 'i18n',
  'i18next-browser-languagedetector': 'i18n',
  'react-i18next': 'i18n',
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'StudyBudget 留學生記帳',
        short_name: 'StudyBudget',
        description: 'Offline, multi-currency bookkeeping for students abroad.',
        lang: 'zh-TW',
        theme_color: '#4f46e5',
        background_color: '#f8fafc',
        display: 'standalone',
        start_url: '/transactions',
        scope: '/',
        categories: ['finance', 'productivity'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [{ name: 'Transactions', short_name: 'Transactions', url: '/transactions' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,json}'],
        navigateFallback: '/index.html',
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Libraries change far less often than the app; separate files stay cached
        // when an update only touches app code.
        manualChunks(id) {
          const name = /[\\/]node_modules[\\/]([^\\/]+)/.exec(id)?.[1];
          return name && VENDOR_CHUNKS[name];
        },
      },
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
});
