/*
  vite.config.js – Build- und PWA-Konfiguration für RehaPlaner+

  Diese Datei steuert den kompletten Build-Prozess der Anwendung und integriert
  das VitePWA‑Plugin, um die App als installierbare Progressive Web App
  bereitzustellen.

  Hauptaufgaben:
  • Definiert die Basis-URL für relative Pfade (base: './')
  • Markiert externe Vendor‑Module (PDF.js, Worker) für Rollup
  • Registriert das PWA‑Plugin (VitePWA) mit:
      – autoUpdate für Service Worker
      – Einbindung der OCR‑Libraries (PDF.js, Tesseract.js)
      – Manifest‑Definition (Name, Farben, Start‑URL, Display‑Modus)
      – Workbox‑Konfiguration für Runtime‑Caching

  Besonderheiten:
  • PDF.js und Tesseract werden explizit als Assets eingebunden, damit OCR auch
    offline funktioniert.
  • Runtime‑Caching für externe CDN‑Ressourcen (z. B. Cloudflare) wird separat
    konfiguriert.
  • Die Config ist bewusst minimal gehalten, um den Prototypen stabil und
    übersichtlich zu halten.
*/

import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      external: [
        '/vendor/pdf.min.mjs',
        '/vendor/pdf.worker.min.mjs'
      ]
    }
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'vendor/pdf.min.mjs',
        'vendor/pdf.worker.min.mjs',
        'vendor/tesseract.min.js'
      ],
      manifest: {
        name: 'RehaPlaner+',
        short_name: 'RehaPlaner',
        start_url: './index.html',
        display: 'standalone',
        background_color: '#F3F4F6',
        theme_color: '#2563EB',
        orientation: 'portrait',
      },
      workbox: {
        globPatterns: ['**/*.{html,js,css,png,json}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cdnjs\.cloudflare\.com/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'pdfjs-tesseract-cache'
            }
          }
        ]
      }
    })
  ]
})
