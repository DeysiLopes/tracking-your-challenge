/**
 * sw.js — Service Worker do Tracker (offline-first)
 *
 * Sem build: precache dos assets do app relativo ao escopo do SW
 * (funciona em qualquer base path — localhost, pages.dev, subpasta).
 * Bump VERSION para forçar reinstalação dos caches.
 */
const VERSION = 'tracker-v1';
const CACHE = 'tracker-' + VERSION;

const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './data.js',
  './cats.js',
  './parser.js',
  './db.js',
  './drive.js',
  './manifest.json',
  './cat-favicon.svg',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Só cacheamos o que é nosso — Drive/GIS/fonts ficam de fora.
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Navegação: rede primeiro, fallback pro shell em cache (offline).
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Assets: cache primeiro (app é imutável por versão), com revalidate.
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetcher = fetch(e.request).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || fetcher;
    })
  );
});
