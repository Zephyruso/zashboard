/*
 * 把「mock 后端 + 静态服务(dist) + headless Chrome + 打开代理页」串成一件事。
 * bench 与 verify 都从这里起步,免得各写一份启动流程。
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { createMockServer } from '../mock-server.mjs'
import { connectBrowser, waitFor } from './cdp.mjs'
import { launchChrome } from './chrome.mjs'
import { findFreePort } from './ports.mjs'
import { serveDirectory } from './static-server.mjs'

const REPO_ROOT = join(import.meta.dirname, '..', '..')

export const DIST_DIR = join(REPO_ROOT, 'dist')

export const startHarness = async ({
  groups = 150,
  nodes = 60,
  connections = 300,
  appUrl,
  headless = true,
} = {}) => {
  if (!appUrl && !existsSync(join(DIST_DIR, 'index.html'))) {
    throw new Error('dist/ 里没有构建产物,先跑 pnpm build(或用 --url 指到已经跑着的服务)')
  }

  const mock = await createMockServer({ groups, nodes, connections })
  const app = appUrl ? { url: appUrl, close: () => {} } : await serveDirectory(DIST_DIR)
  const debuggingPort = await findFreePort()
  const chrome = await launchChrome({ port: debuggingPort, headless })
  const browser = await connectBrowser(debuggingPort)

  /*
   * 直接开 #/proxies?hostname=... 是不行的:没有后端时路由守卫会先跳到 /setup,
   * hash 上的 query 在这一跳里就丢了。所以先落地 localStorage 再进代理页。
   */
  const openProxiesPage = async ({ cpuThrottling = 1, viewport = {}, settings = {} } = {}) => {
    const page = await browser.newPage({ cpuThrottling, ...viewport })

    await page.goto(app.url)
    /*
     * 必须等页面真的落到应用的 origin 上再写 localStorage。
     * 冷启动时 2 秒不一定够,写早了就写进 about:blank 的存储区,应用一个字节也读不到 ——
     * 表现出来就是「明明 seed 过了却还是停在 /setup」。
     */
    const landed = await waitFor(async () => (await page.evaluate('location.origin')) === app.url, {
      timeout: 30000,
    })

    if (landed === null) {
      await page.close()
      throw new Error(`应用没能加载(${app.url}),确认 dist/ 是最新构建`)
    }

    await page.evaluate(`
      localStorage.setItem('setup/api-list', ${JSON.stringify(
        JSON.stringify([
          {
            uuid: 'perf',
            type: 'clash',
            protocol: 'http',
            host: '127.0.0.1',
            port: String(mock.port),
            password: '',
            secondaryPath: '',
            label: 'perf',
          },
        ]),
      )})
      localStorage.setItem('setup/active-uuid', 'perf')
      ${Object.entries(settings)
        .map(
          ([key, value]) =>
            `localStorage.setItem(${JSON.stringify(key)}, ${JSON.stringify(value)})`,
        )
        .join('\n      ')}
    `)
    if ((await page.evaluate(`localStorage.getItem('setup/active-uuid')`)) !== 'perf') {
      await page.close()
      throw new Error('后端配置没写进 localStorage,seed 逻辑或存储键可能变了')
    }

    // 计时起点定在这里:seed 与冷启动不算用户的等待,「刷新代理页到看见卡片」才是
    const navigationStartedAt = Date.now()

    await page.goto(`${app.url}/#/proxies`)
    await page.reload()

    const proxiesPage = withProxiesHelpers(page)

    proxiesPage.navigationStartedAt = navigationStartedAt
    // 起不来就当场说清楚:多半是 dist 太旧、mock 没连上,或者路由守卫把页面留在了 /setup
    // 轮询间隔放宽些:限速跑基准时,每次 evaluate 都在跟被测页面抢主线程
    const ready = await waitFor(
      async () =>
        await page.evaluate(
          `Boolean(document.querySelector('.overflow-y-scroll')) && location.hash.includes('proxies')`,
        ),
      { timeout: 30000, interval: 200 },
    )

    if (ready === null) {
      const href = await page.evaluate('location.href')
      const text = await page.evaluate('document.body.innerText.slice(0, 200)')

      await page.close()
      throw new Error(`代理页没能打开(${href})\n页面上是:${text.replace(/\n/g, ' | ')}`)
    }

    return proxiesPage
  }

  return {
    mock,
    app,
    openProxiesPage,
    setMockControl: (control) =>
      fetch(`${mock.url}/__mock/control`, {
        method: 'POST',
        body: JSON.stringify(control),
      }).then((res) => res.json()),
    async close() {
      browser.close()
      await chrome.close()
      await app.close()
      await mock.close()
    },
  }
}

// 代理页上反复要问的那几个问题,集中在这里
const withProxiesHelpers = (page) => {
  const helpers = {
    groupCardCount: () => page.evaluate(`document.querySelectorAll('[data-group-name]').length`),
    domNodeCount: () => page.evaluate(`document.getElementsByTagName('*').length`),
    scrollMetrics: () =>
      page.evaluateJson(`(() => {
        const el = document.querySelector('.overflow-y-scroll')
        return JSON.stringify(el ? { top: el.scrollTop, height: el.scrollHeight, client: el.clientHeight } : {})
      })()`),
    scrollTo: (top) =>
      page.evaluate(`(() => {
        const el = document.querySelector('.overflow-y-scroll')
        el.scrollTop = ${top}
        el.dispatchEvent(new Event('scroll'))
      })()`),
    // 返回元素中心点坐标,拿来发鼠标事件
    boxOf: (selector, { dx, dy } = {}) =>
      page.evaluateJson(`(() => {
        const el = document.querySelector(${JSON.stringify(selector)})
        if (!el) return 'null'
        const r = el.getBoundingClientRect()
        return JSON.stringify({
          x: Math.round(r.x + (${dx ?? 'null'} ?? r.width / 2)),
          y: Math.round(r.y + (${dy ?? 'null'} ?? r.height / 2)),
        })
      })()`),
    async clickSelector(selector, offset) {
      const box = await helpers.boxOf(selector, offset)

      if (!box) throw new Error(`点不到:${selector}`)

      await page.click(box.x, box.y)

      return box
    },
    waitForCards: (min = 1, timeout = 60000) =>
      waitFor(async () => (await helpers.groupCardCount()) >= min, { timeout }),
  }

  return Object.assign(page, helpers)
}
