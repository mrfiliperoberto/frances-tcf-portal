import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import https from 'node:https';
import ttsProxyGuard from './tts-proxy-guard.cjs';

const { parseAllowedTtsUrl } = ttsProxyGuard;

function googleTtsProxyPlugin() {
  return {
    name: 'google-tts-proxy',
    configureServer(server) {
      server.middlewares.use('/__tts', (req, res) => {
        try {
          const parsed = new URL(req.url || '', 'http://localhost:5173');
          const allowedUrl = parseAllowedTtsUrl(parsed.searchParams.get('url'));
          if (!allowedUrl) {
            res.statusCode = 400;
            res.end('Invalid TTS URL');
            return;
          }
          https
            .get(
              allowedUrl.toString(),
              {
                headers: {
                  'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
                  Accept: '*/*'
                }
              },
              (proxyRes) => {
                if (proxyRes.statusCode !== 200) {
                  res.statusCode = proxyRes.statusCode || 502;
                  res.end('Upstream error');
                  return;
                }
                res.writeHead(200, {
                  'Content-Type': proxyRes.headers['content-type'] || 'audio/mpeg',
                  'Cache-Control': 'public, max-age=86400',
                  'Access-Control-Allow-Origin': '*'
                });
                proxyRes.pipe(res);
              }
            )
            .on('error', () => {
              res.statusCode = 502;
              res.end('Proxy network error');
            });
        } catch {
          res.statusCode = 500;
          res.end('Error');
        }
      });
    }
  };
}

// Serve /api/jobs no `vite dev` com o mesmo handler da função do Vercel (api/jobs.js).
function jobsApiPlugin() {
  return {
    name: 'jobs-api',
    configureServer(server) {
      // SERPAPI_KEY (opcional, Google Jobs) vem do .env.local e fica só no servidor:
      // sem prefixo VITE_, o Vite não o coloca no bundle do navegador.
      const env = loadEnv(server.config.mode, process.cwd(), '');
      if (env.SERPAPI_KEY && !process.env.SERPAPI_KEY) process.env.SERPAPI_KEY = env.SERPAPI_KEY;
      server.middlewares.use('/api/jobs', async (req, res) => {
        const { default: handler } = await import('./api/jobs.js');
        await handler(req, res);
      });
    }
  };
}

export default defineConfig({
  plugins: [
    react(),
    googleTtsProxyPlugin(),
    jobsApiPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icons/icon-192x192.png', 'icons/icon-512x512.png'],
      devOptions: {
        enabled: true
      },
      manifest: {
        id: '/',
        name: 'Do Zero ao Canadá',
        short_name: 'Canadá B2',
        description: 'Portal pessoal acelerado de Francês A1 ao B2 e Simulador Oficial TCF Canada com IA Multimodal.',
        theme_color: '#09090b',
        background_color: '#09090b',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        lang: 'pt-BR',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallbackDenylist: [/^\/__tts/, /^\/__health/, /^\/api\//],
        runtimeCaching: [
          {
            // Ilustrações da newsletter: fora do precache, guardadas quando vistas pela 1ª vez.
            urlPattern: ({ url }) => url.pathname.startsWith('/newsletter/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'newsletter-images',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 90 // 90 dias
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 365 dias
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 365 dias
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
  server: {
    port: 5173,
    host: true
  }
});
