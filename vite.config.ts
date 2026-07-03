import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { execSync } from 'child_process'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { version } from './package.json'

const backendProxyTarget = process.env.FASTPROXY_SERVER_PROXY_TARGET || 'http://127.0.0.1:43171'
const cacheDir = process.env.VITE_CACHE_DIR || 'node_modules/.vite'
const expectedProxyDisconnectCodes = new Set(['EPIPE', 'ECONNRESET', 'ECONNABORTED'])

const isExpectedProxyDisconnect = (error: unknown) => {
  if (!(error instanceof Error)) return false
  const code = 'code' in error ? String(error.code) : ''
  return expectedProxyDisconnectCodes.has(code) || /write EPIPE|socket hang up/i.test(error.message)
}

const patchProxyDisconnectLogging = (proxy: {
  on: (eventName: string | symbol, listener: (...args: unknown[]) => void) => unknown
}) => {
  const originalOn = proxy.on.bind(proxy)

  proxy.on = (eventName, listener) => {
    if (eventName === 'error') {
      return originalOn(eventName, (error, request, response) => {
        if (
          isExpectedProxyDisconnect(error) &&
          response &&
          typeof response === 'object' &&
          !('req' in response) &&
          'end' in response &&
          typeof response.end === 'function'
        ) {
          response.end()
          return
        }
        listener(error, request, response)
      })
    }

    if (eventName === 'proxyReqWs') {
      return originalOn(eventName, (proxyRequest, request, socket, options, head) => {
        if (
          socket &&
          typeof socket === 'object' &&
          'on' in socket &&
          typeof socket.on === 'function'
        ) {
          const originalSocketOn = socket.on.bind(socket)
          socket.on = (
            socketEventName: string | symbol,
            socketListener: (...args: unknown[]) => void,
          ) => {
            if (socketEventName === 'error') {
              return originalSocketOn(socketEventName, (error: unknown) => {
                if (isExpectedProxyDisconnect(error)) {
                  return
                }
                socketListener(error)
              })
            }
            return originalSocketOn(socketEventName, socketListener)
          }
        }
        listener(proxyRequest, request, socket, options, head)
      })
    }

    return originalOn(eventName, listener)
  }
}

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
  cacheDir,
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
        name: 'FastProxy',
        short_name: 'FastProxy',
        description: 'FastProxy dashboard and local runtime server',
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
  server: {
    proxy: {
      '/api': {
        target: backendProxyTarget,
        changeOrigin: true,
        ws: true,
        configure: patchProxyDisconnectLogging,
      },
    },
  },
})
