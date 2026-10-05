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
        // The globe is lazy-loaded, but its local textures and bundled attribution must
        // remain available after the first PWA install/update for offline cache reuse.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webp,jpg,md}'],
        // The main chunk sits at ~1.75 MiB — under Workbox's 2 MiB default, but not
        // by enough to rely on. Keep the ceiling raised so it can't silently fall out
        // of the precache (and stop working offline) the next time it grows a little.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      manifest: {
        name: 'zashboard',
        short_name: 'zashboard',
        description: 'a dashboard using clash api',
        // Chrome 会把 theme_color 烘进 WebAPK 的 metadata 并拿去涂窗口/系统栏表面。
        // 应用本体是浅色,而且运行时会用 <meta name="theme-color"> 把状态栏刷成同色,
        // 但导航栏那块仍然用烘进来的值 —— 这里原来写 #000000,于是在 Android 底部
        // 留下一条纯黑的横带。
        theme_color: '#ffffff',
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
            src: './pwa-1024x1024.png',
            sizes: '1024x1024',
            type: 'image/png',
            purpose: 'any',
          },
          // 这里刻意不声明 maskable。声明了 Chrome 会把那张图整层当成 WebAPK 自适应
          // 图标的前景,而 Chrome 桌面版对 maskable 不做遮罩 —— 装出来的 app 图标就是
          // 一块实心底板(macOS 实测),和读 apple-touch 的 Safari 那边对不上。
          // 主屏图标统一走 any,且都是透明底,底板交给平台自己铺。
          // Android 13+ 的主题图标走这一档。只取 alpha,颜色由系统上,
          // 目前 Chrome 的 WebAPK 还没消费它(issues.chromium.org/40277264),
          // 先按规范声明,免得以后再补一轮安装。
          {
            src: './pwa-monochrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'monochrome',
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
})
