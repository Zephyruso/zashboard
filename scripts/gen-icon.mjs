/*
 * 生成 public/ 下的全套图标:三块圆角面板 + 底板。
 *
 *   pnpm gen:icon
 *
 * 主屏图标的底板归属平台,不是我们:
 *
 *   - iOS:apple-touch-icon 必须是「只有图形、背景透明」。iOS 26 把 Liquid Glass 材质
 *     铺在平图底下,自己再铺一层不透明底板就把材质整层盖掉。
 *   - Android:manifest 里的主屏图标同样保持透明。真机实测:一旦我们自带的底板不透明,
 *     launcher 的主题着色会把整张图标反过来(别人浅底深图,它深底浅图)。
 *   - 不声明 maskable:声明了 Chrome 会把那张图整层当成 WebAPK 自适应图标的前景,
 *     而 Chrome 桌面版对 maskable 不做遮罩 —— 装出来的 app 图标就是一块实心底板
 *     (macOS 上实测),Safari 那边读 apple-touch 走的是透明图,两边就对不上。
 *
 * monochrome 只取 alpha,颜色由系统上。favicon 是给标签页的,自带圆角底板照原样显示。
 * 角一律不预切:平台自己会套遮罩,预切是双切。
 * 依赖系统里的 rsvg-convert(librsvg)和 magick(ImageMagick 7),不进 node_modules。
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PUBLIC_DIR = fileURLToPath(new URL('../public/', import.meta.url))

const PLATE_RADIUS = 114 // 512 的 22%,只有 favicon 需要预切角
const PANEL_RADIUS = 38
// [x, y, 宽, 高] —— 左边一根高列 + 右边上下两块,横纵中心都落在 256
const PANELS = [
  [105, 131, 123, 250],
  [251, 131, 156, 109],
  [251, 272, 156, 109],
]
const MASKABLE_SCALE = 0.875

// 莫兰迪雾霾蓝,色相统一在 213° 上下,饱和度压在 30% 以内。
const THEMES = {
  light: { plate: '#FFFFFF', panels: ['#7E92AB', '#A8B8CC', '#5C6E86'] },
  dark: { plate: '#0D0F13', panels: ['#8B9DB4', '#BFCBDB', '#64748C'] },
}

const panels = (colors, scale = 1) => {
  const transform =
    scale === 1 ? '' : ` transform="translate(256 256) scale(${scale}) translate(-256 -256)"`
  return `<g${transform}>
    ${PANELS.map(
      ([x, y, w, h], i) =>
        `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${PANEL_RADIUS}" fill="${colors[i]}"/>`,
    ).join('\n    ')}
  </g>`
}

const svg = (body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">\n${body}</svg>\n`

// 标签页 / 收藏栏:自带圆角底板,直接照原样显示
const tabSvg = (theme) => svg(`  <rect width="512" height="512" rx="${PLATE_RADIUS}" fill="${THEMES[theme].plate}"/>
  ${panels(THEMES[theme].panels)}
`)

// 主屏图标:iOS 与 Android 都一样 —— 只有图形、背景透明,底板交给平台
const markSvg = (scale, colors) => svg(`  ${panels(colors ?? THEMES.light.panels, scale)}
`)

const run = (cmd, args) => {
  try {
    execFileSync(cmd, args, { stdio: 'pipe' })
  } catch (error) {
    const detail = error.stderr?.toString().trim() || error.message
    throw new Error(`${cmd} 执行失败: ${detail}`)
  }
}

for (const cmd of ['rsvg-convert', 'magick']) {
  try {
    execFileSync(cmd, ['--version'], { stdio: 'ignore' })
  } catch {
    console.error(
      `找不到 ${cmd}。Arch: pacman -S librsvg imagemagick;Debian: apt install librsvg2-bin imagemagick`,
    )
    process.exit(1)
  }
}

const tmp = mkdtempSync(join(tmpdir(), 'zashboard-icon-'))
const written = []

const emitSvg = (name, source) => {
  const out = join(PUBLIC_DIR, name)
  writeFileSync(out, source)
  written.push(name)
  return out
}

const emitPng = (source, size, name) => {
  const out = join(PUBLIC_DIR, name)
  run('rsvg-convert', ['-w', String(size), '-h', String(size), source, '-o', out])
  // rsvg 会写入时间戳一类的块,去掉后同样的输入才有同样的字节。
  // alpha 不要动:主屏图标就靠它把底板交给平台。
  run('magick', [out, '-strip', out])
  written.push(name)
}

try {
  const tabSvgLight = emitSvg('favicon.svg', tabSvg('light'))
  emitSvg('icon.svg', tabSvg('light'))
  emitSvg('favicon-dark.svg', tabSvg('dark'))

  // 中间产物不落进 public/,只是 png 的来源
  const markSvgFull = join(tmp, 'mark-full.svg')
  writeFileSync(markSvgFull, markSvg(1))

  const markSvgSmall = join(tmp, 'mark-small.svg')
  writeFileSync(markSvgSmall, markSvg(MASKABLE_SCALE))

  const markSvgMono = join(tmp, 'mark-mono.svg')
  writeFileSync(markSvgMono, markSvg(MASKABLE_SCALE, ['#000000', '#000000', '#000000']))

  // any:桌面、Chrome 安装来源、Android 主屏 —— 全都只用这张
  emitPng(markSvgFull, 192, 'pwa-192x192.png')
  emitPng(markSvgFull, 512, 'pwa-512x512.png')
  emitPng(markSvgFull, 1024, 'pwa-1024x1024.png')

  // monochrome:Android 13+ 主题图标的蒙版,只留 alpha
  emitPng(markSvgMono, 512, 'pwa-monochrome-512x512.png')

  // apple-touch-icon:iOS 主屏 / 添加到程序坞
  emitPng(markSvgSmall, 180, 'apple-touch-icon-180x180.png')
  emitPng(markSvgSmall, 1024, 'apple-touch-icon-1024x1024.png')

  // ico 里塞三档,让浏览器按标签页 / 收藏栏 / 桌面快捷方式各取所需
  const icoSizes = [16, 32, 48].map((size) => {
    const out = join(tmp, `ico-${size}.png`)
    run('rsvg-convert', ['-w', String(size), '-h', String(size), tabSvgLight, '-o', out])
    return out
  })
  run('magick', [...icoSizes, join(PUBLIC_DIR, 'favicon.ico')])
  written.push('favicon.ico')

  // 历史遗留:单尺寸的 apple-touch,以及已不声明的 maskable
  for (const stale of [
    'apple-touch-icon.png',
    'pwa-maskable-192x192.png',
    'pwa-maskable-512x512.png',
  ]) {
    rmSync(join(PUBLIC_DIR, stale), { force: true })
  }
} finally {
  rmSync(tmp, { recursive: true, force: true })
}

for (const name of written) console.log(`  ✓ public/${name}`)
