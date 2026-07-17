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

// Selects which fonts get bundled. One of:
//   all (default) | cdn | firasans | misans | pingfang | sarasa | none
// See src/assets/load-fonts.ts for what each value loads.
const font = process.env.FONT || 'all'

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __COMMIT_ID__: JSON.stringify(getGitCommitId()),
    __FONT__: JSON.stringify(font),
  },
  base: './',
  plugins: [
    vue(),
    vueJsx(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon-dark.svg'],
      workbox: {
        // The bundle is above Workbox's 2 MiB default because sing-box native
        // API support and the Tools page are always bundled.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
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
  build: {
    rollupOptions: {
      output: {
        // 稳定的 vendor 分层:业务改一行不再让用户重下整个单体 entry。
        // 只钉共享大件与强隔离件(xterm/grpc 只被各自的懒消费方引用,
        // 命名 chunk 不会被别的入口拉下来),其余交给 rollup 按使用点自动分。
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('echarts') || id.includes('zrender')) return 'echarts'
          if (id.includes('@xterm')) return 'xterm'
          if (id.includes('vue-i18n') || id.includes('@intlify')) return 'i18n'
          if (id.includes('@bufbuild') || id.includes('@connectrpc')) return 'grpc'
          if (
            id.includes('/@vue/') ||
            id.includes('/vue/') ||
            id.includes('vue-router') ||
            id.includes('@vueuse')
          ) {
            return 'vue-stack'
          }
          if (
            id.includes('lodash') ||
            id.includes('axios') ||
            id.includes('dayjs') ||
            id.includes('@heroicons') ||
            id.includes('tailwind-merge')
          ) {
            return 'vendor-core'
          }
          return undefined
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // mmdb-lib imports Node's `net`; back it with a tiny browser shim.
      net: fileURLToPath(new URL('./src/helper/netShim.ts', import.meta.url)),
    },
  },
})
