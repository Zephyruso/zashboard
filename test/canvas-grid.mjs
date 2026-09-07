/*
 * 画布节点网格的冒烟(config/canvas-proxy-node-grid = true):
 *
 *   pnpm build && node test/canvas-grid.mjs
 *
 * 关心的是「换了渲染方式之后功能还在不在」:
 *   1. 展开组之后画布挂出来了、高度是按节点数算出来的、而且真画了东西(不是一张空白布);
 *   2. 网格里不再有节点卡片的 DOM —— 这是这次改动的全部意义;
 *   3. 点画布能选中节点(后端的 now 变了);
 *   4. 滚动时画布被 sticky 钉住,内容跟着滚(画出来的像素要变);
 *   5. 关掉开关回到 DOM 路线,节点卡片照旧。
 */
import { parseArgs } from 'node:util'
import { sleep, waitFor } from './lib/cdp.mjs'
import { startHarness } from './lib/harness.mjs'

const { values } = parseArgs({
  options: {
    groups: { type: 'string', default: '20' },
    nodes: { type: 'string', default: '40' },
    url: { type: 'string' },
    headful: { type: 'boolean', default: false },
  },
})

const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok })
  console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? `  ${detail}` : ''}`)
}
const section = (title) => console.log(`\n${title}`)

const GROUP = 'Group-003'

const harness = await startHarness({
  groups: Number(values.groups),
  nodes: Number(values.nodes),
  connections: 0,
  appUrl: values.url,
  headless: !values.headful,
})

// 画布里画了多少非透明像素 —— 用来区分「画布挂出来了」和「画布上有东西」。
const canvasSignature = (page) =>
  page.evaluateJson(`(() => {
    const canvas = document.querySelector('[data-group-name="${GROUP}"] canvas')
    if (!canvas) return JSON.stringify(null)
    const ctx = canvas.getContext('2d')
    const { data } = ctx.getImageData(0, 0, canvas.width, Math.min(canvas.height, 400))
    let painted = 0
    let hash = 0
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] !== 0) {
        painted++
        hash = (hash + i * data[i - 1]) % 2147483647
      }
    }
    return JSON.stringify({
      painted,
      hash,
      cssHeight: Math.round(canvas.getBoundingClientRect().height),
      rootHeight: Math.round(canvas.parentElement.getBoundingClientRect().height),
    })
  })()`)

const expandGroup = async (page) => {
  await page.clickSelector(`[data-group-name="${GROUP}"] .collapse-motion-header`)
  await sleep(900)
}

/*
 * 展开态是存在 localStorage 里的,而两个标签页同源共用一份 —— 不清掉的话第二个页面
 * 一开就是展开的,再点一下反而收起来了。
 */
const FRESH = { 'cache/collapse-group-map': '{}' }

try {
  section('画布路线')
  const page = await harness.openProxiesPage({
    settings: { ...FRESH, 'config/canvas-proxy-node-grid': 'true' },
  })

  await page.waitForCards(1)
  await sleep(1200)
  await expandGroup(page)

  const ready = await waitFor(
    async () => {
      const signature = await canvasSignature(page)

      return Boolean(signature && signature.painted > 1000)
    },
    { timeout: 15000 },
  )
  const painted = ready === null ? null : await canvasSignature(page)

  check('展开后画布画出了内容', Boolean(painted), painted ? `${painted.painted} px` : '没画出来')

  if (painted) {
    // 40 个节点、大卡 60px 高 + 8px 行距,不管几列都得比一屏高不少
    check(
      '根节点高度按节点数撑开',
      painted.rootHeight > painted.cssHeight && painted.rootHeight > 200,
      `内容 ${painted.rootHeight}px / 画布 ${painted.cssHeight}px`,
    )
  }

  const nodeCards = await page.evaluate(
    `document.querySelectorAll('[data-group-name="${GROUP}"] .proxies-scrollable-parent [class*="cursor-pointer"]').length`,
  )

  check('网格里没有节点卡片的 DOM', Number(nodeCards) === 0, `找到 ${nodeCards} 个`)

  // 点第一张卡片:画布左上角往里 60x30 稳稳落在第一行第一列
  const nowOfGroup = async () =>
    (await fetch(`${harness.mock.url}/proxies`).then((res) => res.json())).proxies[GROUP].now

  const before = await nowOfGroup()
  const canvasBox = await page.boxOf(`[data-group-name="${GROUP}"] canvas`, { dx: 60, dy: 30 })

  await page.click(canvasBox.x, canvasBox.y)
  await sleep(800)

  const after = await nowOfGroup()

  check('点画布能选中节点', Boolean(after) && after !== before, `${before} → ${after}`)

  /*
   * 延迟数字必须是三档延迟色,不是黑的。
   *
   * 这一条是真踩过的坑:--color-*-latency 只有中性主题才声明,其余主题全靠
   * tailwind.config.ts 里 var(--color-low-latency, …) 的兜底值;直接读自定义属性
   * 会拿到空串,画出来就是一片黑。
   */
  const latencyColorHits = await page.evaluateJson(`(() => {
    const probe = document.createElement('span')
    document.body.appendChild(probe)
    // 计算值可能是 oklch(),不能当 rgb 数字直接读;借浏览器自己的画布换算成真实像素,
    // 这样顺带也验了应用里那份 oklch → sRGB 的换算。
    const swatch = document.createElement('canvas').getContext('2d')
    const read = (expression) => {
      probe.style.color = expression
      swatch.fillStyle = getComputedStyle(probe).color
      swatch.fillRect(0, 0, 1, 1)
      const [r, g, b] = swatch.getImageData(0, 0, 1, 1).data
      return [r, g, b]
    }
    const targets = [
      read('var(--color-low-latency, oklch(0.66 0.1 160))'),
      read('var(--color-medium-latency, rgb(255, 197, 4))'),
      read('var(--color-high-latency, rgb(244, 96, 108))'),
    ]
    probe.remove()

    const canvas = document.querySelector('[data-group-name="${GROUP}"] canvas')
    const ctx = canvas.getContext('2d')
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const hits = [0, 0, 0]
    let nearBlack = 0
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 200) continue
      const [r, g, b] = [data[i], data[i + 1], data[i + 2]]
      targets.forEach((target, index) => {
        if (Math.abs(r - target[0]) + Math.abs(g - target[1]) + Math.abs(b - target[2]) < 40) {
          hits[index]++
        }
      })
      if (r < 40 && g < 40 && b < 40) nearBlack++
    }
    return JSON.stringify({ hits, nearBlack, targets })
  })()`)

  check(
    '延迟数字用的是延迟三色',
    latencyColorHits.hits.some((count) => count > 30),
    `命中 ${latencyColorHits.hits.join(' / ')} 像素`,
  )

  /*
   * 主题挂在 <body> 上而不是 <html>,取色取错元素的话整套会落回 daisyUI 默认调色板,
   * 换主题时画布纹丝不动 —— 这里就是盯这个。
   */
  const lightSignature = await canvasSignature(page)

  await page.evaluate(`document.body.setAttribute('data-theme', 'dark')`)
  await sleep(600)

  const darkSignature = await canvasSignature(page)

  check(
    '换主题后画布跟着换色',
    lightSignature && darkSignature && darkSignature.hash !== lightSignature.hash,
    `hash ${lightSignature?.hash} → ${darkSignature?.hash}`,
  )

  await page.evaluate(`document.body.setAttribute('data-theme', 'light')`)
  await sleep(600)

  // 组内滚动:画布被钉住(css 高度不变),但画的内容要跟着换
  const beforeScroll = await canvasSignature(page)

  await page.evaluate(`(() => {
    const el = document.querySelector('[data-group-name="${GROUP}"] .proxies-scrollable-parent')
    el.scrollTop = 200
    el.dispatchEvent(new Event('scroll'))
  })()`)
  await sleep(500)

  const afterScroll = await canvasSignature(page)

  check(
    '滚动时画布钉住且内容跟着滚',
    beforeScroll && afterScroll && afterScroll.hash !== beforeScroll.hash,
    `hash ${beforeScroll?.hash} → ${afterScroll?.hash}`,
  )

  await page.close()

  section('DOM 路线(开关关掉)')
  const domPage = await harness.openProxiesPage({
    settings: { ...FRESH, 'config/canvas-proxy-node-grid': 'false' },
  })

  await domPage.waitForCards(1)
  await sleep(1200)
  await expandGroup(domPage)

  const countDomCards = async () =>
    Number(
      await domPage.evaluate(
        `document.querySelectorAll('[data-group-name="${GROUP}"] .proxies-scrollable-parent [class*="cursor-pointer"]').length`,
      ),
    )

  await waitFor(async () => (await countDomCards()) > 0, { timeout: 15000 })

  const domCards = await countDomCards()

  check('关掉开关后仍是 DOM 卡片', domCards > 0, `${domCards} 张`)
  check(
    '关掉开关后没有画布',
    Number(
      await domPage.evaluate(
        `document.querySelectorAll('[data-group-name="${GROUP}"] canvas').length`,
      ),
    ) === 0,
  )

  await domPage.close()
} finally {
  await harness.close()
}

const failed = results.filter((item) => !item.ok)

console.log(`\n${results.length - failed.length}/${results.length} 通过`)
process.exit(failed.length ? 1 : 0)
