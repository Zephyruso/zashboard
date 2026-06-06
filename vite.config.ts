import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { execSync } from 'child_process'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { version } from './package.json'

const getGitCommitId = (): string => {
  try {
    const commitMessage = execSync('git log -1 --pretty=%B', { encoding: 'utf8' }).trim()

    if (commitMessage.includes('chore(main): release')) {
      return ''
    }

    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
  } catch (error) {
    console.warn('无法获取git commit ID:', error)
    return ''
  }
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __COMMIT_ID__: JSON.stringify(getGitCommitId()),
  },
  base: './',
  plugins: [
    vue(),
    vueJsx(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon-dark.svg'],
      manifest: {
        name: 'zashboard',
        short_name: 'zashboard',
        description: 'a dashboard using clash api',
        theme_color: '#000000',
        icons: [
          {
            src: './pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: './pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: './pwa-maskable-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: './pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // Lift the chunk-size warning slightly so the per-route chunks below don't
    // trigger noise — the real budget is enforced via manualChunks.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Rolldown (Vite 8) only accepts the function form of manualChunks.
        // Group heavy third-party libraries into their own vendor chunks so
        // they are downloaded lazily alongside the route that needs them.
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return
          if (id.includes('/echarts/') || id.includes('/zrender/')) return 'echarts'
          if (id.includes('@tanstack/vue-table') || id.includes('@tanstack/vue-virtual')) {
            return 'tanstack'
          }
          if (id.includes('/vue-json-pretty/')) return 'vue-json-pretty'
          if (id.includes('/tippy.js/') || id.includes('/dompurify/')) return 'tooltip'
          // NOTE: Tried isolating @vueuse/core and @heroicons/vue into their own
          // chunks but both are reachable from the eager HomePage shell, so the
          // cold first paint ended up downloading ~50 KB more gzip. Leave them
          // in the main bundle — Rolldown will still de-duplicate across the
          // lazy route chunks.
        },
      },
    },
  },
})
