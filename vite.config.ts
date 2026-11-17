import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['apple-touch-icon.png', 'icon.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
        manifest: {
          id: './',
          name: 'FontCreator',
          short_name: 'FontCreator',
          description: 'ブラウザ上で手書き・デザインフォントの作成、パス輪郭の単純化、サイドベアリング自動設定、TTF出力ができるフォント開発スタジオ。',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          start_url: './',
          scope: './',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,ttf,json}'],
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MB limit for precaching main bundles & datasets
          // Google Fonts の CSS は precache に追加しない。2026-11-17 時点の
          // css2 応答は約 1.2 MB で、参照する woff2 は 744 件ある。合計は
          // maximumFileSizeToCacheInBytes (10 MB) を超え、URL は UA 依存で
          // ビルド時に列挙できない。オンライン時に取得したフォントは下の
          // CacheFirst の runtimeCaching で保持され、次回以降のオフラインで使える。
          // 初回オフラインで下絵フォントが使えない点は OfflineIndicator で表示する。
          // 上限は 60 件。woff2 は unicode-range ごとに分割されるため、60 件で
          // 5 書体 × 複数文字をまかなえる。1 件あたり数十 KB のため、合計は数 MB
          // 程度で Workbox の制限を超えない。上限を超えた分はキャッシュから
          // 削除され、オフラインで使えない場合がある。
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 60,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 60,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
          type: 'module',
        },
      }),
    ],
    build: {
      rollupOptions: {
        output: {
          // vendor を別チャンクに分け、アプリ本体の更新で vendor キャッシュが
          // 無効化されないようにする。合計バイト数は変わらない。
          // opentype.js は遅延チャンク側にだけ残るため、ここでは分けない。
          manualChunks(id) {
            if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/scheduler')) {
              return 'vendor-react';
            }
            if (id.includes('node_modules/paper')) {
              return 'vendor-paper';
            }
            return undefined;
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    test: {
      globals: true,
      environment: 'node',
    },
  };
});