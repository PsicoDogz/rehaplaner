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
