import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Base path configurável: '/' em Cloudflare Pages (ou domínio próprio),
// '/<repo>/' se um dia for publicado em subpasta (ex.: GitHub Pages).
const base = process.env.VITE_BASE_PATH || '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['cat-favicon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: '90 Dias na Gringa — Tracker',
        short_name: 'Tracker',
        description: 'Tracker pessoal de progresso — plano de N dias importado de .md',
        id: './',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#1e1e2e',
        theme_color: '#1e1e2e',
        orientation: 'portrait-primary',
        icons: [
          { src: 'cat-favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
});
