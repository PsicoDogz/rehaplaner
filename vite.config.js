import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './', // Wichtig für lokales Öffnen ohne Server
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      // includeAssets entfernen oder anpassen
      manifest: {
        name: 'RehaPlaner+',
        short_name: 'RehaPlaner',
        start_url: './',
        display: 'standalone',
        background_color: '#F3F4F6',
        theme_color: '#2563EB',
        orientation: 'portrait',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{html,js,css,png,json}'], // PNG und JSON hinzugefügt
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