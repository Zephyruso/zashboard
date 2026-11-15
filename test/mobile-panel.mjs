// Mobile morph: geometry, interruption, dimming, rounded clipping and teardown.
// pnpm build && node test/mobile-panel.mjs
import assert from 'node:assert/strict'
import { sleep, waitFor } from './lib/cdp.mjs'
import { startHarness } from './lib/harness.mjs'

const harness = await startHarness({ groups: 12, nodes: 60, connections: 0, gpu: true })
for (const [index, count] of [1, 2, 4, 8, 60, 60].entries()) {
  const group = harness.mock.proxies[`Group-${String(index).padStart(3, '0')}`]
  group.all = harness.mock.nodeNames.slice(0, count)
  group.now = group.all.at(-1)
}
await harness.setMockControl({ stableLatency: true })

const openPage = async (settings = {}, width = 390) => {
  const page = await harness.openProxiesPage({
    viewport: { width, height: 844, mobile: true },
    settings: {
      'config/scroll-animation-effect': 'false',
      'config/group-proxies-by-provider': 'false',
      'config/proxy-card-size': 'large',
      'config/truncate-proxy-name': 'true',
      ...settings,
    },
  })
  await page.waitForCards(6)
  await sleep(300)
  await page.evaluate(`(() => {
    window.__panelErrors = []
    addEventListener('error', e => __panelErrors.push(e.message))
    addEventListener('unhandledrejection', e => __panelErrors.push(String(e.reason)))
    window.__panelCanvasCalls = 0
    const fill = CanvasRenderingContext2D.prototype.fillRect
    CanvasRenderingContext2D.prototype.fillRect = function(...args) { __panelCanvasCalls++; return fill.apply(this, args) }
    window.__panelMetaWrites = 0
    new MutationObserver(records => { __panelMetaWrites += records.length }).observe(document.querySelector('meta[name="theme-color"]'), { attributes: true })
  })()`)
  return page
}

const run = (page, actions) =>
  page.evaluateJson(`(async () => {
  const frames = []
  const started = performance.now()
  const read = () => Array.from({ length: 6 }, (_, index) => document.querySelector('[data-group-name="Group-' + String(index).padStart(3, '0') + '"]')).map(card => {
    const panel = card.querySelector('.proxy-group-panel')
    if (!panel) return { mounted: false, hidden: !!card.querySelector('.base-container.invisible') }
    const clip = panel.querySelector('.proxy-group-panel-clip')
    const content = panel.querySelector('.proxy-group-panel-content')
    const clips = [...panel.querySelectorAll('.proxy-group-panel-clip')]
    const bounds = clips.map(el => el.getBoundingClientRect())
    const rect = { x: Math.max(...bounds.map(r => r.left)), y: Math.max(...bounds.map(r => r.top)) }
    rect.width = Math.min(...bounds.map(r => r.right)) - rect.x
    rect.height = Math.min(...bounds.map(r => r.bottom)) - rect.y
    const radii = clips.map((el, i) => {
      const radius = parseFloat(getComputedStyle(el).borderTopLeftRadius)
      return [radius * bounds[i].width / el.offsetWidth, radius * bounds[i].height / el.offsetHeight]
    })
    const scale = content.getBoundingClientRect().width / content.offsetWidth
    const active = panel.querySelector('.proxy-active-card')?.getBoundingClientRect()
    const viewport = panel.querySelector('.proxies-scrollable-parent').getBoundingClientRect()
    return {
      mounted: true, moving: panel.classList.contains('proxy-group-panel-moving'),
      hidden: !!card.querySelector(':scope > .base-container.invisible'),
      native: panel.getAnimations().length,
      x: rect.x, y: rect.y, width: rect.width, height: rect.height, scale, radii,
      lockedHeight: panel.style.height,
      radius: getComputedStyle(clip).borderTopLeftRadius,
      mask: getComputedStyle(clip).maskImage,
      glassOpacity: Number(getComputedStyle(panel.querySelector('.proxy-group-glass')).opacity),
      surfaceOpacity: Number(getComputedStyle(panel.querySelector('.proxy-group-motion-surface')).opacity),
      rows: panel.querySelectorAll('[data-index]').length,
      activeVisible: !!active && active.top >= viewport.top - 1 && active.bottom <= viewport.bottom + 1,
    }
  })
  let recording = true
  const sample = () => { frames.push({ time: performance.now() - started, cards: read() }); if (recording) requestAnimationFrame(sample) }
  requestAnimationFrame(sample)
  for (const [delay, index] of ${JSON.stringify(actions)}) {
    if (delay) await new Promise(r => setTimeout(r, delay))
    document.querySelector('[data-group-name="Group-' + String(index).padStart(3, '0') + '"]').click()
  }
  const deadline = performance.now() + 3000
  do { await new Promise(r => setTimeout(r, 25)) }
  while (document.querySelector('.proxy-group-panel-moving') && performance.now() < deadline)
  await new Promise(r => setTimeout(r, 180))
  recording = false
  return JSON.stringify({frames, final: read(), errors: __panelErrors.slice(), canvasCalls: __panelCanvasCalls, metaWrites: __panelMetaWrites})
})()`)

const check = (result, open) => {
  assert.deepEqual(result.errors, [])
  assert.equal(result.canvasCalls, 0, '面板动画不能同步初始化 Canvas')
  for (let i = 0; i < result.final.length; i++) {
    const card = result.final[i]
    assert.equal(card.mounted, open.includes(i), `组 ${i} 的最终展开状态`)
    assert.equal(card.hidden, open.includes(i), `组 ${i} 的源卡片显隐`)
    if (!card.mounted) continue
    assert.equal(card.moving, false)
    assert.equal(card.native, 0, '结束后释放主动画')
    assert.equal(card.lockedHeight, '', '结束后恢复自然高度')
    assert.ok(parseFloat(card.radius) > 0 && card.mask !== 'none', '收尾保留圆角裁剪')
    assert.ok(card.rows > 0)
    assert.ok(card.activeVisible, '当前节点应在列表可视区域内')
    assert.ok(card.height <= 521)
    const moving = result.frames
      .map((f) => f.cards[i])
      .filter((c) => c.mounted && c.moving && c.native)
    if (moving.length) {
      assert.ok(
        moving.every((c) => Math.abs(c.scale - 1) < 0.035),
        '反向缩放保持文字尺寸',
      )
      assert.ok(Math.abs(moving.at(-1).height - card.height) < 2, '释放高度锁时不跳动')
    }
  }
  for (const frame of result.frames) {
    for (const card of frame.cards) {
      if (card.mounted && card.moving && card.native) {
        assert.ok(
          card.radii.every(
            ([rx, ry]) =>
              Math.abs(rx - parseFloat(card.radius)) < 0.1 &&
              Math.abs(ry - parseFloat(card.radius)) < 0.1,
          ),
          '开合过程中圆角半径不能被缩小',
        )
      }
      if (card.mounted && !card.moving && card.surfaceOpacity > 0 && card.surfaceOpacity < 1) {
        assert.equal(card.glassOpacity, 1, '恢复毛玻璃时必须有完整底层，不能双层交叉变透明')
      }
    }
  }
}

try {
  let page = await openPage()
  for (const index of [0, 1, 2, 3, 4]) {
    const opened = await run(page, [[0, index]])
    check(opened, [index])
    assert.ok(
      opened.frames.some((f) => f.cards[index].native > 0),
      '实际使用原生动画',
    )
    check(await run(page, [[0, index]]), [])
  }
  console.log('✓ 1/2/4/8/60 节点：文字不缩放，结束无高度跳动，圆角保留')

  const warm = await run(page, [[0, 2]])
  check(warm, [2])
  assert.ok(
    warm.frames.filter((f) => f.cards[2].mounted && !f.cards[2].hidden).length <= 1,
    '缓存布局跳过逐帧等待',
  )
  check(await run(page, [[0, 2]]), [])
  check(
    await run(page, [
      [0, 2],
      [0, 2],
    ]),
    [],
  )
  check(
    await run(page, [
      [0, 2],
      [140, 2],
      [90, 2],
    ]),
    [2],
  )
  check(await run(page, [[0, 2]]), [])
  console.log('✓ 重开、准备中取消、开合反向：最终状态与点击一致')

  check(await run(page, [[0, 4]]), [4])
  check(
    await run(page, [
      [0, 4],
      [80, 5],
    ]),
    [5],
  )
  await page.evaluate(`document.querySelector('.page-dim-layer').click()`)
  await sleep(900)
  check(await run(page, []), [])
  assert.equal(
    await page.evaluate(
      `document.querySelectorAll('.page-dim-layer').length > 0 && [...document.querySelectorAll('.page-dim-layer')].every(el => getComputedStyle(el).pointerEvents === 'none' && Number(getComputedStyle(el).opacity) === 0)`,
    ),
    true,
  )
  console.log('✓ 跨组交接、遮罩点击：变暗同步且没有残留拦截层')

  await page.evaluate(`(() => {
    const app = document.getElementById('app-content')
    app.classList.add('custom-background')
    app.style.backgroundImage = 'linear-gradient(135deg, #276c98, #9f453c)'
  })()`)
  check(await run(page, [[0, 2]]), [2])
  await page.screenshot('/tmp/zashboard-mobile-panel-open.png')
  await page.evaluate(`document.querySelector('[data-group-name="Group-002"]').click()`)
  await sleep(40)
  await page.evaluate(`(() => {
    window.__pausedPanelAnimations = document.getAnimations()
    for (const animation of __pausedPanelAnimations) {
      animation.pause()
      animation.currentTime = Number(animation.effect.getTiming().duration) * 0.5
    }
  })()`)
  await page.screenshot('/tmp/zashboard-mobile-panel-closing.png')
  await page.evaluate(`__pausedPanelAnimations.forEach(animation => animation.play())`)
  check(await run(page, []), [])
  console.log('✓ 毛玻璃交接：背景覆盖不中断')

  await page.call('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  })
  check(await run(page, [[0, 2]]), [2])
  check(await run(page, [[0, 2]]), [])
  await page.call('Emulation.setEmulatedMedia', { features: [] })
  console.log('✓ 减少动态效果：可正常展开、收起')

  for (const delay of [0, 180]) {
    await page.evaluate(
      `document.querySelector('[data-group-name="Group-000"]').click(); setTimeout(() => { location.hash = '#/logs' }, ${delay})`,
    )
    await sleep(300)
    await page.evaluate(`location.hash = '#/proxies'`)
    assert.notEqual(
      await waitFor(() =>
        page.evaluate(
          `!!document.querySelector('[data-group-name]') && !!document.querySelector('.overflow-y-scroll')`,
        ),
      ),
      null,
    )
    assert.equal(await page.evaluate(`document.querySelectorAll('.proxy-group-panel').length`), 0)
    assert.deepEqual(await page.evaluate(`__panelErrors`), [])
  }
  console.log('✓ 准备和动画中卸载：滚动锁、动画和遮罩均释放')
  await page.close()

  for (const [settings, width, label] of [
    [{ 'config/group-proxies-by-provider': 'true' }, 390, '按供应商分组'],
    [
      { 'config/proxy-card-size': 'small', 'config/min-proxy-card-width': '130' },
      768,
      '宽屏小卡片',
    ],
    [
      { 'config/truncate-proxy-name': 'false', 'config/min-proxy-card-width': '90' },
      390,
      '允许名称换行',
    ],
  ]) {
    page = await openPage(settings, width)
    check(await run(page, [[0, 4]]), [4])
    check(await run(page, [[0, 4]]), [])
    await page.close()
    console.log('✓ ' + label + '：列表定位和面板高度正常')
  }
} finally {
  await harness.close()
}
