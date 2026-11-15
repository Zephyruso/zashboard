// Top chrome must occlude a morphing card just like the dock, including folder mode.
// pnpm build && node test/mobile-panel-layers.mjs
import assert from 'node:assert/strict'
import { sleep, waitFor } from './lib/cdp.mjs'
import { startHarness } from './lib/harness.mjs'

const harness = await startHarness({ groups: 30, nodes: 60, connections: 0, gpu: true })
await harness.setMockControl({ stableLatency: true })

const finishAnimations = async (page) => {
  await page.evaluate(`document.getAnimations().forEach(animation => animation.finish())`)
  await sleep(180)
}

try {
  for (const { folders, height, safeTop } of [
    { folders: false, height: 844, safeTop: 0 },
    { folders: true, height: 844, safeTop: 0 },
    { folders: true, height: 568, safeTop: 0 },
    { folders: true, height: 568, safeTop: 44 },
  ]) {
    const page = await harness.openProxiesPage({
      viewport: { width: 390, height, mobile: true },
      settings: {
        'config/proxy-folder-mode-setting': folders ? 'on' : 'off',
        'config/scroll-animation-effect': 'false',
      },
    })
    await page.waitForCards(1)
    if (safeTop) {
      await page.evaluate(`(() => {
        const style = document.createElement('style')
        style.textContent = '.ctrls-bar { padding-top: ${safeTop}px !important }'
        document.head.append(style)
      })()`)
    }
    await sleep(450)
    assert.equal(await page.evaluate(`!!document.querySelector('.proxy-folder-top-bar')`), folders)
    await page.evaluate(`(() => {
      const topBar = document.querySelector('.proxy-folder-top-bar') || document.querySelector('.ctrls-bar')
      const card = document.querySelector('[data-group-name="Group-000"]')
      document.querySelector('.overflow-y-scroll').scrollTop += card.getBoundingClientRect().top - topBar.getBoundingClientRect().bottom + 40
    })()`)
    await sleep(450)
    const tap = await page.evaluateJson(`(() => {
      const card = document.querySelector('[data-group-name="Group-000"]').getBoundingClientRect()
      return JSON.stringify({ x: card.left + 5, y: card.bottom - 4 })
    })()`)
    await page.click(tap.x, tap.y)
    assert.notEqual(
      await waitFor(
        () =>
          page.evaluate(`!!document.querySelector('.proxy-group-panel')?.getAnimations().length`),
        { interval: 10 },
      ),
      null,
    )
    await page.evaluate(
      `document.getAnimations().forEach(animation => { animation.pause(); animation.currentTime = 0 })`,
    )

    const layers = await page.evaluateJson(`(() => {
      const card = document.querySelector('[data-group-name="Group-000"]').getBoundingClientRect()
      const sample = selector => {
        const bar = document.querySelector(selector)
        if (!bar) return null
        const rect = bar.getBoundingClientRect()
        const hit = document.elementFromPoint(card.left + 24, rect.bottom - 10)
        const dim = bar.querySelector('.page-dim-layer')
        return { above: bar.contains(hit), dimHit: hit === dim, z: Number(getComputedStyle(bar).zIndex), bottom: rect.bottom }
      }
      return JSON.stringify({ controls: sample('.ctrls-bar'), folders: sample('.proxy-folder-top-bar'), sourceTop: card.top, sourceBottom: card.bottom })
    })()`)
    assert.ok(layers.controls.above && layers.controls.dimHit, '主控制栏及安全区始终在面板上方')
    if (folders) {
      assert.ok(
        layers.folders.above && layers.folders.dimHit,
        '文件夹栏必须遮住正在从其下方展开的卡片',
      )
      assert.ok(layers.folders.z > 25 && layers.folders.z < layers.controls.z)
    }
    const top = (layers.folders || layers.controls).bottom
    assert.ok(
      layers.sourceTop < top && layers.sourceBottom > top,
      '确实覆盖部分卡片被顶部遮住的场景',
    )
    await finishAnimations(page)

    const bounds = await page.evaluateJson(`(() => {
      const panel = document.querySelector('.proxy-group-panel').getBoundingClientRect()
      const controls = document.querySelector('.ctrls-bar').getBoundingClientRect()
      const folders = document.querySelector('.proxy-folder-top-bar')?.getBoundingClientRect()
      const dock = document.querySelector('.tab-bar').getBoundingClientRect()
      const bar = folders || controls
      const dims = [...document.querySelectorAll('.page-dim-layer')]
      return JSON.stringify({
        top: panel.top, bottom: panel.bottom, chromeBottom: Math.max(controls.bottom, folders?.bottom || 0), dockTop: dock.top,
        controlsDim: Number(getComputedStyle(document.querySelector('.ctrls-bar > .page-dim-layer')).opacity),
        folderDim: folders ? Number(getComputedStyle(document.querySelector('.proxy-folder-top-bar > .page-dim-layer')).opacity) : null,
        tap: { x: bar.right - 20, y: bar.top + bar.height / 2 },
        folderManager: sessionStorage.getItem('cache/folder-manager-open'),
      })
    })()`)
    assert.ok(bounds.top >= bounds.chromeBottom + 15, '停稳后面板完整避开顶部所有栏')
    assert.ok(bounds.bottom <= bounds.dockTop - 15, '停稳后面板继续避开 dock')
    assert.equal(bounds.controlsDim, 1)
    if (folders) assert.equal(bounds.folderDim, bounds.controlsDim, '顶部两条栏同步变暗')
    if (safeTop) await page.screenshot('/tmp/zashboard-top-layers-safe-area.png')

    await page.click(bounds.tap.x, bounds.tap.y)
    await finishAnimations(page)
    assert.equal(await page.evaluate(`document.querySelectorAll('.proxy-group-panel').length`), 0)
    assert.equal(
      await page.evaluate(`sessionStorage.getItem('cache/folder-manager-open')`),
      bounds.folderManager,
      '点击顶部遮罩只关闭面板，不触发背后的文件夹管理',
    )
    assert.equal(
      await page.evaluate(
        `[...document.querySelectorAll('.page-dim-layer')].every(el => Number(getComputedStyle(el).opacity) === 0 && getComputedStyle(el).pointerEvents === 'none')`,
      ),
      true,
    )
    await page.close()
    console.log(
      `✓ ${folders ? '文件夹模式' : '普通模式'} / 高度 ${height} / 顶部安全区 ${safeTop}：遮挡、避让、变暗及点击正确`,
    )
  }

  const desktop = await harness.openProxiesPage({
    settings: { 'config/proxy-folder-mode-setting': 'on' },
  })
  assert.notEqual(
    await waitFor(() => desktop.evaluate(`!!document.querySelector('.proxy-folder-top-bar')`)),
    null,
  )
  assert.equal(
    await desktop.evaluate(
      `getComputedStyle(document.querySelector('.proxy-folder-top-bar')).zIndex`,
    ),
    '10',
  )
  assert.equal(
    await desktop.evaluate(`!!document.querySelector('.proxy-folder-top-bar > .page-dim-layer')`),
    false,
  )
  await desktop.close()
  console.log('✓ 桌面文件夹栏保持原有层级')
} finally {
  await harness.close()
}
