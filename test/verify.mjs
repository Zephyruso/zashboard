/*
 * 代理页的行为冒烟:确认那些为「组很多」做的优化没有把功能改坏。
 *
 *   pnpm build && node test/verify.mjs
 *
 * 三条主线:
 *   1. 懒挂载 —— 只挂视口附近的卡片、滚动时回收、占位高度顶住原位置,同时搜索 / 展开 /
 *      路由往返恢复滚动位置这些照旧;
 *   2. 延迟表 —— 延迟按测速 url 建全局表并缓存,所以三种写入都必须还能刷新界面:
 *      整体替换 proxyMap(fetchProxies)、乐观改 now(切节点)、往 history 里 push(面板测速)。
 *   第 2 条是最容易悄悄坏掉的:少了一处依赖追踪,界面就停在旧数字上,不报错。
 *   3. 自动滚动 —— 路由往返按卡片锚点恢复；展开定位和测速重排定位都无动画
 *      (动态行高下带动画的滚动会被沿途的测量修正打断,停在半路)。
 */
import { parseArgs } from 'node:util'
import { sleep, waitFor } from './lib/cdp.mjs'
import { startHarness } from './lib/harness.mjs'

const { values } = parseArgs({
  options: {
    groups: { type: 'string', default: '60' },
    nodes: { type: 'string', default: '30' },
    conns: { type: 'string', default: '300' },
    url: { type: 'string' },
    headful: { type: 'boolean', default: false },
  },
})

const groups = Number(values.groups)
const results = []

const check = (name, ok, detail = '') => {
  results.push({ name, ok })
  console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? `  ${detail}` : ''}`)
}

const section = (title) => console.log(`\n${title}`)

// 面板测速模式下点组测速会逐个测节点,Selector 型的组才走这条分支
const SELECTOR_GROUP = 'Group-003'

const harness = await startHarness({
  groups,
  nodes: Number(values.nodes),
  connections: Number(values.conns),
  appUrl: values.url,
  headless: !values.headful,
})

try {
  section('虚拟滚动')
  const page = await harness.openProxiesPage()

  await page.waitForCards(1)
  await sleep(1500)

  const mountedAtTop = await page.groupCardCount()
  const domAtTop = await page.domNodeCount()
  const initial = await page.scrollMetrics()

  check(
    '首屏只渲染视口附近的卡片',
    mountedAtTop > 0 && mountedAtTop < groups,
    `${mountedAtTop} / ${groups} 张`,
  )
  // 没渲染的卡片也算进了总高度,所以列表一开始就该是能滚的高度,而不是随着滚动才长出来
  check(
    '列表总高度一开始就被撑满',
    initial.height > initial.client * 1.5,
    `${initial.height}px / 视口 ${initial.client}px`,
  )

  await page.scrollTo(Math.round(initial.height / 2))
  await sleep(1200)

  const middle = await page.scrollMetrics()
  // 视口里从上到下取若干个采样点,每个点都该被某张卡片盖住 —— 有一处没盖住就是露白了
  const uncovered = await page.evaluate(`(() => {
    const scroller = document.querySelector('.overflow-y-scroll')
    const rect = scroller.getBoundingClientRect()
    const cards = [...scroller.querySelectorAll('[data-group-name]')].map((el) =>
      el.getBoundingClientRect(),
    )
    const from = rect.top + 80
    const to = rect.bottom - 80
    let missed = 0

    for (let i = 0; i <= 10; i++) {
      const y = from + ((to - from) * i) / 10

      if (!cards.some((r) => r.top <= y && r.bottom >= y)) missed++
    }

    return missed
  })()`)

  check('滚到中段后视口内没有露白', uncovered === 0, `11 个采样点里露白 ${uncovered} 个`)
  /*
   * 没量过的卡片先用估算高度撑着,真正渲染出来后换成量到的高度,几像素的修正是正常的;
   * 不正常的是差出一屏 —— 那说明估算高度不对,滚动条会随着滚动明显伸缩、位置也会跳。
   */
  check(
    '滚动过程中列表总高度不明显漂移',
    Math.abs(middle.height - initial.height) <= Math.max(16, initial.height * 0.01),
    `${initial.height} → ${middle.height}`,
  )

  await page.scrollTo(initial.height)
  await sleep(1500)

  const domAfterScroll = await page.domNodeCount()

  const mountedAtBottom = await page.groupCardCount()

  check(
    '滚到底后 DOM 没有一路堆积',
    domAfterScroll < domAtTop * 2,
    `${domAtTop} → ${domAfterScroll} 个元素`,
  )
  check(
    '滚到底后仍只渲染窗口内的卡片',
    mountedAtBottom < groups,
    `${mountedAtBottom} / ${groups} 张`,
  )

  section('原有交互')
  const keptTop = Math.round(initial.height / 3)
  const pageAnchor = () =>
    page.evaluateJson(`(() => {
      const scroller = document.querySelector('.overflow-y-scroll')
      const viewportTop = scroller.getBoundingClientRect().top
      const items = [...document.querySelectorAll('[data-proxy-page-item]')]
        .map((element) => ({ element, rect: element.getBoundingClientRect() }))
        .filter(({ rect }) => rect.bottom > viewportTop)
        .sort((a, b) => a.rect.top - b.rect.top)
      const anchor = items[0]

      return JSON.stringify(anchor ? {
        item: anchor.element.dataset.proxyPageItem,
        offset: anchor.rect.top - viewportTop,
        scrollTop: scroller.scrollTop,
      } : {})
    })()`)

  await page.scrollTo(keptTop)
  await sleep(800)
  const anchorBeforeRouteChange = await pageAnchor()
  await page.evaluate(`location.hash = '#/connections'`)
  await sleep(1500)
  await page.evaluate(`location.hash = '#/proxies'`)
  await sleep(2500)

  const restoredAnchor = await pageAnchor()

  check(
    '路由往返后恢复同一张卡片及其视口偏移',
    restoredAnchor.item === anchorBeforeRouteChange.item &&
      Math.abs(restoredAnchor.offset - anchorBeforeRouteChange.offset) < 2,
    `${anchorBeforeRouteChange.item}@${anchorBeforeRouteChange.offset}px → ${restoredAnchor.item}@${restoredAnchor.offset}px (scrollTop ${anchorBeforeRouteChange.scrollTop} → ${restoredAnchor.scrollTop})`,
  )

  await page.scrollTo(0)
  await sleep(500)
  await page.evaluate(`(() => {
    const input = document.querySelector('input[placeholder*="earch"]')
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(input, 'Group-01')
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })()`)
  await sleep(1200)

  const searched = await page.evaluateJson(
    `JSON.stringify([...document.querySelectorAll('[data-group-name]')].map((el) => el.dataset.groupName))`,
  )

  check(
    '搜索只留下匹配的组',
    searched.length > 0 && searched.every((name) => name.startsWith('Group-01')),
    searched.slice(0, 3).join(', '),
  )

  await page.evaluate(`(() => {
    const input = document.querySelector('input[placeholder*="earch"]')
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(input, '')
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })()`)
  await sleep(1000)

  await page.clickSelector(`[data-group-name="${SELECTOR_GROUP}"] .collapse-motion-header`, {
    dx: 60,
    dy: 12,
  })
  await sleep(1200)

  const nodeCards = () =>
    page.evaluateJson(`JSON.stringify(
      [...document.querySelectorAll('[data-group-name="${SELECTOR_GROUP}"] .proxies-scrollable-parent .cursor-pointer')]
        .slice(0, 6)
        .map((el) => ({ name: el.innerText.split('\\n')[0], latency: (el.querySelector('.latency-tag')?.innerText ?? '').trim() }))
    )`)

  const expanded = await nodeCards()

  check('展开组能渲染出节点卡片', expanded.length > 0, `${expanded.length} 张`)

  section('延迟表(全局缓存)的刷新')
  const groupState = () =>
    page.evaluateJson(`(() => {
      const card = document.querySelector('[data-group-name="${SELECTOR_GROUP}"]')
      return JSON.stringify({
        now: card.innerText.split('\\n').find((line) => line.startsWith('Node-')) ?? '',
        latency: (card.querySelector('.latency-tag')?.innerText ?? '').trim(),
      })
    })()`)

  // ① 乐观改 now:切节点时 proxyMap 的引用不变,只改了组的 now 字段
  const before = await groupState()
  const picked = expanded.find((node) => node.name !== before.now && node.latency)

  await page.clickSelector(
    `[data-group-name="${SELECTOR_GROUP}"] .proxies-scrollable-parent .cursor-pointer:nth-of-type(${
      expanded.findIndex((node) => node.name === picked?.name) + 1
    })`,
    { dy: 8 },
  )
  await sleep(1200)

  const afterSelect = await groupState()

  check(
    '切换节点后组头部跟着换延迟',
    afterSelect.now === picked?.name && afterSelect.latency !== before.latency,
    `${before.now} ${before.latency} → ${afterSelect.now} ${afterSelect.latency}`,
  )

  // ② 往 history push:面板测速模式下逐个节点乐观写入,同样不换 proxyMap 引用。
  //    让 mock 的测速端点慢一点、值固定,才采得到中间态(否则一瞬间就被 fetchProxies 覆盖)。
  await harness.setMockControl({ stableLatency: true, latencyDelayMs: 800, latencyValue: 999 })

  let lastSample = []
  const beforeTest = await nodeCards()

  await page.clickSelector(`[data-group-name="${SELECTOR_GROUP}"] .latency-tag`)

  const sawPushedValue = await waitFor(
    async () => {
      lastSample = await nodeCards()

      // CountUp 会把数字滚上去,中途读到的是过渡值,所以只认最终值
      return lastSample.some((node) => node.latency === '999')
    },
    { timeout: 30000, interval: 150 },
  )

  check(
    '面板测速逐个写入的延迟能实时刷新',
    sawPushedValue !== null,
    sawPushedValue !== null
      ? '节点卡片出现 999'
      : `点了组测速但节点延迟没动:${beforeTest.map((n) => n.latency).join('/')} → ${lastSample.map((n) => n.latency).join('/')}`,
  )

  // ③ 整体替换 proxyMap:后端测速模式走 fetchProxies 拉一份新的回来
  await harness.setMockControl({ stableLatency: false, latencyDelayMs: 0 })

  const corePage = await harness.openProxiesPage({ settings: { 'config/speedtest-mode': 'core' } })

  await corePage.waitForCards(1)
  await sleep(1500)

  const coreLatency = () =>
    corePage.evaluate(
      `(document.querySelector('[data-group-name="${SELECTOR_GROUP}"] .latency-tag')?.innerText ?? '').trim()`,
    )
  const latencyBefore = await coreLatency()

  await corePage.clickSelector(`[data-group-name="${SELECTOR_GROUP}"] .latency-tag`)

  const refreshed = await waitFor(
    async () => {
      const now = await coreLatency()

      return now && now !== latencyBefore
    },
    { timeout: 20000, interval: 200 },
  )

  check(
    '测速后重新拉取的延迟能刷新',
    refreshed !== null,
    `${latencyBefore} → ${await coreLatency()}`,
  )

  await corePage.close()

  section('自动滚动规则')

  // 让激活节点落在列表末尾,并给各节点恢复递增延迟；窄屏下展开时必须瞬时定位到底部。
  harness.mock.proxies[SELECTOR_GROUP].now = harness.mock.nodeNames.at(-1)
  harness.mock.nodeNames.forEach((name, index) => {
    harness.mock.proxies[name].history = [{ time: new Date().toISOString(), delay: 50 + index }]
  })
  await harness.setMockControl({ stableLatency: true, latencyDelayMs: 0, latencyValue: 999 })

  const scrollPage = await harness.openProxiesPage({
    viewport: { width: 390, height: 844, mobile: true },
    settings: {
      'config/two-columns': 'false',
      'config/proxy-sort-type': 'latencyasc',
      'cache/collapse-group-map': '{}',
    },
  })

  await scrollPage.waitForCards(1)
  await sleep(1200)
  await scrollPage.evaluate(`(() => {
    const originalScrollTo = HTMLElement.prototype.scrollTo
    window.__proxyScrollCalls = []
    HTMLElement.prototype.scrollTo = function (...args) {
      if (this.classList.contains('proxies-scrollable-parent')) {
        const options = args[0]
        window.__proxyScrollCalls.push(
          typeof options === 'object'
            ? { top: options.top, behavior: options.behavior }
            : { top: args[1] },
        )
      }
      return originalScrollTo.apply(this, args)
    }

    const input = document.querySelector('input[placeholder*="earch"]')
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
    setter.call(input, '${SELECTOR_GROUP}')
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })()`)
  await sleep(700)
  await scrollPage.clickSelector(`[data-group-name="${SELECTOR_GROUP}"] .collapse-motion-header`, {
    dx: 60,
    dy: 12,
  })
  await sleep(1000)

  const expansionScroll = await scrollPage.evaluateJson(`(() => {
    const scroller = document.querySelector(
      '[data-group-name="${SELECTOR_GROUP}"] .proxies-scrollable-parent'
    )
    return JSON.stringify({
      top: scroller.scrollTop,
      calls: window.__proxyScrollCalls,
    })
  })()`)

  check(
    '展开组定位激活节点使用瞬时滚动',
    expansionScroll.top > 0 &&
      expansionScroll.calls.some((call) => call.top > 0 && call.behavior !== 'smooth'),
    `scrollTop ${expansionScroll.top}, ${JSON.stringify(expansionScroll.calls)}`,
  )

  // 回到顶部测速 Node-001；999ms 会把它从首屏排到末尾,定位同样瞬时,位置提示交给高亮。
  await scrollPage.evaluate(`(() => {
    const scroller = document.querySelector(
      '[data-group-name="${SELECTOR_GROUP}"] .proxies-scrollable-parent'
    )
    scroller.scrollTo({ top: 0, behavior: 'auto' })
    window.__proxyScrollCalls = []
  })()`)
  await sleep(500)

  const testedNode = await scrollPage.evaluateJson(`(() => {
    const cards = document.querySelectorAll(
      '[data-group-name="${SELECTOR_GROUP}"] .proxies-scrollable-parent .cursor-pointer'
    )
    const card = [...cards].find((element) => element.innerText.startsWith('Node-001'))
    const tag = card.querySelector('.latency-tag')
    const rect = tag.getBoundingClientRect()

    return JSON.stringify({
      name: card.innerText.split('\\n')[0],
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height / 2,
    })
  })()`)

  await scrollPage.click(testedNode.x, testedNode.y)

  const sawScroll = await waitFor(
    () =>
      scrollPage.evaluate(
        `window.__proxyScrollCalls.some((call) => call.top > 0 && call.behavior !== 'smooth')`,
      ),
    { timeout: 5000, interval: 100 },
  )
  await sleep(1000)

  const testedNodeVisible = await scrollPage.evaluate(`(() => {
    const scroller = document.querySelector(
      '[data-group-name="${SELECTOR_GROUP}"] .proxies-scrollable-parent'
    )
    const card = [...scroller.querySelectorAll('.cursor-pointer')].find(
      (element) => element.innerText.split('\\n')[0] === ${JSON.stringify('Node-001 🇭🇰')}
    )
    const viewport = scroller.getBoundingClientRect()
    const rect = card?.getBoundingClientRect()

    return Boolean(rect && rect.top >= viewport.top && rect.bottom <= viewport.bottom)
  })()`)

  const usedSmooth = await scrollPage.evaluate(
    `window.__proxyScrollCalls.some((call) => call.behavior === 'smooth')`,
  )

  check(
    '按延迟排序后瞬时滚动到测速节点',
    sawScroll !== null && testedNodeVisible && !usedSmooth,
    JSON.stringify(await scrollPage.evaluate(`window.__proxyScrollCalls`)),
  )

  await scrollPage.close()
  await page.close()
} finally {
  await harness.close()
}

const failed = results.filter((result) => !result.ok)

console.log(`\n${results.length - failed.length}/${results.length} 项通过`)

if (failed.length) {
  process.exitCode = 1
}
