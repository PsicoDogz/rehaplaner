// Simple service worker: precache app shell + runtime caching for same-origin requests

const CACHE_NAME = 'reha-app-shell-v1';
const RUNTIME_CACHE = 'reha-runtime-v1';

const PRECACHE_URLS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './db.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './reha-logo.png' // bitte Logo in Repo-Root hinzufügen
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener('activate', event => {
  // clean up old caches
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => {
        if (k !== CACHE_NAME && k !== RUNTIME_CACHE) return caches.delete(k);
      }))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle GET requests
  if (req.method !== 'GET') return;

  // For navigation requests, try network first then cache
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(RUNTIME_CACHE).then(cache => cache.put(req, copy));
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // For same-origin static assets: cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req).then(networkRes => {
          // add to runtime cache
          return caches.open(RUNTIME_CACHE).then(cache => {
            cache.put(req, networkRes.clone());
            return networkRes;
          });
        }).catch(() => {
          // fallback for images / icons
          if (req.destination === 'image') return caches.match('./reha-logo.png');
        });
      })
    );
    return;
  }

  // For other requests (cross-origin): network-first with cache fallback
  event.respondWith(
    fetch(req).then(res => {
      const copy = res.clone();
      caches.open(RUNTIME_CACHE).then(cache => cache.put(req, copy));
      return res;
    }).catch(() => caches.match(req))
  );
});