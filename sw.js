/*
  sw.js – Service Worker für RehaPlaner+

  Dieser Service Worker macht die PWA offline‑fähig und steuert das gesamte
  Caching-Verhalten der Anwendung. Er besteht aus drei Hauptphasen:

  • INSTALL:
    - Lädt die App‑Shell (HTML, CSS, JS, Icons, Vendor‑Libs) in den Cache
    - skipWaiting() aktiviert den neuen SW sofort

  • ACTIVATE:
    - Entfernt alte Cache‑Versionen
    - clients.claim() sorgt dafür, dass der neue SW sofort Kontrolle übernimmt

  • FETCH:
    - Navigation (HTML): Network‑First mit Fallback auf index.html
    - Statische Dateien (CSS, JS, Bilder): Cache‑First mit Runtime‑Caching
    - Externe Requests: Network‑First mit Cache‑Fallback

  Besonderheiten:
  • Zwei getrennte Caches: App‑Shell (statisch) und Runtime‑Cache (dynamisch)
  • PDF.js, Worker und Tesseract werden bewusst vorab gecached, damit OCR offline funktioniert
  • Fehlerfälle (z. B. offline Bilder) werden abgefangen und durch Fallbacks ersetzt

  Der Service Worker ist essenziell für Offline‑First Verhalten der PWA.
*/

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
  './reha-logo.jpeg',      
  './vendor/pdf.js',
  './vendor/pdf.worker.js',
  './vendor/tesseract.min.js'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener('activate', event => {
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

  if (req.method !== 'GET') return;

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

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req).then(networkRes => {
          return caches.open(RUNTIME_CACHE).then(cache => {
            cache.put(req, networkRes.clone());
            return networkRes;
          });
        }).catch(() => {
          if (req.destination === 'image') return caches.match('./reha-logo.png');
        });
      })
    );
    return;
  }

  event.respondWith(
    fetch(req).then(res => {
      const copy = res.clone();
      caches.open(RUNTIME_CACHE).then(cache => cache.put(req, copy));
      return res;
    }).catch(() => caches.match(req))
  );
});