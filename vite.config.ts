import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'logo-quango-black.svg', 'logo-quango-white.svg'],
        manifest: {
          name: "Quango - Gestión de Residencias",
          short_name: "Quango",
          description: "Sistema de gestión integral de comidas, arreglos, calendarios y reservas de vehículos",
          start_url: "/",
          display: "standalone",
          background_color: "#ffffff",
          theme_color: "#000000",
          orientation: "portrait-primary",
          icons: [
            {
              src: "/icon-192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any maskable"
            },
            {
              src: "/icon-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any maskable"
            },
            {
              src: "/apple-touch-icon.png",
              sizes: "180x180",
              type: "image/png"
            }
          ],
          categories: [
            "productivity",
            "utilities"
          ],
          screenshots: [],
          shortcuts: [
            {
              name: "Comidas",
              short_name: "Comidas",
              description: "Gestionar pedidos de comidas",
              url: "/?tab=meals",
              icons: [
                {
                  src: "/icon-192.png",
                  sizes: "192x192"
                }
              ]
            },
            {
              name: "Vehículos",
              short_name: "Vehículos",
              description: "Reservar vehículos",
              url: "/?tab=cars",
              icons: [
                {
                  src: "/icon-192.png",
                  sizes: "192x192"
                }
              ]
            }
          ]
        },
        workbox: {
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        }
      })
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
