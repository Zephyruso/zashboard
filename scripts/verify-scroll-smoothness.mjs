import { createServer } from 'node:http'
import { createReadStream, existsSync } from 'node:fs'
import { mkdir, mkdtemp, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { readFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'

const root = resolve(process.cwd(), 'dist')
const sourceRoot = resolve(process.cwd(), 'src')
const args = new Set(process.argv.slice(2))
const shouldRunFixtureBrowser =
  process.env.ZASHBOARD_SCROLL_VERIFY_FIXTURE_BROWSER === '1' || args.has('--fixture-browser')
const shouldRunAppBrowser =
  process.env.ZASHBOARD_SCROLL_VERIFY_APP_BROWSER === '1' || args.has('--app-browser')
const shouldRunProviderGroupedAppBrowser =
  process.env.ZASHBOARD_SCROLL_VERIFY_PROVIDER_GROUPED_APP_BROWSER === '1' ||
  args.has('--provider-grouped-app-browser')
const shouldServeOnly = process.env.ZASHBOARD_SCROLL_VERIFY_SERVER_ONLY === '1' || args.has('--server-only')
const defaultPort = shouldRunAppBrowser ? 4195 : shouldRunProviderGroupedAppBrowser ? 4196 : 4194
const port = Number(process.env.ZASHBOARD_SCROLL_VERIFY_PORT || defaultPort)
const baseUrl = `http://localhost:${port}`
const screenshotRoot = resolve(
  process.env.ZASHBOARD_SCROLL_VERIFY_SCREENSHOT_DIR ||
    join(process.cwd(), 'output', 'verify-scroll-smoothness'),
)
const servedRequests = []
const realtimeWebSocketPaths = new Set(['/connections', '/logs', '/memory', '/traffic'])
const realtimeWebSockets = new Set()

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

const sourceFiles = {
  componentsCss: join(sourceRoot, 'assets', 'styles', 'components.css'),
  homePage: join(sourceRoot, 'views', 'HomePage.vue'),
  overviewPage: join(sourceRoot, 'views', 'OverviewPage.vue'),
  proxiesPage: join(sourceRoot, 'views', 'ProxiesPage.vue'),
  settingsPage: join(sourceRoot, 'views', 'SettingsPage.vue'),
  collapseCard: join(sourceRoot, 'components', 'common', 'CollapseCard.vue'),
  virtualScroller: join(sourceRoot, 'components', 'common', 'VirtualScroller.vue'),
  proxyGroup: join(sourceRoot, 'components', 'proxies', 'ProxyGroup.vue'),
  proxyGroupForMobile: join(sourceRoot, 'components', 'proxies', 'ProxyGroupForMobile.vue'),
  proxyProvider: join(sourceRoot, 'components', 'proxies', 'ProxyProvider.vue'),
  proxiesContent: join(sourceRoot, 'components', 'proxies', 'ProxiesContent.vue'),
  proxiesByProvider: join(sourceRoot, 'components', 'proxies', 'ProxiesByProvider.vue'),
  proxiesCtrl: join(sourceRoot, 'components', 'controls', 'ProxiesCtrl.tsx'),
  virtualProxyNodeGrid: join(sourceRoot, 'components', 'proxies', 'VirtualProxyNodeGrid.vue'),
  proxies: join(sourceRoot, 'composables', 'proxies.ts'),
  proxiesScroll: join(sourceRoot, 'composables', 'proxiesScroll.ts'),
  bouncein: join(sourceRoot, 'composables', 'bouncein.ts'),
  renderProxies: join(sourceRoot, 'composables', 'renderProxies.ts'),
  settingsComposable: join(sourceRoot, 'composables', 'settings.ts'),
  swipe: join(sourceRoot, 'composables', 'swipe.ts'),
  proxiesStore: join(sourceRoot, 'store', 'proxies.ts'),
  connectionsStore: join(sourceRoot, 'store', 'connections.ts'),
  logsStore: join(sourceRoot, 'store', 'logs.ts'),
  logsPage: join(sourceRoot, 'views', 'LogsPage.vue'),
  proxyNodeCard: join(sourceRoot, 'components', 'proxies', 'ProxyNodeCard.vue'),
  proxyIcon: join(sourceRoot, 'components', 'proxies', 'ProxyIcon.vue'),
  proxyPreview: join(sourceRoot, 'components', 'proxies', 'ProxyPreview.vue'),
  latencyTag: join(sourceRoot, 'components', 'proxies', 'LatencyTag.vue'),
  folderItem: join(sourceRoot, 'components', 'proxies', 'folders', 'FolderItem.vue'),
  folderTopBar: join(sourceRoot, 'components', 'proxies', 'folders', 'FolderTopBar.vue'),
}

const readText = (file) => readFile(file, 'utf8')

const createMockBackend = () => {
  const providerNames = ['Provider Alpha', 'Provider Beta', 'Provider Gamma', 'Provider Delta']
  const providers = Object.fromEntries(
    providerNames.map((name) => [
      name,
      {
        name,
        proxies: [],
        testUrl: 'https://example.invalid/generate_204',
        updatedAt: '2026-06-05T00:00:00.000Z',
        vehicleType: 'HTTP',
      },
    ]),
  )
  const proxies = {
    GLOBAL: {
      name: 'GLOBAL',
      type: 'Selector',
      now: 'Group 01',
      all: [],
      history: [],
      udp: true,
    },
    DIRECT: { name: 'DIRECT', type: 'Direct', history: [], udp: true },
    REJECT: { name: 'REJECT', type: 'Reject', history: [], udp: false },
  }

  for (let groupIndex = 1; groupIndex <= 28; groupIndex += 1) {
    const groupName = `Group ${String(groupIndex).padStart(2, '0')}`
    const nodes = []
    proxies.GLOBAL.all.push(groupName)

    for (let nodeIndex = 1; nodeIndex <= 12; nodeIndex += 1) {
      const nodeName = `${groupName} Node ${String(nodeIndex).padStart(2, '0')}`
      const providerName = providerNames[(groupIndex + nodeIndex) % providerNames.length]
      const node = {
        name: nodeName,
        type: nodeIndex % 2 === 0 ? 'Shadowsocks' : 'Trojan',
        history: [{ time: '2026-06-05T00:00:00.000Z', delay: 40 + nodeIndex }],
        udp: true,
        'provider-name': providerName,
      }

      nodes.push(nodeName)
      proxies[nodeName] = node
      providers[providerName].proxies.push(node)
    }

    proxies[groupName] = {
      name: groupName,
      type: 'Selector',
      now: nodes[0],
      all: nodes,
      history: [],
      udp: true,
    }
  }

  return {
    configs: {
      port: 7890,
      'socks-port': 7891,
      'redir-port': 0,
      'tproxy-port': 0,
      'mixed-port': 7893,
      'allow-lan': false,
      'bind-address': '*',
      mode: 'rule',
      'mode-list': ['rule', 'global', 'direct'],
      modes: ['rule', 'global', 'direct'],
      'log-level': 'info',
      ipv6: false,
      tun: { enable: false },
    },
    providers: { providers },
    proxies: { proxies },
    rules: { rules: [] },
    version: { version: 'Meta-Scroll-Verify' },
  }
}

const mockBackend = createMockBackend()

const getSetupScript = () => {
  const blurIntensity = Number(process.env.ZASHBOARD_SCROLL_VERIFY_BLUR_INTENSITY ?? 10)
  const scrollAnimationEffect = process.env.ZASHBOARD_SCROLL_VERIFY_SCROLL_ANIMATION !== '0'
  const lowPowerMode = process.env.ZASHBOARD_SCROLL_VERIFY_LOW_POWER === '1'
  const backend = {
    host: 'localhost',
    port: String(port),
    secondaryPath: '',
    password: '',
    protocol: 'http',
    uuid: 'scroll-verify',
    label: 'Scroll Verify',
    disableUpgradeCore: true,
  }

  return `<script>
localStorage.clear();
localStorage.setItem('setup/api-list', ${JSON.stringify(JSON.stringify([backend]))});
localStorage.setItem('setup/active-uuid', ${JSON.stringify('scroll-verify')});
localStorage.setItem('config/default-theme', ${JSON.stringify('light')});
localStorage.setItem('config/dark-theme', ${JSON.stringify('dark')});
localStorage.setItem('config/auto-theme', ${JSON.stringify(false)});
localStorage.setItem('config/language', ${JSON.stringify('en-US')});
localStorage.setItem('config/two-columns', ${JSON.stringify(true)});
localStorage.setItem('config/low-power-mode', ${JSON.stringify(lowPowerMode)});
localStorage.setItem('config/blur-intensity', ${JSON.stringify(blurIntensity)});
localStorage.setItem('config/scroll-animation-effect', ${JSON.stringify(scrollAnimationEffect)});
localStorage.setItem('config/group-proxies-by-provider', ${JSON.stringify(shouldRunProviderGroupedAppBrowser)});
localStorage.setItem('config/check-upgrade-core', ${JSON.stringify(false)});
localStorage.setItem('config/auto-ip-check', ${JSON.stringify(false)});
localStorage.setItem('config/auto-connection-check', ${JSON.stringify(false)});
</script>`
}

const getLatestBuiltCssFile = async () => {
  if (!existsSync(root)) fail('dist directory is missing; run npm run build first')

  const entries = await readdir(join(root, 'assets'))
  const cssFiles = await Promise.all(
    entries
      .filter((entry) => /^index-.*\.css$/.test(entry))
      .map(async (entry) => ({
        name: entry,
        mtimeMs: (await stat(join(root, 'assets', entry))).mtimeMs,
      })),
  )
  const latest = cssFiles.sort((a, b) => b.mtimeMs - a.mtimeMs)[0]

  if (!latest) fail('Built index CSS file is missing; run npm run build first')

  return latest.name
}

const assertIncludes = (value, pattern, message, details = {}) => {
  const matched = pattern instanceof RegExp ? pattern.test(value) : value.includes(pattern)
  if (!matched) fail(message, details)
}

const assertSourceChecks = async () => {
  const sources = Object.fromEntries(
    await Promise.all(
      Object.entries(sourceFiles).map(async ([key, file]) => [key, await readText(file)]),
    ),
  )

  assertIncludes(sources.componentsCss, '.smooth-scroll-container', 'smooth-scroll-container rule is missing')
  assertIncludes(
    sources.componentsCss,
    '-webkit-overflow-scrolling: touch',
    'smooth scroll container is missing iOS momentum scrolling',
  )
  assertIncludes(
    sources.componentsCss,
    'overscroll-behavior: contain',
    'smooth scroll container is missing overscroll containment',
  )
  assertIncludes(
    sources.componentsCss,
    'touch-action: pan-y',
    'smooth scroll container is missing vertical touch-action',
  )

  for (const [key, source] of Object.entries({
    homePage: sources.homePage,
    overviewPage: sources.overviewPage,
    proxiesPage: sources.proxiesPage,
    settingsPage: sources.settingsPage,
    collapseCard: sources.collapseCard,
    virtualScroller: sources.virtualScroller,
    proxyGroupForMobile: sources.proxyGroupForMobile,
  })) {
    assertIncludes(source, 'smooth-scroll-container', `${key} does not use smooth-scroll-container`)
  }

  assertIncludes(
    sources.proxiesPage,
    'scrollPaddingBottom',
    'Proxies page no longer keeps bottom scroll padding for dock avoidance',
  )
  assertIncludes(
    sources.proxiesPage,
    'const twoColumnRenderPageItems = computed(() => {',
    'Proxies page no longer caches two-column render items',
  )
  assertIncludes(
    sources.proxiesPage,
    'v-for="name in twoColumnRenderPageItems[idx]"',
    'Proxies page template no longer uses cached two-column render items',
  )
  assertIncludes(
    sources.proxies,
    'lockProxiesPageScroll',
    'Proxies page scroll lock no longer uses tokenized locking',
  )
  assertIncludes(
    sources.proxies,
    'unlockProxiesPageScroll',
    'Proxies page scroll lock no longer exposes tokenized unlock',
  )
  assertIncludes(
    sources.homePage,
    ':aria-hidden="dockHidden ? \'true\' : undefined"',
    'Mobile dock no longer leaves hidden expanded state out of aria-hidden',
  )
  assertIncludes(
    sources.homePage,
    ':inert="dockHidden ? true : undefined"',
    'Mobile dock no longer removes hidden expanded state from sequential focus',
  )
  assertIncludes(
    sources.proxyGroupForMobile,
    'setProxiesPageScrollLocked(modalMode.value)',
    'Mobile proxy modal no longer updates page scroll lock from its modal state',
  )
  assertIncludes(
    sources.proxyGroupForMobile,
    'setProxiesPageScrollLocked(false)',
    'Mobile proxy modal no longer releases its own page scroll lock on teardown',
  )
  assertIncludes(
    sources.homePage,
    'scheduleUIUpdateCheck()',
    'Home page no longer defers the UI update check away from initial render',
  )
  if (sources.homePage.includes('checkUIUpdate()')) {
    fail('Home page still runs the UI update check synchronously during setup')
  }
  assertIncludes(
    sources.settingsComposable,
    'requestIdleCallback',
    'UI update check scheduler no longer waits for browser idle time',
  )
  assertIncludes(
    sources.settingsComposable,
    'uiUpdateDelayHandle',
    'UI update check scheduler no longer keeps a cancellable startup delay',
  )
  assertIncludes(
    sources.settingsComposable,
    '}, 8000)',
    'UI update check scheduler no longer delays startup network work past scroll sampling',
  )
  assertIncludes(
    sources.settingsComposable,
    'lowPowerMode.value',
    'UI update check scheduler no longer skips work in low power mode',
  )
  assertIncludes(
    sources.settingsComposable,
    "document.visibilityState !== 'visible'",
    'UI update check scheduler no longer skips work while the document is hidden',
  )
  assertIncludes(
    sources.proxiesCtrl,
    'aria-label={`${t(type)} ${count}`}',
    'Proxies tab controls no longer expose count-separated accessible names',
  )
  assertIncludes(
    sources.folderItem,
    ':aria-label="accessibleLabel"',
    'Proxy folder tabs no longer expose count-separated accessible names',
  )
  assertIncludes(
    sources.folderItem,
    'props.count === undefined ? props.label : `${props.label} ${props.count}`',
    'Proxy folder tab accessible names no longer separate label and count',
  )
  assertIncludes(
    sources.folderTopBar,
    ':aria-label="$t(\'folder_manage\')"',
    'Proxy folder manager button no longer exposes an explicit accessible name',
  )
  if (sources.proxiesPage.includes('filterContent(renderPageItems, idx)')) {
    fail('Proxies page still filters the render list from the template for each column')
  }
  assertIncludes(
    sources.virtualProxyNodeGrid,
    'rowVirtualizer.value.measure()',
    'Virtual proxy grid no longer remeasures on layout changes',
  )
  assertIncludes(
    sources.virtualProxyNodeGrid,
    'const nodeIndexByName = computed(() => {',
    'Virtual proxy grid no longer caches node indexes for active-row lookup',
  )
  assertIncludes(
    sources.virtualProxyNodeGrid,
    'nodeIndexByName.value.get(props.now ?? \'\')',
    'Virtual proxy grid no longer uses the cached node-index map for active-row lookup',
  )
  assertIncludes(
    sources.virtualProxyNodeGrid,
    'const rowCount = computed(() => Math.ceil(props.nodes.length / columnCount.value))',
    'Virtual proxy grid no longer derives row count without allocating every row',
  )
  assertIncludes(
    sources.virtualProxyNodeGrid,
    'const visibleRows = computed(() => {',
    'Virtual proxy grid no longer prepares visible row nodes outside the template',
  )
  assertIncludes(
    sources.virtualProxyNodeGrid,
    'v-for="row in visibleRows"',
    'Virtual proxy grid no longer renders from precomputed visible rows',
  )
  assertIncludes(
    sources.virtualProxyNodeGrid,
    'v-for="node in row.nodes"',
    'Virtual proxy grid no longer reuses precomputed row node slices',
  )
  if (sources.virtualProxyNodeGrid.includes('getRowNodes(')) {
    fail('Virtual proxy grid still slices row nodes through a template-called helper')
  }
  assertIncludes(
    sources.virtualProxyNodeGrid,
    'count: rowCount.value',
    'Virtual proxy grid virtualizer no longer uses rowCount directly',
  )
  assertIncludes(
    sources.proxiesStore,
    'const providerNameByProxy = computed(() => {',
    'Proxies store no longer caches a provider-name lookup map',
  )
  assertIncludes(
    sources.proxiesByProvider,
    'import { handlerProxySelect, providerNameByProxy, proxyMap }',
    'Provider-grouped Proxies no longer reuses the shared provider-name lookup map',
  )
  assertIncludes(
    sources.proxiesByProvider,
    'fallbackProviderNameByProxy.get(proxy)',
    'Provider-grouped Proxies no longer uses the provider-name lookup map while grouping',
  )
  assertIncludes(
    sources.proxiesByProvider,
    'fallbackProviderNameByProxy ??= providerNameByProxy.value',
    'Provider-grouped Proxies no longer lazily evaluates the provider-name lookup map',
  )
  assertIncludes(
    sources.proxiesByProvider,
    'const getFallbackProviderName = (proxy: string) => {',
    'Provider-grouped Proxies no longer isolates fallback provider lookup behind a lazy helper',
  )
  assertIncludes(
    sources.proxiesByProvider,
    'const visibleProxies = computed(() => {',
    'Provider-grouped Proxies no longer derives a visible proxy window before grouping',
  )
  assertIncludes(
    sources.proxiesByProvider,
    'return props.renderProxies.slice(0, maxProxies.value)',
    'Provider-grouped Proxies no longer slices the render list before provider grouping',
  )
  assertIncludes(
    sources.proxiesByProvider,
    'for (const proxy of visibleProxies.value) {',
    'Provider-grouped Proxies no longer groups only the visible proxy window',
  )
  assertIncludes(
    sources.proxiesByProvider,
    'const groupedProxiesByProvider = new Map<string, ProviderProxyGroup>()',
    'Provider-grouped Proxies no longer stores grouped provider objects in a Map',
  )
  assertIncludes(
    sources.proxiesByProvider,
    'const groupedProxies: ProviderProxyGroup[] = []',
    'Provider-grouped Proxies no longer builds render groups directly in one pass',
  )
  assertIncludes(
    sources.proxiesByProvider,
    'groupedProxies.unshift(providerProxies)',
    'Provider-grouped Proxies no longer preserves default provider order without a provider-key remap',
  )
  assertIncludes(
    sources.proxiesByProvider,
    'providerProxies.proxies.push(proxy)',
    'Provider-grouped Proxies no longer appends proxies to stable provider groups',
  )
  assertIncludes(
    sources.proxiesByProvider,
    'const activeIndex = computed(() =>',
    'Provider-grouped Proxies active index is no longer reactive',
  )
  assertIncludes(
    sources.proxiesByProvider,
    ':key="providerName || \'__default_provider__\'"',
    'Provider-grouped Proxies no longer keys provider sections by provider name',
  )
  assertIncludes(
    sources.proxiesByProvider,
    ':auto-scroll-active="false"',
    'Provider-grouped Proxies no longer suppresses active-card initial auto-scroll jitter',
  )
  assertIncludes(
    sources.proxiesByProvider,
    ':nested-scroll-surface="true"',
    'Provider-grouped Proxies no longer opts node cards into the nested-scroll low-paint surface',
  )
  assertIncludes(
    sources.proxiesByProvider,
    'useCalculateMaxProxies(() => props.renderProxies.length, activeIndex)',
    'Provider-grouped Proxies no longer passes reactive inputs into max-proxy calculation',
  )
  if (sources.proxiesByProvider.includes('proxyProviederList.value.find')) {
    fail('Provider-grouped Proxies still scans providers for each rendered proxy')
  }
  if (sources.proxiesByProvider.includes('proxyProviederList.value')) {
    fail('Provider-grouped Proxies still builds provider lookup state per component instance')
  }
  assertIncludes(
    sources.proxiesStore,
    'export const proxyProviderByName = computed(() => {',
    'Proxy store no longer exposes a provider-name lookup map',
  )
  assertIncludes(
    sources.proxiesStore,
    'providersByName.set(provider.name, provider)',
    'Proxy store no longer fills the provider-name lookup map',
  )
  assertIncludes(
    sources.proxyProvider,
    'proxyProviderByName.value.get(props.name)!',
    'ProxyProvider no longer reads providers from the provider-name lookup map',
  )
  if (sources.proxyProvider.includes('proxyProviederList.value.find')) {
    fail('ProxyProvider still scans provider cards by name')
  }
  if (sources.proxiesByProvider.includes('const fallbackProviderNameByProxy = providerNameByProxy.value')) {
    fail('Provider-grouped Proxies eagerly evaluates the fallback provider lookup map')
  }
  if (sources.proxiesByProvider.includes('proxies.indexOf(props.now)')) {
    fail('Provider-grouped Proxies still scans grouped arrays to find the active index')
  }
  if (sources.proxiesByProvider.includes('const truncatedProxies = computed')) {
    fail('Provider-grouped Proxies still groups the full render list before truncating it')
  }
  if (/Record<string,\s*string\[\]>|groupdProixes/.test(sources.proxiesByProvider)) {
    fail('Provider-grouped Proxies still groups providers through a plain object')
  }
  if (/providerKeys|providerKeys\.map/.test(sources.proxiesByProvider)) {
    fail('Provider-grouped Proxies still remaps provider keys after grouping')
  }
  if (sources.proxiesByProvider.includes(':key="index"')) {
    fail('Provider-grouped Proxies still keys provider sections by loop index')
  }
  if (sources.proxiesByProvider.includes('truncatedProxies.push({ providerName, proxies })')) {
    fail('Provider-grouped Proxies still allocates wrapper objects for full provider groups')
  }
  assertIncludes(
    sources.proxyNodeCard,
    'autoScrollActive?: boolean',
    'ProxyNodeCard no longer exposes an active initial-scroll control',
  )
  assertIncludes(
    sources.proxyNodeCard,
    'nestedScrollSurface?: boolean',
    'ProxyNodeCard no longer exposes the nested-scroll low-paint surface switch',
  )
  assertIncludes(
    sources.proxyNodeCard,
    'props.nestedScrollSurface',
    'ProxyNodeCard no longer branches node-card surface style for nested scroll',
  )
  assertIncludes(
    sources.proxyNodeCard,
    'bg-base-200/80 hover:border-base-content/10 sm:hover:bg-base-200',
    'ProxyNodeCard no longer avoids glass-surface blur in nested scroll',
  )
  assertIncludes(
    sources.proxyNodeCard,
    'if (props.autoScrollActive === false) return',
    'ProxyNodeCard no longer skips queuing initial scroll when disabled',
  )
  assertIncludes(
    sources.proxyNodeCard,
    'props.autoScrollActive === false',
    'ProxyNodeCard no longer guards pending initial scroll against disabled auto-scroll',
  )
  assertIncludes(
    sources.proxiesScroll,
    'const setMaxProxies = (nextMaxProxies: number) => {',
    'Proxy lazy-render calculation no longer guards repeated maxProxies writes',
  )
  assertIncludes(
    sources.proxiesScroll,
    'if (nextMaxProxies === maxProxies.value) return',
    'Proxy lazy-render calculation no longer skips no-op maxProxies writes',
  )
  assertIncludes(
    sources.proxiesScroll,
    'enabled: MaybeRefOrGetter<boolean> = true',
    'Proxy lazy-render calculation no longer accepts an enabled guard',
  )
  assertIncludes(
    sources.proxiesScroll,
    'const enabledState = computed(() => toValue(enabled))',
    'Proxy lazy-render calculation no longer tracks enabled state',
  )
  assertIncludes(
    sources.proxiesScroll,
    'if (!enabledState.value) return -1',
    'Proxy lazy-render calculation still reads the active index while disabled',
  )
  assertIncludes(
    sources.proxiesScroll,
    'if (!enabledState.value) return',
    'Proxy lazy-render calculation no longer skips work while disabled',
  )
  assertIncludes(
    sources.proxiesScroll,
    'enabledState.value && maxProxies.value < totalProxyCount.value',
    'Proxy lazy-render infinite-scroll path no longer respects enabled state',
  )
  assertIncludes(
    sources.bouncein,
    'let stopVisibleWatch: ReturnType<typeof watch> | undefined',
    'Bounce-in visibility animation no longer stores a watcher stop handle',
  )
  assertIncludes(
    sources.bouncein,
    'if (!value) return',
    'Bounce-in visibility animation no longer ignores invisible updates',
  )
  assertIncludes(
    sources.bouncein,
    'stopVisibleWatch?.()',
    'Bounce-in visibility animation no longer stops watching after first visible frame',
  )
  if (sources.bouncein.includes('el.value.classList.remove(className)')) {
    fail('Bounce-in visibility animation still removes the visible class during scroll')
  }
  if (/else\s*\{[\s\S]*el\.value\.classList\.add\(\.\.\.initClassName\)/.test(sources.bouncein)) {
    fail('Bounce-in visibility animation still resets hidden elements during scroll')
  }
  if ((sources.proxiesScroll.match(/maxProxies\.value =/g) ?? []).length > 1) {
    fail('Proxy lazy-render calculation writes maxProxies outside the guarded setter')
  }
  assertIncludes(
    sources.proxiesScroll,
    'const SCROLL_STABLE_PROXY_LIMIT = 200',
    'Proxy lazy-render calculation no longer keeps small non-virtual lists height-stable',
  )
  assertIncludes(
    sources.proxiesScroll,
    'if (totalProxyCount.value <= SCROLL_STABLE_PROXY_LIMIT)',
    'Proxy lazy-render calculation no longer pre-renders small non-virtual lists before scroll',
  )
  assertIncludes(
    sources.proxiesContent,
    '() => !isVirtualGrid.value',
    'Flat Proxies content no longer disables lazy-render max calculations for virtual grids',
  )
  assertIncludes(
    sources.virtualScroller,
    'pendingMeasureElements',
    'VirtualScroller no longer batches dynamic row measurement',
  )
  assertIncludes(
    sources.virtualScroller,
    'requestAnimationFrame(flushMeasureElements)',
    'VirtualScroller dynamic row measurement is no longer frame-scheduled',
  )
  if (/measureElement\(el|:ref="\(?el\)?\s*=>\s*measureElement/.test(sources.virtualProxyNodeGrid)) {
    fail('Virtual proxy grid still measures every rendered row during scroll')
  }
  if (sources.virtualProxyNodeGrid.includes('props.nodes.indexOf(props.now')) {
    fail('Virtual proxy grid still scans all nodes to find the active row')
  }
  if (sources.virtualProxyNodeGrid.includes('const rows = computed')) {
    fail('Virtual proxy grid still allocates all row slices for large lists')
  }
  assertIncludes(
    sources.renderProxies,
    'renderListEnabled: MaybeRefOrGetter<boolean> = true',
    'Render proxies no longer accepts a render-list enable switch',
  )
  assertIncludes(
    sources.renderProxies,
    'getRenderProxyState(proxies.value, groupName, toValue(renderListEnabled))',
    'Render proxies no longer derives list/count from a single computed state',
  )
  assertIncludes(
    sources.renderProxies,
    'const getLatency: LatencyGetter = (name) => {',
    'Render proxies no longer uses a lazy latency getter for derived list/count state',
  )
  assertIncludes(
    sources.renderProxies,
    'const renderProxies = renderListEnabled ? sortProxies(filtered, groupName, getLatency) : []',
    'Render proxies no longer skips full list sorting while render-list output is disabled',
  )
  assertIncludes(
    sources.renderProxies,
    'const available = countAvailableProxies(filtered, getLatency)',
    'Render proxies no longer reuses the lazy latency getter for visible availability counts',
  )
  assertIncludes(
    sources.proxyGroupForMobile,
    'useRenderProxyList(allProxies, props.name, displayContent)',
    'Mobile ProxyGroup no longer delays full renderProxies calculation until expanded content is displayed',
  )
  assertIncludes(
    sources.proxyGroup,
    'useRenderProxyList(allProxies, props.name)',
    'Desktop ProxyGroup no longer keeps full renderProxies output enabled by default',
  )
  assertIncludes(
    sources.proxyGroupForMobile,
    'const manyProxies = allProxies.value.length > 4',
    'Mobile ProxyGroup expansion positioning still depends on the full sorted render list',
  )
  assertIncludes(
    sources.renderProxies,
    'return proxies.filter((name) => {',
    'Render proxies no longer combines proxy filters into one pass',
  )
  assertIncludes(
    sources.renderProxies,
    'const proxiesCount = computed(() => `${renderProxyState.value.available}/${proxies.value.length}`)',
    'Render proxies count no longer reads availability from the shared derived state',
  )
  if (sources.renderProxies.includes('proxies.map((name) => [name, getLatencyByName(name, groupName)]')) {
    fail('Render proxies still builds the full latency map before filtering and sorting')
  }
  assertIncludes(sources.swipe, 'const SWIPE_START_THRESHOLD = 10', 'Swipe start threshold drifted')
  assertIncludes(sources.swipe, 'const HORIZONTAL_LOCK_RATIO = 1.35', 'Horizontal swipe lock ratio drifted')
  assertIncludes(sources.swipe, 'passive: true', 'Swipe listener is no longer passive')
  assertIncludes(
    sources.proxiesStore,
    'getHistoryByName(proxyName, groupName, false)',
    'Proxy latency read path still ensures independent history during render',
  )
  assertIncludes(
    sources.proxiesStore,
    'ensureIndependentHistory = true',
    'Proxy history helper no longer preserves history initialization for write paths',
  )
  assertIncludes(
    sources.proxiesStore,
    'if (!ensureIndependentHistory && !proxyNode.extra?.[url]) {',
    'Proxy history helper no longer has a read-only independent history path',
  )
  assertIncludes(
    sources.latencyTag,
    "getHistoryByName(props.name ?? '', props.groupName, false)",
    'LatencyTag hover path still creates independent history buckets while reading',
  )
  assertIncludes(
    sources.proxyNodeCard,
    'const cardClass = computed(() =>',
    'ProxyNodeCard no longer caches the root class merge outside the template',
  )
  assertIncludes(
    sources.proxyNodeCard,
    'const typeDescriptionClass = computed(() =>',
    'ProxyNodeCard no longer caches type-description classes outside the template',
  )
  assertIncludes(
    sources.proxyNodeCard,
    'const latencyTagClass = computed(() =>',
    'ProxyNodeCard no longer caches LatencyTag classes outside the template',
  )
  assertIncludes(
    sources.proxyNodeCard,
    'let description = type',
    'ProxyNodeCard no longer builds type descriptions without array allocation',
  )
  assertIncludes(
    sources.proxyNodeCard,
    'if (smartDesc) description += `${separator}${smartDesc}`',
    'ProxyNodeCard no longer appends smart descriptions without array allocation',
  )
  assertIncludes(
    sources.proxyNodeCard,
    'const formattedProxyTypeCache = new Map<string, string>()',
    'ProxyNodeCard no longer caches formatted proxy type labels',
  )
  assertIncludes(
    sources.proxyNodeCard,
    'const cached = formattedProxyTypeCache.get(type)',
    'ProxyNodeCard no longer checks the formatted proxy type cache',
  )
  assertIncludes(
    sources.proxyNodeCard,
    'formattedProxyTypeCache.set(type, formatted)',
    'ProxyNodeCard no longer stores formatted proxy type labels in cache',
  )
  assertIncludes(
    sources.latencyTag,
    'const latencyClass = computed(() =>',
    'LatencyTag no longer caches class merging outside the template',
  )
  assertIncludes(
    sources.proxyGroup,
    "const LATENCY_TAG_CLASS = 'bg-base-200/50 hover:bg-base-200'",
    'ProxyGroup no longer hoists the LatencyTag class string out of the template',
  )
  assertIncludes(
    sources.proxyGroup,
    ':class="LATENCY_TAG_CLASS"',
    'ProxyGroup no longer reuses a stable LatencyTag class binding',
  )
  assertIncludes(
    sources.proxyGroupForMobile,
    "const LATENCY_TAG_CLASS = 'bg-base-200/50 hover:bg-base-200 z-10'",
    'Mobile ProxyGroup no longer hoists the LatencyTag class string out of the template',
  )
  assertIncludes(
    sources.proxyGroupForMobile,
    ':class="LATENCY_TAG_CLASS"',
    'Mobile ProxyGroup no longer reuses a stable LatencyTag class binding',
  )
  assertIncludes(
    sources.proxyProvider,
    'const updateButtonClass = computed(() =>',
    'ProxyProvider no longer caches the update button class outside the template',
  )
  assertIncludes(
    sources.proxyProvider,
    'const { t } = useI18n()',
    'ProxyProvider no longer resolves i18n once at setup scope',
  )
  assertIncludes(
    sources.proxyProvider,
    ':class="updateButtonClass"',
    'ProxyProvider no longer reuses the cached update button class binding',
  )
  if (sources.proxyGroup.includes('twMerge(')) {
    fail('ProxyGroup still merges LatencyTag classes at render time')
  }
  if (sources.proxyGroupForMobile.includes('twMerge(')) {
    fail('Mobile ProxyGroup still merges LatencyTag classes at render time')
  }
  if (
    sources.proxyGroupForMobile.includes('will-change-opacity') ||
    sources.proxyGroupForMobile.includes('transition-opacity') ||
    sources.proxyGroupForMobile.includes('contentOpacity')
  ) {
    fail('Mobile ProxyGroup expanded content still animates opacity during provider-grouped scroll sampling')
  }
  if (sources.proxyGroupForMobile.includes('transition-[width,transform,max-height]')) {
    fail('Mobile ProxyGroup still transitions max-height during provider-grouped expansion')
  }
  assertIncludes(
    sources.proxyGroupForMobile,
    'transition-[width,transform]',
    'Mobile ProxyGroup no longer limits expansion transition to width and transform',
  )
  assertIncludes(
    sources.proxyGroupForMobile,
    'const getTransitionFallbackDelay = () => {',
    'Mobile ProxyGroup no longer derives the transition fallback delay from computed style',
  )
  assertIncludes(
    sources.proxyGroupForMobile,
    'getComputedStyle(element)',
    'Mobile ProxyGroup transition fallback no longer reads the active element style',
  )
  assertIncludes(
    sources.proxyGroupForMobile,
    'getTransitionFallbackDelay()',
    'Mobile ProxyGroup transition fallback returned to a hard-coded timeout',
  )
  assertIncludes(
    sources.proxyGroupForMobile,
    ':data-expanded-ready="expandedContentReady ? \'true\' : \'false\'"',
    'Mobile ProxyGroup no longer exposes expanded-content readiness for provider-grouped sampling',
  )
  assertIncludes(
    sources.proxyGroupForMobile,
    'const queueExpandedContentReady = () => {',
    'Mobile ProxyGroup no longer queues expanded-content readiness after mount',
  )
  assertIncludes(
    sources.proxyGroupForMobile,
    'nextTick(queueExpandedContentReady)',
    'Mobile ProxyGroup no longer waits for mounted expanded content before readiness',
  )
  assertIncludes(
    sources.proxyGroupForMobile,
    'window.visualViewport',
    'Mobile ProxyGroup expanded panel no longer tracks visual viewport changes',
  )
  assertIncludes(
    sources.proxyGroupForMobile,
    'dockTop.value + 32',
    'Mobile ProxyGroup expanded panel no longer reserves space for the mobile dock',
  )
  assertIncludes(
    sources.proxyGroupForMobile,
    'attachViewportListeners()',
    'Mobile ProxyGroup expanded panel no longer attaches viewport listeners while open',
  )
  assertIncludes(
    sources.proxyGroupForMobile,
    'clearViewportListeners()',
    'Mobile ProxyGroup expanded panel no longer clears viewport listeners when closed',
  )
  assertIncludes(
    sources.proxyGroupForMobile,
    'viewportHeight - verticalOffset - getExpandedBottomReserve()',
    'Mobile ProxyGroup expanded panel max-height no longer uses the dock-aware bottom reserve',
  )
  assertIncludes(
    sources.proxyGroupForMobile,
    'clearExpandedReadyFrame()',
    'Mobile ProxyGroup no longer clears pending expanded-content readiness frames',
  )
  assertIncludes(
    sources.proxyGroupForMobile,
    'mobile-proxy-modal-panel',
    'Mobile ProxyGroup expanded panel no longer uses the lightweight modal glass class',
  )
  assertIncludes(
    sources.proxyGroupForMobile,
    'mobile-proxy-modal-backdrop',
    'Mobile ProxyGroup expanded backdrop no longer uses the lightweight modal glass class',
  )
  assertIncludes(
    sources.componentsCss,
    '.mobile-proxy-modal-panel',
    'Mobile ProxyGroup expanded panel no longer has a scoped lightweight glass rule',
  )
  assertIncludes(
    sources.componentsCss,
    'backdrop-filter: blur(8px) saturate(150%) !important;',
    'Mobile ProxyGroup expanded panel blur cap changed unexpectedly',
  )
  assertIncludes(
    sources.componentsCss,
    'backdrop-filter: blur(6px) saturate(140%) !important;',
    'Mobile ProxyGroup expanded backdrop blur cap changed unexpectedly',
  )
  if (sources.proxyGroupForMobile.includes('useBounceOnVisible')) {
    fail('Mobile ProxyGroup still runs entry animations during Proxies scroll sampling')
  }
  if (sources.proxyProvider.includes(':class="twMerge(') || sources.proxyProvider.includes('twMerge(')) {
    fail('ProxyProvider still merges update button classes at render time')
  }
  if (/const subscriptionInfo = computed\(\(\) => \{[\s\S]*useI18n\(\)/.test(sources.proxyProvider)) {
    fail('ProxyProvider still resolves i18n inside subscriptionInfo computed')
  }
  if (sources.proxyNodeCard.includes(':class="`truncate text-xs tracking-tight')) {
    fail('ProxyNodeCard still allocates type-description class strings in the template')
  }
  if (sources.proxyNodeCard.includes(':class="[isSmallCard &&')) {
    fail('ProxyNodeCard still allocates LatencyTag class arrays in the template')
  }
  if (sources.proxyNodeCard.includes('.filter(Boolean).join')) {
    fail('ProxyNodeCard still allocates an array to build type descriptions')
  }
  if (sources.latencyTag.includes(':class="twMerge(')) {
    fail('LatencyTag still merges classes in the template')
  }
  assertIncludes(
    sources.proxyPreview,
    'const previewLatencyState = computed(() => {',
    'ProxyPreview no longer derives preview nodes and latency buckets together',
  )
  assertIncludes(
    sources.proxyPreview,
    'for (const name of props.nodes) {',
    'ProxyPreview no longer computes preview latency buckets in a single pass',
  )
  assertIncludes(
    sources.proxyPreview,
    'const latencyCounts = computed(() => previewLatencyState.value.counts)',
    'ProxyPreview no longer exposes cached latency bucket counts',
  )
  if (sources.proxyPreview.includes('nodesLatency.value.filter')) {
    fail('ProxyPreview still filters the same latency list multiple times for bucket counts')
  }
  assertIncludes(
    sources.proxyIcon,
    'const purifiedSvgCache = new Map<string, string>()',
    'ProxyIcon no longer caches purified SVG icon markup',
  )
  assertIncludes(
    sources.proxyIcon,
    'const cached = purifiedSvgCache.get(props.icon)',
    'ProxyIcon no longer checks the purified SVG icon cache',
  )
  assertIncludes(
    sources.proxyIcon,
    'purifiedSvgCache.set(props.icon, sanitized)',
    'ProxyIcon no longer stores purified SVG icon markup in cache',
  )
  if ((sources.proxyIcon.match(/DOMPurify\.sanitize/g) ?? []).length > 1) {
    fail('ProxyIcon sanitizes SVG markup outside the cached pureDom path')
  }
  assertIncludes(
    sources.logsStore,
    'shallowRef<LogWithSeq[]>([])',
    'Logs store no longer avoids deep reactive wrapping for retained log rows',
  )
  assertIncludes(
    sources.logsStore,
    'const formatLogTime = () => {',
    'Logs store no longer uses a lightweight native log timestamp formatter',
  )
  assertIncludes(
    sources.logsStore,
    'let cachedLogTimeSecond = -1',
    'Logs store no longer caches formatted timestamps by second',
  )
  assertIncludes(
    sources.logsStore,
    'if (currentSecond === cachedLogTimeSecond)',
    'Logs timestamp formatter no longer reuses same-second formatted values',
  )
  assertIncludes(
    sources.logsStore,
    'time: formatLogTime()',
    'Logs stream no longer uses the lightweight timestamp formatter for inserted rows',
  )
  if (/from 'dayjs'|from "dayjs"|dayjs\(\)/.test(sources.logsStore)) {
    fail('Logs store reintroduced dayjs in the high-frequency log stream path')
  }
  assertIncludes(
    sources.logsPage,
    'const logSearchFields = new WeakMap<LogWithSeq, string[]>()',
    'Logs page no longer caches per-row search fields',
  )
  assertIncludes(
    sources.logsPage,
    'getLogSearchFields(log)',
    'Logs filtering no longer reuses cached per-row search fields',
  )
  assertIncludes(
    sources.logsPage,
    'return logs.value.filter((log) => {',
    'Logs filtering no longer uses a single retained-row pass',
  )
  if ((sources.logsPage.match(/\.filter\(\(log\)/g) ?? []).length > 1) {
    fail('Logs page filters retained rows more than once per render pass')
  }
  if (sources.logsPage.includes('[log.payload, log.time, log.type]') && !sources.logsPage.includes('fields = [log.payload, log.time, log.type]')) {
    fail('Logs page still creates inline search-field arrays inside filter predicates')
  }
  assertIncludes(
    sources.connectionsStore,
    'const connectionDerivedData = new WeakMap<Connection, ConnectionDerivedData>()',
    'Connections store no longer caches derived row data outside Vue reactivity',
  )
  assertIncludes(
    sources.connectionsStore,
    'ensureConnectionDerivedData(connection)',
    'Connections store no longer prepares derived row data as WS rows arrive',
  )
  assertIncludes(
    sources.connectionsStore,
    'ensureConnectionDerivedData(conn).searchFields',
    'Connections filtering no longer reuses cached search fields',
  )
  if (/dayjs\([^)]*\.start/.test(sources.connectionsStore)) {
    fail('Connections store still parses connection start time during high-frequency row processing')
  }

  return {
    smoothScrollContainerRule: true,
    smoothScrollSurfaces: [
      'HomePage',
      'OverviewPage',
      'ProxiesPage',
      'SettingsPage',
      'CollapseCard',
      'ProxyGroupForMobile',
      'VirtualScroller',
    ],
    proxiesBottomScrollPadding: true,
    proxiesTwoColumnItemsCached: true,
    proxiesTabsAccessibleNames: true,
    proxyFolderTabsAccessibleNames: true,
    proxyFolderManagerButtonAccessibleName: true,
    providerGroupedUsesProviderLookupMap: true,
    proxyProviderUsesProviderLookupMap: true,
    providerGroupedCombinesActiveIndex: true,
    providerGroupedAvoidsEmptyTruncatedGroups: true,
    providerGroupedUsesMapForGroups: true,
    providerGroupedUsesStableSectionKeys: true,
    providerGroupedLazyFallbackLookup: true,
    providerGroupedBuildsGroupsDirectly: true,
    providerGroupedReusesTruncatedGroups: true,
    proxyLazyRenderSkipsNoopMaxWrites: true,
    bounceInRunsOncePerElement: true,
    proxyVirtualGridSkipsLazyRenderCalculation: true,
    proxyLazyRenderSkipsActiveIndexWhileDisabled: true,
    virtualProxyGridCachesActiveIndex: true,
    virtualProxyGridSlicesVisibleRowsOnly: true,
    proxyLatencyReadsAvoidHistoryMutation: true,
    proxyNodeCardCachesRenderClasses: true,
    proxyNodeCardBuildsTypeDescriptionWithoutArray: true,
    proxyNodeCardCachesFormattedType: true,
    latencyTagCachesRenderClass: true,
    proxyGroupHoistsLatencyTagClass: true,
    proxyGroupForMobileHoistsLatencyTagClass: true,
    proxyProviderCachesUpdateButtonClass: true,
    proxyProviderResolvesI18nAtSetup: true,
    proxyPreviewBucketsLatencySinglePass: true,
    proxyIconCachesPurifiedSvg: true,
    renderProxiesSingleDerivedState: true,
    renderProxiesSingleFilterPass: true,
    virtualProxyGridAvoidsPerRowMeasurement: true,
    virtualScrollerBatchesDynamicMeasurement: true,
    swipeThreshold: 10,
    horizontalLockRatio: 1.35,
    passiveSwipeListener: true,
    connectionsCacheDerivedRowData: true,
    logsFilterSinglePassCachedFields: true,
    logsCacheTimestampPerSecond: true,
    logsUseNativeTimestampFormatter: true,
    logsUseShallowRef: true,
  }
}

const assertBuildChecks = async (builtCssFile) => {
  const css = await readText(join(root, 'assets', builtCssFile))

  assertIncludes(css, '.smooth-scroll-container', 'Built CSS is missing smooth-scroll-container')
  assertIncludes(
    css,
    /-webkit-overflow-scrolling:\s*touch/,
    'Built CSS is missing iOS momentum scrolling',
  )
  assertIncludes(
    css,
    /overscroll-behavior:\s*contain/,
    'Built CSS is missing overscroll containment',
  )
  assertIncludes(css, /touch-action:\s*pan-y/, 'Built CSS is missing vertical touch-action')
  assertIncludes(css, '.dock-shell', 'Built CSS is missing dock shell rules')
  assertIncludes(css, '.dock-button', 'Built CSS is missing dock button rules')

  return {
    builtCssFile,
    smoothScrollContainerRule: true,
    dockRulesStillPresent: true,
  }
}

const renderScrollFixture = (builtCssFile) => {
  const rows = Array.from({ length: 72 }, (_, index) => {
    const label = index === 71 ? 'Bottom proxy card' : `Proxy card ${index + 1}`
    const id = index === 71 ? ' id="bottom-card"' : ''
    return `<button${id} class="proxy-card" type="button">${label}</button>`
  }).join('')

  return `<!doctype html>
<html data-theme="light">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="/assets/${builtCssFile}">
    <style>
      html,
      body {
        width: 390px;
        height: 844px;
        margin: 0;
        overflow: hidden;
        background: var(--color-base-200);
      }
      .fixture-frame {
        position: relative;
        width: 390px;
        height: 844px;
        overflow: hidden;
        background: var(--color-base-200);
      }
      .fixture-scroll {
        position: absolute;
        inset: 0;
        overflow-y: auto;
        padding: 12px 12px 112px;
        box-sizing: border-box;
      }
      .proxy-card {
        display: flex;
        width: 100%;
        height: 48px;
        align-items: center;
        margin: 0 0 8px;
        padding: 0 14px;
        border: 1px solid color-mix(in srgb, var(--color-base-content) 8%, transparent);
        border-radius: 12px;
        background: color-mix(in srgb, var(--color-base-100) 86%, transparent);
        color: var(--color-base-content);
        font: 600 14px/1.2 sans-serif;
      }
    </style>
  </head>
  <body>
    <main class="fixture-frame">
      <section class="smooth-scroll-container fixture-scroll" aria-label="Proxy cards">
        ${rows}
      </section>
      <nav class="dock-shell" aria-label="Main navigation">
        <div class="dock dock-xs h-[52px]">
          <button class="dock-button h-[52px] flex-col items-center justify-center pt-1.5" aria-label="Overview" type="button">
            <span class="dock-icon" aria-hidden="true" focusable="false">O</span>
            <span class="dock-label">Overview</span>
          </button>
          <button class="dock-button dock-active h-[52px] flex-col items-center justify-center pt-1.5" aria-label="Proxies" aria-current="page" type="button">
            <span class="dock-icon" aria-hidden="true" focusable="false">P</span>
            <span class="dock-label">Proxies</span>
          </button>
          <button class="dock-button h-[52px] flex-col items-center justify-center pt-1.5" aria-label="Rules" type="button">
            <span class="dock-icon" aria-hidden="true" focusable="false">R</span>
            <span class="dock-label">Rules</span>
          </button>
          <button class="dock-button h-[52px] flex-col items-center justify-center pt-1.5" aria-label="Connections" type="button">
            <span class="dock-icon" aria-hidden="true" focusable="false">C</span>
            <span class="dock-label">Connections</span>
          </button>
          <button class="dock-button h-[52px] flex-col items-center justify-center pt-1.5" aria-label="Settings" type="button">
            <span class="dock-icon" aria-hidden="true" focusable="false">S</span>
            <span class="dock-label">Settings</span>
          </button>
        </div>
      </nav>
    </main>
  </body>
</html>`
}

const serveFile = async (request, response) => {
  const requestUrl = new URL(request.url || '/', baseUrl)
  servedRequests.push(requestUrl.pathname)

  if (requestUrl.pathname === '/__scroll-fixture') {
    const builtCssFile = await getLatestBuiltCssFile()
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    response.end(renderScrollFixture(builtCssFile))
    return
  }

  if (requestUrl.pathname === '/version') {
    response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
    response.end(JSON.stringify(mockBackend.version))
    return
  }
  if (requestUrl.pathname === '/configs') {
    response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
    response.end(JSON.stringify(mockBackend.configs))
    return
  }
  if (requestUrl.pathname === '/proxies') {
    response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
    response.end(JSON.stringify(mockBackend.proxies))
    return
  }
  if (requestUrl.pathname === '/providers/proxies' || requestUrl.pathname === '/providers/rules') {
    response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
    response.end(JSON.stringify(mockBackend.providers))
    return
  }
  if (requestUrl.pathname === '/rules') {
    response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
    response.end(JSON.stringify(mockBackend.rules))
    return
  }

  const requestedPath = decodeURIComponent(requestUrl.pathname)
  const filePath = requestedPath === '/' ? join(root, 'index.html') : join(root, requestedPath)
  const normalized = resolve(filePath)

  if (!normalized.startsWith(root)) {
    response.writeHead(403)
    response.end('Forbidden')
    return
  }

  if (!existsSync(normalized)) {
    response.writeHead(404)
    response.end('Not found')
    return
  }

  response.writeHead(200, {
    'content-type': mimeTypes[extname(normalized)] || 'application/octet-stream',
  })

  if (extname(normalized) === '.html') {
    const html = await readFile(normalized, 'utf8')
    response.end(html.replace('<head>', `<head>${getSetupScript()}`))
    return
  }

  createReadStream(normalized).pipe(response)
}

const handleRealtimeWebSocketUpgrade = (request, socket) => {
  const requestUrl = new URL(request.url || '/', baseUrl)
  servedRequests.push(`${requestUrl.pathname}:ws`)

  if (!realtimeWebSocketPaths.has(requestUrl.pathname)) {
    socket.destroy()
    return
  }

  const key = request.headers['sec-websocket-key']
  if (!key) {
    socket.destroy()
    return
  }

  const acceptKey = createHash('sha1')
    .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
    .digest('base64')

  socket.write(
    [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${acceptKey}`,
      '',
      '',
    ].join('\r\n'),
  )
  realtimeWebSockets.add(socket)
  socket.once('close', () => realtimeWebSockets.delete(socket))
  socket.once('error', () => realtimeWebSockets.delete(socket))
}

const startServer = () =>
  new Promise((resolveServer, rejectServer) => {
    const server = createServer((request, response) => {
      serveFile(request, response).catch((error) => {
        response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' })
        response.end(error.stack || String(error))
      })
    })
    server.on('upgrade', handleRealtimeWebSocketUpgrade)
    server.once('error', rejectServer)
    server.listen(port, () => resolveServer(server))
  })

const closeServer = (server) =>
  new Promise((resolveClose) => {
    for (const socket of realtimeWebSockets) socket.destroy()
    realtimeWebSockets.clear()
    server.close(() => resolveClose())
  })

const waitForShutdown = () =>
  new Promise((resolveShutdown) => {
    const shutdown = () => resolveShutdown()
    process.once('SIGINT', shutdown)
    process.once('SIGTERM', shutdown)
  })

const delay = (ms) => new Promise((resolveDelay) => setTimeout(resolveDelay, ms))

const getEdgeExecutable = () => {
  const candidates = [
    process.env.ZASHBOARD_EDGE_PATH,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean)

  return candidates.find((candidate) => existsSync(candidate)) || null
}

const waitForCdpEndpoint = async (cdpPort, getDiagnostics = () => ({})) => {
  const versionUrl = `http://127.0.0.1:${cdpPort}/json/version`

  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(versionUrl)
      if (response.ok) return response.json()
    } catch {
      // Browser is still starting.
    }
    await delay(250)
  }

  fail('Edge CDP endpoint did not become ready', { cdpPort, ...getDiagnostics() })
}

const createCdpClient = (webSocketUrl) =>
  new Promise((resolveClient, rejectClient) => {
    const socket = new WebSocket(webSocketUrl)
    let nextId = 1
    const pending = new Map()
    const eventWaiters = new Map()

    const cleanup = () => {
      for (const { reject } of pending.values()) reject(new Error('CDP socket closed'))
      pending.clear()
    }

    socket.addEventListener('open', () => {
      resolveClient({
        close: () => socket.close(),
        send: (method, params = {}, sessionId) =>
          new Promise((resolveCommand, rejectCommand) => {
            const id = nextId
            nextId += 1
            pending.set(id, { resolve: resolveCommand, reject: rejectCommand })
            socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }))
          }),
        waitForEvent: (method, timeout = 15000) =>
          new Promise((resolveEvent, rejectEvent) => {
            const timer = setTimeout(() => {
              rejectEvent(new Error(`Timed out waiting for CDP event ${method}`))
            }, timeout)
            const waiters = eventWaiters.get(method) || []
            waiters.push((params) => {
              clearTimeout(timer)
              resolveEvent(params)
            })
            eventWaiters.set(method, waiters)
          }),
      })
    })

    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data)
      if (message.id && pending.has(message.id)) {
        const { resolve: resolveCommand, reject: rejectCommand } = pending.get(message.id)
        pending.delete(message.id)
        if (message.error) rejectCommand(new Error(message.error.message))
        else resolveCommand(message.result)
        return
      }

      if (message.method && eventWaiters.has(message.method)) {
        const waiters = eventWaiters.get(message.method)
        eventWaiters.delete(message.method)
        for (const waiter of waiters) waiter(message.params)
      }
    })

    socket.addEventListener('error', () => rejectClient(new Error('CDP socket failed')))
    socket.addEventListener('close', cleanup)
  })

const runEdgeCdpFixtureCheck = async (builtCssFile) => {
  const edgePath = getEdgeExecutable()
  if (!edgePath) fail('Microsoft Edge executable could not be located')

  const cdpPort = Number(process.env.ZASHBOARD_SCROLL_VERIFY_CDP_PORT || 9234)
  const userDataDir = await mkdtemp(join(tmpdir(), 'zashboard-scroll-cdp-'))
  const edgeArgs = [
    '--headless=new',
    '--disable-gpu',
    '--disable-extensions',
    '--disable-background-networking',
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-debugging-address=127.0.0.1',
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${userDataDir}`,
    'about:blank',
  ]
  const stderrChunks = []
  let edgeExit
  const edge = spawn(edgePath, edgeArgs, { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true })
  edge.stderr?.on('data', (chunk) => {
    stderrChunks.push(chunk.toString('utf8'))
  })
  edge.on('exit', (code, signal) => {
    edgeExit = { code, signal }
  })

  let cdp
  try {
    const version = await waitForCdpEndpoint(cdpPort, () => ({
      edgePath,
      edgeArgs,
      edgeExit,
      edgeStderr: stderrChunks.join('').trim().slice(-2000),
    }))
    cdp = await createCdpClient(version.webSocketDebuggerUrl)
    const { targetId } = await cdp.send('Target.createTarget', {
      url: 'about:blank',
    })
    const { sessionId } = await cdp.send('Target.attachToTarget', {
      targetId,
      flatten: true,
    })
    const send = (method, params = {}) => cdp.send(method, params, sessionId)

    await send('Runtime.enable')
    await send('Page.enable')
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    })
    const loadEvent = cdp.waitForEvent('Page.loadEventFired')
    await send('Page.navigate', { url: `${baseUrl}/__scroll-fixture` })
    await loadEvent

    const expression = `async () => {
      const waitForSelector = (selector, timeout = 10000) =>
        new Promise((resolve, reject) => {
          const startedAt = performance.now();
          const tick = () => {
            const element = document.querySelector(selector);
            if (element) {
              resolve(element);
              return;
            }
            if (performance.now() - startedAt > timeout) {
              reject(new Error('Timed out waiting for ' + selector));
              return;
            }
            requestAnimationFrame(tick);
          };
          tick();
        });

      const scroll = await waitForSelector('.fixture-scroll');
      const bottomCard = await waitForSelector('#bottom-card');
      const dockShell = await waitForSelector('.dock-shell');
      const activeDockButton = await waitForSelector('.dock-active');
      const scrollStyle = getComputedStyle(scroll);
      const beforeScrollTop = scroll.scrollTop;
      scroll.scrollTop = scroll.scrollHeight;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      activeDockButton.focus();
      const focusStyle = getComputedStyle(document.activeElement);
      const bottomRect = bottomCard.getBoundingClientRect();
      const dockRect = dockShell.getBoundingClientRect();
      const scrollRect = scroll.getBoundingClientRect();
      return {
        beforeScrollTop,
        afterScrollTop: scroll.scrollTop,
        scrollHeight: scroll.scrollHeight,
        clientHeight: scroll.clientHeight,
        touchAction: scrollStyle.touchAction,
        overscrollBehaviorY: scrollStyle.overscrollBehaviorY,
        webkitOverflowScrolling: scrollStyle.webkitOverflowScrolling || '',
        bottomCard: {
          top: bottomRect.top,
          bottom: bottomRect.bottom,
          height: bottomRect.height,
        },
        dock: {
          top: dockRect.top,
          bottom: dockRect.bottom,
          height: dockRect.height,
          width: dockRect.width,
        },
        scroll: {
          top: scrollRect.top,
          bottom: scrollRect.bottom,
          height: scrollRect.height,
        },
        activeName: activeDockButton.getAttribute('aria-label') || '',
        activeAriaCurrent: activeDockButton.getAttribute('aria-current') || '',
        focusedName: document.activeElement?.getAttribute('aria-label') || '',
        focusOutlineStyle: focusStyle.outlineStyle,
        focusOutlineWidth: focusStyle.outlineWidth,
      };
    }`
    const evaluation = await send('Runtime.evaluate', {
      expression: `(${expression})()`,
      awaitPromise: true,
      returnByValue: true,
    })

    if (evaluation.exceptionDetails) fail('Edge CDP scroll fixture evaluation failed', evaluation.exceptionDetails)

    const parsed = evaluation.result.value
    if (parsed.touchAction !== 'pan-y') fail('Scroll fixture touch-action is not pan-y', parsed)
    if (parsed.overscrollBehaviorY !== 'contain') {
      fail('Scroll fixture overscroll behavior is not contained', parsed)
    }
    if (parsed.afterScrollTop <= parsed.beforeScrollTop) fail('Scroll fixture did not scroll', parsed)
    if (parsed.scrollHeight <= parsed.clientHeight) fail('Scroll fixture is not scrollable', parsed)
    if (parsed.bottomCard.bottom > parsed.dock.top - 4) {
      fail('Bottom card remains occluded by the mobile dock after scrolling to end', parsed)
    }
    if (parsed.dock.height < 50 || parsed.dock.height > 58) fail('Dock height changed unexpectedly', parsed)
    if (parsed.dock.width < 300 || parsed.dock.width > 330) fail('Dock width changed unexpectedly', parsed)
    if (parsed.activeName !== 'Proxies' || parsed.activeAriaCurrent !== 'page') {
      fail('Dock active route semantics changed in scroll fixture', parsed)
    }
    if (parsed.focusedName !== 'Proxies') fail('Dock active button did not receive focus', parsed)
    if (parsed.focusOutlineStyle === 'none' || parsed.focusOutlineWidth === '0px') {
      fail('Dock focused button has no visible outline in scroll fixture', parsed)
    }

    return {
      pass: true,
      browser: 'edge-cdp-scroll-fixture',
      browserVersion: version.Browser,
      builtCssFile,
      fixtureUrl: `${baseUrl}/__scroll-fixture`,
      touchAction: parsed.touchAction,
      overscrollBehaviorY: parsed.overscrollBehaviorY,
      scrollTop: parsed.afterScrollTop,
      scrollHeight: parsed.scrollHeight,
      clientHeight: parsed.clientHeight,
      bottomCard: parsed.bottomCard,
      dock: parsed.dock,
      activeName: parsed.activeName,
      focusOutline: {
        style: parsed.focusOutlineStyle,
        width: parsed.focusOutlineWidth,
      },
      servedRequests: servedRequests.slice(-20),
    }
  } finally {
    cdp?.close()
    edge.kill('SIGKILL')
    await rm(userDataDir, { recursive: true, force: true }).catch(() => {})
  }
}

const runEdgeCdpAppCheck = async (
  builtCssFile,
  { providerGrouped = false, expandedMobileGroup = providerGrouped } = {},
) => {
  const edgePath = getEdgeExecutable()
  if (!edgePath) fail('Microsoft Edge executable could not be located')

  const defaultCdpPort = providerGrouped ? 9236 : 9235
  const cdpPort = Number(process.env.ZASHBOARD_SCROLL_VERIFY_APP_CDP_PORT || defaultCdpPort)
  const userDataDir = await mkdtemp(join(tmpdir(), 'zashboard-scroll-app-cdp-'))
  const edgeArgs = [
    '--headless=new',
    '--disable-gpu',
    '--disable-extensions',
    '--disable-background-networking',
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-debugging-address=127.0.0.1',
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${userDataDir}`,
    'about:blank',
  ]
  const stderrChunks = []
  let edgeExit
  const edge = spawn(edgePath, edgeArgs, { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true })
  edge.stderr?.on('data', (chunk) => {
    stderrChunks.push(chunk.toString('utf8'))
  })
  edge.on('exit', (code, signal) => {
    edgeExit = { code, signal }
  })

  let cdp
  try {
    const version = await waitForCdpEndpoint(cdpPort, () => ({
      edgePath,
      edgeArgs,
      edgeExit,
      edgeStderr: stderrChunks.join('').trim().slice(-2000),
    }))
    cdp = await createCdpClient(version.webSocketDebuggerUrl)
    const { targetId } = await cdp.send('Target.createTarget', {
      url: 'about:blank',
    })
    const { sessionId } = await cdp.send('Target.attachToTarget', {
      targetId,
      flatten: true,
    })
    const send = (method, params = {}) => cdp.send(method, params, sessionId)

    await send('Runtime.enable')
    await send('Page.enable')
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    })
    const loadEvent = cdp.waitForEvent('Page.loadEventFired')
    await send('Page.navigate', { url: `${baseUrl}/#/proxies` })
    await loadEvent

    const expression = `async () => {
      const waitFor = (predicate, label, timeout = 15000) =>
        new Promise((resolve, reject) => {
          const startedAt = performance.now();
          const tick = () => {
            const value = predicate();
            if (value) {
              resolve(value);
              return;
            }
            if (performance.now() - startedAt > timeout) {
              reject(new Error('Timed out waiting for ' + label));
              return;
            }
            requestAnimationFrame(tick);
          };
          tick();
        });
      const frameStats = (samples, sampleScrollTops = []) => {
        const sorted = samples.slice().sort((a, b) => a - b);
        const sampleDeltas = samples.map((sample) => Number(sample.toFixed(2)));
        const max = sorted.at(-1) || 0;
        const maxSampleIndex = samples.findIndex((sample) => sample === max);
        const percentile = (ratio) => sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * ratio))] || 0;
        return {
          samples: samples.length,
          p50: Number(percentile(0.5).toFixed(2)),
          p95: Number(percentile(0.95).toFixed(2)),
          max: Number(max.toFixed(2)),
          maxSampleIndex,
          sampleDeltas,
          longSamples: sampleDeltas
            .map((delta, index) => ({
              index,
              delta,
              ...(sampleScrollTops[index] || {}),
            }))
            .filter(({ delta }) => delta >= 50),
        };
      };
      const hitTestElement = (element) => {
        const rect = element.getBoundingClientRect();
        const x = Math.max(1, Math.min(window.innerWidth - 1, rect.left + rect.width / 2));
        const y = Math.max(1, Math.min(window.innerHeight - 1, rect.top + rect.height / 2));
        const hit = document.elementFromPoint(x, y);

        return {
          x: Number(x.toFixed(2)),
          y: Number(y.toFixed(2)),
          hitTag: hit?.tagName || '',
          hitAriaLabel: hit?.closest('[aria-label]')?.getAttribute('aria-label') || '',
          hitGroupName: hit?.closest('[data-group-name]')?.getAttribute('data-group-name') || '',
          hitDockButtonName: hit?.closest('.dock-button')?.getAttribute('aria-label') || '',
          hitDockShell: Boolean(hit?.closest('.dock-shell')),
        };
      };
      const readDock = () => {
        const dockShell = document.querySelector('.dock-shell');
        const dock = document.querySelector('.dock');
        const dockRect = dock?.getBoundingClientRect();
        const shellRect = dockShell?.getBoundingClientRect();
        const dockStyle = dock ? getComputedStyle(dock) : null;

        return {
          backgroundColor: dockStyle?.backgroundColor || '',
          backdropFilter: dockStyle?.backdropFilter || dockStyle?.webkitBackdropFilter || '',
          top: dockRect?.top || 0,
          bottom: dockRect?.bottom || 0,
          height: dockRect?.height || 0,
          width: dockRect?.width || 0,
          safeAreaGap: Number((window.innerHeight - (dockRect?.bottom || 0)).toFixed(2)),
          shell: shellRect
            ? {
                top: shellRect.top,
                bottom: shellRect.bottom,
                height: shellRect.height,
                width: shellRect.width,
              }
            : null,
          viewport: {
            height: window.innerHeight,
            width: window.innerWidth,
          },
        };
      };
      const readLabelRects = () =>
        Array.from(document.querySelectorAll('.dock-button')).map((button) => {
          const label = button.querySelector('.dock-label');
          const buttonRect = button.getBoundingClientRect();
          const labelRect = label?.getBoundingClientRect();
          const labelStyle = label ? getComputedStyle(label) : null;
          return {
            name: button.getAttribute('aria-label') || '',
            buttonLeft: Number(buttonRect.left.toFixed(2)),
            buttonRight: Number(buttonRect.right.toFixed(2)),
            buttonTop: Number(buttonRect.top.toFixed(2)),
            buttonBottom: Number(buttonRect.bottom.toFixed(2)),
            buttonWidth: Number(buttonRect.width.toFixed(2)),
            labelLeft: Number((labelRect?.left || 0).toFixed(2)),
            labelRight: Number((labelRect?.right || 0).toFixed(2)),
            labelTop: Number((labelRect?.top || 0).toFixed(2)),
            labelBottom: Number((labelRect?.bottom || 0).toFixed(2)),
            labelWidth: Number((labelRect?.width || 0).toFixed(2)),
            labelHeight: Number((labelRect?.height || 0).toFixed(2)),
            scrollWidth: label?.scrollWidth || 0,
            clientWidth: label?.clientWidth || 0,
            overflowX: labelStyle?.overflowX || '',
            textOverflow: labelStyle?.textOverflow || '',
            whiteSpace: labelStyle?.whiteSpace || '',
          };
        });
      const clickDockRoute = async (name, hash) => {
        const button = Array.from(document.querySelectorAll('.dock-button')).find(
          (item) => item.getAttribute('aria-label') === name,
        );
        if (!button) throw new Error('Dock button is missing: ' + name);

        const hit = hitTestElement(button);
        if (hit.hitDockButtonName !== name) {
          throw new Error('Dock button is not the top hit target: ' + name);
        }

        const target = document.elementFromPoint(hit.x, hit.y)?.closest('.dock-button');
        if (!target) throw new Error('Dock button hit target is missing: ' + name);

        target.dispatchEvent(
          new PointerEvent('pointerdown', {
            bubbles: true,
            cancelable: true,
            clientX: hit.x,
            clientY: hit.y,
            pointerType: 'touch',
          }),
        );
        target.dispatchEvent(
          new PointerEvent('pointerup', {
            bubbles: true,
            cancelable: true,
            clientX: hit.x,
            clientY: hit.y,
            pointerType: 'touch',
          }),
        );
        target.click();

        await waitFor(
          () => {
            const active = document.querySelector('.dock-active');
            return location.hash.includes(hash) && active?.getAttribute('aria-label') === name;
          },
          'dock route click ' + name,
          5000,
        );

        return {
          name,
          hash,
          actualHash: location.hash,
          activeName: document.querySelector('.dock-active')?.getAttribute('aria-label') || '',
          ...hit,
        };
      };
      const readRouteSmoothScrollSurface = async (name, hash) => {
        const button = Array.from(document.querySelectorAll('.dock-button')).find(
          (item) => item.getAttribute('aria-label') === name,
        );
        const click = button ? await clickDockRoute(name, hash) : null;
        if (!button) {
          location.hash = hash;
          await waitFor(() => location.hash.includes(hash), name + ' hash navigation', 5000);
        }
        const scroll = await waitFor(
          () => {
            const surfaces = Array.from(document.querySelectorAll('.smooth-scroll-container'));
            return surfaces.at(-1) || null;
          },
          name + ' smooth scroll surface',
          5000,
        );
        await new Promise((resolve) => requestAnimationFrame(resolve));

        const scrollStyle = getComputedStyle(scroll);
        const scrollRect = scroll.getBoundingClientRect();
        const dockShell = document.querySelector('.dock-shell');
        const dockRect = dockShell?.getBoundingClientRect();
        const active = document.querySelector('.dock-active');

        return {
          name,
          hash,
          actualHash: location.hash,
          activeName: active?.getAttribute('aria-label') || '',
          navigatedByDock: Boolean(click),
          click,
          touchAction: scrollStyle.touchAction,
          overscrollBehaviorY: scrollStyle.overscrollBehaviorY,
          webkitOverflowScrolling: scrollStyle.webkitOverflowScrolling || '',
          scrollHeight: scroll.scrollHeight,
          clientHeight: scroll.clientHeight,
          rect: {
            top: scrollRect.top,
            bottom: scrollRect.bottom,
            height: scrollRect.height,
          },
          dock: dockRect
            ? {
                top: dockRect.top,
                bottom: dockRect.bottom,
                height: dockRect.height,
                width: dockRect.width,
              }
            : null,
        };
      };
      const stepScrollToEnd = async (scroll) => {
        const samples = [];
        const sampleScrollTops = [];
        const layoutDeltaEpsilon = 0.5;
        const longTasks = [];
        const sampleStartedAt = performance.now();
        const resourceCountBefore = performance.getEntriesByType('resource').length;
        const resourceNamesBefore = new Set(
          performance.getEntriesByType('resource').map((entry) => entry.name),
        );
        let longTaskObserver = null;
        try {
          longTaskObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.startTime < sampleStartedAt) continue;
              longTasks.push({
                name: entry.name,
                startTime: Number(entry.startTime.toFixed(2)),
                duration: Number(entry.duration.toFixed(2)),
              });
            }
          });
          longTaskObserver.observe({ type: 'longtask', buffered: true });
        } catch {
          longTaskObserver = null;
        }
        let previous = performance.now();
        const makeElementKey = (element, index) => {
          if (element === scroll) return 'scroll-root';

          const groupName = element.getAttribute('data-group-name');
          if (groupName) return 'group:' + groupName;

          const directScrollChildIndex = Array.prototype.indexOf.call(scroll.children, element);
          if (directScrollChildIndex >= 0) return 'scroll-child:' + directScrollChildIndex;

          const ownerGroup = element.closest('[data-group-name]');
          if (ownerGroup) {
            const ownerName = ownerGroup.getAttribute('data-group-name') || 'unknown';
            const ownerIndex = Array.prototype.indexOf.call(ownerGroup.querySelectorAll('*'), element);
            return 'group-descendant:' + ownerName + ':' + ownerIndex;
          }

          return element.tagName + ':' + index;
        };
        const readDirectChildMetrics = (element) =>
          Array.from(element.children).slice(0, 4).map((child, index) => {
            const rect = child.getBoundingClientRect();

            return {
              index,
              tag: child.tagName,
              className: typeof child.className === 'string' ? child.className : '',
              offsetHeight: child.offsetHeight,
              scrollHeight: child.scrollHeight,
              clientHeight: child.clientHeight,
              rectHeight: rect.height,
              rectTop: rect.top,
              rectBottom: rect.bottom,
            };
          });
        const readElementMetrics = (element, index) => {
          const rect = element.getBoundingClientRect();

          return {
            key: makeElementKey(element, index),
            index,
            name: element.getAttribute('data-group-name') || element.getAttribute('aria-label') || element.tagName,
            tag: element.tagName,
            className: typeof element.className === 'string' ? element.className : '',
            offsetHeight: element.offsetHeight,
            scrollHeight: element.scrollHeight,
            clientHeight: element.clientHeight,
            childElementCount: element.querySelectorAll('*').length,
            rectTop: rect.top,
            rectBottom: rect.bottom,
            rectHeight: rect.height,
            directChildren: readDirectChildMetrics(element),
          };
        };
        const collectLayoutElements = () => [
          scroll,
          ...Array.from(scroll.children),
          ...Array.from(scroll.querySelectorAll('[data-group-name]')),
          ...Array.from(scroll.querySelectorAll('[data-group-name] > *')),
        ];
        const beforeElements = collectLayoutElements().map(readElementMetrics);
        const beforeElementByKey = new Map(beforeElements.map((item) => [item.key, item]));
        const scrollHeightBefore = scroll.scrollHeight;
        const clientHeightBefore = scroll.clientHeight;
        const childElementCountBefore = scroll.querySelectorAll('*').length;
        const maxScrollTop = Math.max(0, scroll.scrollHeight - scroll.clientHeight);
        const steps = Math.max(8, Math.min(32, Math.ceil(maxScrollTop / Math.max(scroll.clientHeight / 2, 1))));

        for (let step = 1; step <= steps; step += 1) {
          await new Promise((resolve) => requestAnimationFrame((now) => {
            const nextScrollTop = (maxScrollTop * step) / steps;

            samples.push(now - previous);
            sampleScrollTops.push({
              scrollTopBefore: Number(scroll.scrollTop.toFixed(2)),
              scrollTopAfter: Number(nextScrollTop.toFixed(2)),
              remainingAfter: Number((maxScrollTop - nextScrollTop).toFixed(2)),
            });
            previous = now;
            scroll.scrollTop = nextScrollTop;
            resolve();
          }));
        }
        await new Promise((resolve) => requestAnimationFrame((now) => {
          samples.push(now - previous);
          sampleScrollTops.push({
            scrollTopBefore: Number(scroll.scrollTop.toFixed(2)),
            scrollTopAfter: Number(scroll.scrollTop.toFixed(2)),
            remainingAfter: Number((maxScrollTop - scroll.scrollTop).toFixed(2)),
          });
          resolve();
        }));
        await new Promise((resolve) => requestAnimationFrame(resolve));
        scroll.scrollTop = Math.max(0, scroll.scrollHeight - scroll.clientHeight);
        await new Promise((resolve) => requestAnimationFrame(resolve));
        longTaskObserver?.disconnect();
        const resourcesAfter = performance.getEntriesByType('resource');
        const newResources = resourcesAfter
          .filter((entry) => !resourceNamesBefore.has(entry.name))
          .slice(-20)
          .map((entry) => ({
            name: entry.name,
            initiatorType: entry.initiatorType,
            startTime: Number(entry.startTime.toFixed(2)),
            duration: Number(entry.duration.toFixed(2)),
            transferSize: entry.transferSize || 0,
          }));
        const afterElements = collectLayoutElements().map(readElementMetrics);
        const layoutChanges = afterElements
          .map((after, index) => {
            const before = beforeElementByKey.get(after.key);
            if (!before) return null;

            const offsetHeightDelta = after.offsetHeight - before.offsetHeight;
            const scrollHeightDelta = after.scrollHeight - before.scrollHeight;
            const clientHeightDelta = after.clientHeight - before.clientHeight;
            const childElementCountDelta = after.childElementCount - before.childElementCount;
            const rectHeightDelta = after.rectHeight - before.rectHeight;
            const rectTopDelta = after.rectTop - before.rectTop;
            const rectBottomDelta = after.rectBottom - before.rectBottom;

            if (
              Math.abs(offsetHeightDelta) < layoutDeltaEpsilon &&
              Math.abs(scrollHeightDelta) < layoutDeltaEpsilon &&
              Math.abs(clientHeightDelta) < layoutDeltaEpsilon &&
              childElementCountDelta === 0 &&
              Math.abs(rectHeightDelta) < layoutDeltaEpsilon
            ) {
              return null;
            }

            return {
              index,
              key: after.key,
              name: after.name,
              tag: after.tag,
              className: after.className,
              offsetHeightDelta,
              scrollHeightDelta,
              clientHeightDelta,
              childElementCountDelta,
              rectHeightDelta,
              rectTopDelta,
              rectBottomDelta,
              before,
              after,
            };
          })
          .filter(Boolean)
          .sort((a, b) => {
            const aSizeDelta = Math.abs(a.offsetHeightDelta) + Math.abs(a.scrollHeightDelta) + Math.abs(a.rectHeightDelta);
            const bSizeDelta = Math.abs(b.offsetHeightDelta) + Math.abs(b.scrollHeightDelta) + Math.abs(b.rectHeightDelta);
            return bSizeDelta - aSizeDelta;
          })
          .slice(0, 30);
        return {
          ...frameStats(samples, sampleScrollTops),
          scrollHeightBefore,
          scrollHeightAfter: scroll.scrollHeight,
          clientHeightBefore,
          clientHeightAfter: scroll.clientHeight,
          childElementCountBefore,
          childElementCountAfter: scroll.querySelectorAll('*').length,
          longTasks: longTasks.slice(-20),
          resourceCountBefore,
          resourceCountAfter: resourcesAfter.length,
          newResources,
          layoutChanges,
        };
      };
      const waitForSettledFrames = () =>
        new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const readExpandedPanelMetrics = (nestedScroll) => {
        const panel = nestedScroll.closest('.mobile-proxy-modal-panel');
        const dockShell = document.querySelector('.dock-shell');
        const panelRect = panel?.getBoundingClientRect();
        const nestedRect = nestedScroll.getBoundingClientRect();
        const dockRect = dockShell?.getBoundingClientRect();
        const dockHidden = dockShell ? getComputedStyle(dockShell).pointerEvents === 'none' : false;

        return {
          panelTop: Number((panelRect?.top || 0).toFixed(2)),
          panelBottom: Number((panelRect?.bottom || 0).toFixed(2)),
          panelHeight: Number((panelRect?.height || 0).toFixed(2)),
          nestedTop: Number(nestedRect.top.toFixed(2)),
          nestedBottom: Number(nestedRect.bottom.toFixed(2)),
          nestedHeight: Number(nestedRect.height.toFixed(2)),
          nestedClientHeight: nestedScroll.clientHeight,
          nestedScrollHeight: nestedScroll.scrollHeight,
          nestedReady: nestedScroll.getAttribute('data-expanded-ready') === 'true',
          dockTop: Number((dockRect?.top || window.innerHeight).toFixed(2)),
          dockHidden,
          viewportHeight: window.innerHeight,
          viewportWidth: window.innerWidth,
        };
      };
      const verifyExpandedViewportChange = async (nestedScroll) => {
        const before = readExpandedPanelMetrics(nestedScroll);
        window.dispatchEvent(new Event('resize'));
        window.dispatchEvent(new Event('orientationchange'));
        window.visualViewport?.dispatchEvent(new Event('resize'));
        window.visualViewport?.dispatchEvent(new Event('scroll'));
        await waitForSettledFrames();
        const after = readExpandedPanelMetrics(nestedScroll);

        return {
          before,
          after,
          nestedStillScrollable: after.nestedScrollHeight > after.nestedClientHeight,
          nestedStillReady: after.nestedReady,
          dockStillHidden: after.dockHidden,
          panelWithinViewport:
            after.panelHeight >= 160 &&
            after.panelTop >= -1 &&
            after.panelBottom <= after.viewportHeight + 1,
          nestedAboveDock: after.nestedBottom <= after.dockTop + 1,
          nestedHeightDelta: Number((after.nestedHeight - before.nestedHeight).toFixed(2)),
          panelHeightDelta: Number((after.panelHeight - before.panelHeight).toFixed(2)),
        };
      };
      const waitForStableScrollMetrics = async (scroll) => {
        let stableFrames = 0;
        let previousScrollHeight = scroll.scrollHeight;
        let previousClientHeight = scroll.clientHeight;

        for (let frame = 0; frame < 20 && stableFrames < 3; frame += 1) {
          await new Promise((resolve) => requestAnimationFrame(resolve));

          if (
            scroll.scrollHeight === previousScrollHeight &&
            scroll.clientHeight === previousClientHeight
          ) {
            stableFrames += 1;
          } else {
            previousScrollHeight = scroll.scrollHeight;
            previousClientHeight = scroll.clientHeight;
            stableFrames = 0;
          }
        }

        return {
          stableFrames,
          scrollHeight: scroll.scrollHeight,
          clientHeight: scroll.clientHeight,
        };
      };
      const waitForSamplingIdle = async (scroll) => {
        let stableFrames = 0;
        let previousScrollTop = scroll.scrollTop;
        let previousScrollHeight = scroll.scrollHeight;
        let previousClientHeight = scroll.clientHeight;
        let previousElementCount = scroll.querySelectorAll('*').length;

        for (let frame = 0; frame < 24 && stableFrames < 4; frame += 1) {
          await new Promise((resolve) => requestAnimationFrame(resolve));

          const nextScrollTop = scroll.scrollTop;
          const nextScrollHeight = scroll.scrollHeight;
          const nextClientHeight = scroll.clientHeight;
          const nextElementCount = scroll.querySelectorAll('*').length;

          if (
            nextScrollTop === previousScrollTop &&
            nextScrollHeight === previousScrollHeight &&
            nextClientHeight === previousClientHeight &&
            nextElementCount === previousElementCount
          ) {
            stableFrames += 1;
          } else {
            previousScrollTop = nextScrollTop;
            previousScrollHeight = nextScrollHeight;
            previousClientHeight = nextClientHeight;
            previousElementCount = nextElementCount;
            stableFrames = 0;
          }
        }

        return {
          stableFrames,
          scrollTop: scroll.scrollTop,
          scrollHeight: scroll.scrollHeight,
          clientHeight: scroll.clientHeight,
          elementCount: scroll.querySelectorAll('*').length,
        };
      };

      const diagnostics = () => ({
        ok: false,
        url: location.href,
        hash: location.hash,
        title: document.title,
        storage: {
          apiList: localStorage.getItem('setup/api-list'),
          activeUuid: localStorage.getItem('setup/active-uuid'),
          defaultTheme: localStorage.getItem('config/default-theme'),
          autoTheme: localStorage.getItem('config/auto-theme'),
        },
        selectors: {
          app: Boolean(document.querySelector('#app')),
          setupPageText: document.body.innerText.includes('Setup'),
          proxiesScrollablePage: Boolean(document.getElementById('proxies-scrollable-page')),
          dockShell: Boolean(document.querySelector('.dock-shell')),
          dockActive: Boolean(document.querySelector('.dock-active')),
          proxyGroups: document.querySelectorAll('[data-group-name]').length,
          providerHeadings: Array.from(document.querySelectorAll('p')).filter((item) =>
            item.textContent?.startsWith('Provider '),
          ).length,
        },
        bodyText: document.body.innerText.slice(0, 1000),
      });

      try {
        const scroll = await waitFor(
          () => document.getElementById('proxies-scrollable-page'),
          '#proxies-scrollable-page',
        );
        await waitFor(() => document.querySelectorAll('[data-group-name]').length >= 20, 'proxy groups');
        const dockShell = await waitFor(() => document.querySelector('.dock-shell'), '.dock-shell');
        const activeDockButton = await waitFor(() => document.querySelector('.dock-active'), '.dock-active');
        let providerDetails = null;
        let frameScroll = scroll;
        let frameTarget = 'proxies-page-scroll';
        let expandedViewportChange = null;

        if (${JSON.stringify(expandedMobileGroup)}) {
          const firstGroup = document.querySelector('[data-group-name="Group 01"]');
          if (!firstGroup) throw new Error('Group 01 is missing');
          firstGroup.click();
          const providerHeading = ${JSON.stringify(providerGrouped)}
            ? await waitFor(
                () => Array.from(document.querySelectorAll('p')).find((item) =>
                  item.textContent?.startsWith('Provider '),
                ),
                'provider grouped heading',
              )
            : null;
          const nestedScroll = await waitFor(
            () => {
              const element = document.querySelector(
                '.proxies-scrollable-parent[data-expanded-ready="true"]',
              );
              if (!element) return null;
              return element.clientHeight >= 120 ? element : null;
            },
            'expanded .proxies-scrollable-parent readiness',
          );
          frameScroll = nestedScroll;
          frameTarget = ${JSON.stringify(providerGrouped)}
            ? 'provider-expanded-nested-scroll'
            : 'mobile-expanded-nested-scroll';
          const providerHeadings = Array.from(document.querySelectorAll('p'))
            .filter((item) => item.textContent?.startsWith('Provider '))
            .map((item) => item.textContent.trim());
          const providerNodeNames = Array.from(document.querySelectorAll('.proxies-scrollable-parent span'))
            .map((item) => item.textContent?.trim() || '')
            .filter((text) => text.includes('Group 01 Node'));
          const nestedStyle = getComputedStyle(nestedScroll);
          expandedViewportChange = await verifyExpandedViewportChange(nestedScroll);
          providerDetails = {
            firstHeading: providerHeading?.textContent.trim() || '',
            headingCount: providerHeadings.length,
            headings: providerHeadings,
            nodeCount: providerNodeNames.length,
            firstNodeName: providerNodeNames[0] || '',
            nestedTouchAction: nestedStyle.touchAction,
            nestedOverscrollBehaviorY: nestedStyle.overscrollBehaviorY,
            nestedScrollHeight: nestedScroll.scrollHeight,
            nestedClientHeight: nestedScroll.clientHeight,
          };
        }

        const fontStatusBeforeReady = document.fonts?.status || 'unsupported';
        if (document.fonts?.ready) {
          await document.fonts.ready;
        }
        const fontStatusAfterReady = document.fonts?.status || fontStatusBeforeReady;
        const scrollStyle = getComputedStyle(scroll);
        const beforeScrollTop = scroll.scrollTop;
        await waitForSettledFrames();
        const stableScrollMetrics = await waitForStableScrollMetrics(frameScroll);
        const samplingIdle = await waitForSamplingIdle(frameScroll);
        const frameBeforeScrollTop = frameScroll.scrollTop;
        const frame = await stepScrollToEnd(frameScroll);
        const frameAfterScrollTop = frameScroll.scrollTop;
        const groups = Array.from(document.querySelectorAll('[data-group-name]'));
        const visualBottomGroup = groups
          .map((group) => ({
            group,
            rect: group.getBoundingClientRect(),
          }))
          .sort((a, b) => b.rect.bottom - a.rect.bottom)[0];
        const bottomGroup = visualBottomGroup.group;
        activeDockButton.focus();
        const focusStyle = getComputedStyle(document.activeElement);
        const bottomRect = visualBottomGroup.rect;
        const dockRect = dockShell.getBoundingClientRect();
        const dock = readDock();
        const scrollRect = scroll.getBoundingClientRect();
        const scrollMetrics = {
          afterScrollTop: scroll.scrollTop,
          scrollHeight: scroll.scrollHeight,
          clientHeight: scroll.clientHeight,
          touchAction: scrollStyle.touchAction,
          overscrollBehaviorY: scrollStyle.overscrollBehaviorY,
        };
        const bottomGroupHit = hitTestElement(bottomGroup);
        const dockButtonHits = Array.from(document.querySelectorAll('.dock-button')).map((button) => ({
          expectedName: button.getAttribute('aria-label') || '',
          ...hitTestElement(button),
        }));
        const hitTargets = {
          bottomGroup: bottomGroupHit,
          dockButtons: dockButtonHits,
          dockHidden: getComputedStyle(dockShell).pointerEvents === 'none',
        };
        let dockRouteClicks = null;
        let routeScrollSurfaces = null;
        if (!${JSON.stringify(providerGrouped)} && !${JSON.stringify(expandedMobileGroup)} && !hitTargets.dockHidden) {
          dockRouteClicks = [];
          for (const [name, hash] of [
            ['Connections', '#/connections'],
            ['Logs', '#/logs'],
            ['Rules', '#/rules'],
            ['Settings', '#/settings'],
            ['Proxies', '#/proxies'],
          ]) {
            dockRouteClicks.push(await clickDockRoute(name, hash));
          }
          routeScrollSurfaces = [];
          for (const [name, hash] of [
            ['Overview', '#/overview'],
            ['Settings', '#/settings'],
          ]) {
            routeScrollSurfaces.push(await readRouteSmoothScrollSurface(name, hash));
          }
          await clickDockRoute('Proxies', '#/proxies');
        }
        return {
          ok: true,
          url: location.href,
          verifyConfig: {
            lowPowerMode: localStorage.getItem('config/low-power-mode'),
            scrollAnimationEffect: localStorage.getItem('config/scroll-animation-effect'),
            blurIntensity: localStorage.getItem('config/blur-intensity'),
          },
          groupCount: groups.length,
          lastGroupName: bottomGroup.getAttribute('data-group-name') || '',
          beforeScrollTop,
          afterScrollTop: scrollMetrics.afterScrollTop,
          frameBeforeScrollTop,
          frameAfterScrollTop,
          scrollHeight: scrollMetrics.scrollHeight,
          clientHeight: scrollMetrics.clientHeight,
          frame,
          frameTarget,
          providerGrouped: ${JSON.stringify(providerGrouped)},
          expandedMobileGroup: ${JSON.stringify(expandedMobileGroup)},
          providerDetails,
          expandedViewportChange,
          fontStatusBeforeReady,
          fontStatusAfterReady,
          stableScrollMetrics,
          samplingIdle,
          touchAction: scrollMetrics.touchAction,
          overscrollBehaviorY: scrollMetrics.overscrollBehaviorY,
          bottomGroup: {
            top: bottomRect.top,
            bottom: bottomRect.bottom,
            height: bottomRect.height,
          },
          hitTargets,
          dockRouteClicks,
          routeScrollSurfaces,
          dock: {
            ...dock,
            shellTop: dockRect.top,
            shellBottom: dockRect.bottom,
            shellHeight: dockRect.height,
            shellWidth: dockRect.width,
          },
          labelRects: readLabelRects(),
          scroll: {
            top: scrollRect.top,
            bottom: scrollRect.bottom,
            height: scrollRect.height,
          },
          activeName: activeDockButton.getAttribute('aria-label') || '',
          activeAriaCurrent: activeDockButton.getAttribute('aria-current') || '',
          focusedName: document.activeElement?.getAttribute('aria-label') || '',
          focusOutlineStyle: focusStyle.outlineStyle,
          focusOutlineWidth: focusStyle.outlineWidth,
        };
      } catch (error) {
        return {
          ...diagnostics(),
          error: error.message,
        };
      }
    }`
    const evaluation = await send('Runtime.evaluate', {
      expression: `(${expression})()`,
      awaitPromise: true,
      returnByValue: true,
    })

    if (evaluation.exceptionDetails) fail('Edge CDP app evaluation failed', evaluation.exceptionDetails)

    const parsed = evaluation.result.value
    if (!parsed.ok) fail('Edge CDP app readiness check failed', parsed)
    if (!parsed.url.includes('#/proxies')) fail('Configured app did not stay on #/proxies', parsed)
    if (parsed.groupCount < 20) fail('Configured app rendered too few Proxies groups', parsed)
    if (parsed.touchAction !== 'pan-y') fail('Configured app scroll touch-action is not pan-y', parsed)
    if (parsed.overscrollBehaviorY !== 'contain') {
      fail('Configured app scroll overscroll behavior is not contained', parsed)
    }
    if (parsed.frameAfterScrollTop <= parsed.frameBeforeScrollTop) {
      fail('Configured app sampled scroll surface did not scroll', parsed)
    }
    if (!providerGrouped && !expandedMobileGroup && parsed.afterScrollTop <= parsed.beforeScrollTop) {
      fail('Configured app did not scroll the Proxies page', parsed)
    }
    if (parsed.scrollHeight <= parsed.clientHeight) fail('Configured app Proxies page is not scrollable', parsed)
    if (!['loaded', 'unsupported'].includes(parsed.fontStatusAfterReady)) {
      fail('Configured app font readiness did not settle before scroll sampling', parsed)
    }
    if (!parsed.stableScrollMetrics || parsed.stableScrollMetrics.stableFrames < 3) {
      fail('Configured app scroll metrics did not settle before frame sampling', parsed)
    }
    if (!parsed.samplingIdle || parsed.samplingIdle.stableFrames < 4) {
      fail('Configured app did not reach an idle sampling window before frame sampling', parsed)
    }
    if (parsed.frame.samples < 8) fail('Configured app frame sampling did not collect enough samples', parsed)
    if (!Array.isArray(parsed.frame.sampleDeltas) || parsed.frame.sampleDeltas.length !== parsed.frame.samples) {
      fail('Configured app frame diagnostics did not include every sampled delta', parsed)
    }
    if (
      !Number.isFinite(parsed.frame.maxSampleIndex) ||
      parsed.frame.maxSampleIndex < 0 ||
      parsed.frame.maxSampleIndex >= parsed.frame.samples
    ) {
      fail('Configured app frame diagnostics did not include a valid max sample index', parsed)
    }
    if (!Array.isArray(parsed.frame.longSamples)) {
      fail('Configured app frame diagnostics did not include long sample details', parsed)
    }
    if (!Array.isArray(parsed.frame.longTasks)) {
      fail('Configured app frame diagnostics did not include long task details', parsed)
    }
    if (!Array.isArray(parsed.frame.newResources)) {
      fail('Configured app frame diagnostics did not include resource timing details', parsed)
    }
    for (const field of [
      'scrollHeightBefore',
      'scrollHeightAfter',
      'clientHeightBefore',
      'clientHeightAfter',
      'childElementCountBefore',
      'childElementCountAfter',
      'resourceCountBefore',
      'resourceCountAfter',
    ]) {
      if (!Number.isFinite(parsed.frame[field])) {
        fail('Configured app frame diagnostics did not include ' + field, parsed)
      }
    }
    if (parsed.frame.p95 > 80 || parsed.frame.max > 120) {
      fail('Configured app scroll frame sample exceeded the smoothness budget', parsed)
    }
    if (
      parsed.frame.longSamples.length &&
      (parsed.frame.layoutChanges.length || parsed.frame.longTasks.length || parsed.frame.newResources.length)
    ) {
      fail('Configured app long frame samples are coupled to layout, long task, or resource churn', parsed)
    }
    if (expandedMobileGroup) {
      if (!parsed.hitTargets.dockHidden) {
        fail('Expanded mobile group mode did not hide the mobile dock hit surface', parsed)
      }
      if (!parsed.expandedViewportChange) {
        fail('Expanded mobile group mode did not run viewport-change verification', parsed)
      }
      if (!parsed.expandedViewportChange.nestedStillReady) {
        fail('Expanded mobile group nested scroll lost readiness after viewport change', parsed)
      }
      if (!parsed.expandedViewportChange.nestedStillScrollable) {
        fail('Expanded mobile group nested scroll stopped being scrollable after viewport change', parsed)
      }
      if (!parsed.expandedViewportChange.dockStillHidden) {
        fail('Expanded mobile group exposed dock hit surface after viewport change', parsed)
      }
      if (!parsed.expandedViewportChange.panelWithinViewport) {
        fail('Expanded mobile group panel moved outside the viewport after viewport change', parsed)
      }
      if (!parsed.expandedViewportChange.nestedAboveDock) {
        fail('Expanded mobile group nested scroll overlaps the dock after viewport change', parsed)
      }
      const visibleDockHitFailures = parsed.hitTargets.dockButtons.filter(
        (button) => button.hitDockShell || button.hitDockButtonName,
      )
      if (visibleDockHitFailures.length) {
        fail('Expanded mobile group mode still exposes dock hit targets', parsed)
      }
    }
    if (providerGrouped) {
      if (parsed.frameTarget !== 'provider-expanded-nested-scroll') {
        fail('Provider-grouped app did not sample the expanded nested scroll surface', parsed)
      }
      if (!parsed.providerDetails) fail('Provider-grouped app did not collect provider details', parsed)
      const expectedProviderHeadings = [
        'Provider Gamma',
        'Provider Delta',
        'Provider Alpha',
        'Provider Beta',
      ]
      if (JSON.stringify(parsed.providerDetails.headings) !== JSON.stringify(expectedProviderHeadings)) {
        fail('Provider-grouped app provider heading order changed', parsed)
      }
      if (parsed.providerDetails.nodeCount !== 12) {
        fail('Provider-grouped app rendered the wrong grouped proxy node count', parsed)
      }
      if (parsed.providerDetails.firstNodeName !== 'Group 01 Node 01') {
        fail('Provider-grouped app first grouped proxy node changed', parsed)
      }
      if (parsed.providerDetails.nestedTouchAction !== 'pan-y') {
        fail('Provider-grouped nested scroll touch-action is not pan-y', parsed)
      }
      if (parsed.providerDetails.nestedOverscrollBehaviorY !== 'contain') {
        fail('Provider-grouped nested scroll overscroll behavior is not contained', parsed)
      }
    } else if (expandedMobileGroup) {
      if (parsed.frameTarget !== 'mobile-expanded-nested-scroll') {
        fail('Configured app did not sample the mobile expanded nested scroll surface', parsed)
      }
      if (!parsed.providerDetails) fail('Configured app did not collect expanded mobile details', parsed)
      if (parsed.providerDetails.nestedTouchAction !== 'pan-y') {
        fail('Configured app expanded nested scroll touch-action is not pan-y', parsed)
      }
      if (parsed.providerDetails.nestedOverscrollBehaviorY !== 'contain') {
        fail('Configured app expanded nested scroll overscroll behavior is not contained', parsed)
      }
    }
    if (!parsed.providerGrouped && !parsed.expandedMobileGroup) {
      if (parsed.bottomGroup.bottom > parsed.dock.top - 4) {
        fail('Configured app bottom Proxies group remains occluded by the mobile dock', parsed)
      }
      if (parsed.frameTarget !== 'proxies-page-scroll') {
        fail('Configured app did not sample the Proxies page scroll surface', parsed)
      }
      if (parsed.hitTargets.bottomGroup.hitGroupName !== parsed.lastGroupName) {
        fail('Configured app bottom Proxies group is not the top hit target', parsed)
      }
      if (parsed.hitTargets.bottomGroup.hitDockShell) {
        fail('Configured app bottom Proxies group center is intercepted by the dock', parsed)
      }
      const dockHitFailures = parsed.hitTargets.dockButtons.filter(
        (button) => button.hitDockButtonName !== button.expectedName,
      )
      if (dockHitFailures.length) fail('Configured app dock buttons are not top hit targets', parsed)
      if (!parsed.dockRouteClicks || parsed.dockRouteClicks.length !== 5) {
        fail('Configured app dock route click checks did not run', parsed)
      }
      const dockRouteClickFailures = parsed.dockRouteClicks.filter(
        (click) => !click.actualHash.includes(click.hash) || click.activeName !== click.name,
      )
      if (dockRouteClickFailures.length) {
        fail('Configured app dock route clicks did not update route state', parsed)
      }
      if (!parsed.routeScrollSurfaces || parsed.routeScrollSurfaces.length !== 2) {
        fail('Configured app route smooth-scroll surface checks did not run', parsed)
      }
      const routeSurfaceFailures = parsed.routeScrollSurfaces.filter(
        (route) =>
          !route.actualHash.includes(route.hash) ||
          (route.navigatedByDock && route.activeName !== route.name) ||
          (route.name === 'Settings' && !route.navigatedByDock) ||
          route.touchAction !== 'pan-y' ||
          route.overscrollBehaviorY !== 'contain' ||
          route.rect.height < 300 ||
          !route.dock ||
          route.dock.height < 50 ||
          route.dock.height > 58 ||
          route.dock.width < 300 ||
          route.dock.width > 330,
      )
      if (routeSurfaceFailures.length) {
        fail('Configured app route smooth-scroll surfaces are inconsistent', parsed)
      }
    }
    if (parsed.dock.height < 50 || parsed.dock.height > 58) fail('Dock height changed unexpectedly', parsed)
    if (parsed.dock.width < 300 || parsed.dock.width > 330) fail('Dock width changed unexpectedly', parsed)
    assertAppDockSafeArea(parsed.dock, 'Configured app dock safe-area geometry changed unexpectedly', parsed)
    assertAppDockLabels(parsed.labelRects, 'Configured app dock labels overlap or overflow their buttons', parsed)
    if (parsed.activeName !== 'Proxies' || parsed.activeAriaCurrent !== 'page') {
      fail('Dock active route semantics changed in configured app', parsed)
    }
    if (!expandedMobileGroup && parsed.focusedName !== 'Proxies') {
      fail('Dock active button did not receive focus in configured app', parsed)
    }
    if (
      !expandedMobileGroup &&
      (parsed.focusOutlineStyle === 'none' || parsed.focusOutlineWidth === '0px')
    ) {
      fail('Dock focused button has no visible outline in configured app', parsed)
    }
    const expandedViewportResize = expandedMobileGroup
      ? await runConfiguredAppExpandedViewportResizeCheck(send)
      : null
    const expandedDockAccessibility = expandedMobileGroup
      ? await runConfiguredAppExpandedDockAccessibilityCheck(send)
      : null
    const pageKeyboard = expandedMobileGroup ? null : await runConfiguredAppPageKeyboardTraversalCheck(send)
    const keyboard = expandedMobileGroup ? null : await runConfiguredAppDockKeyboardCheck(send)
    const accessibility = expandedMobileGroup ? null : await runConfiguredAppDockAccessibilityCheck(send)
    const screenshot = await captureAppScreenshot(
      send,
      providerGrouped
        ? 'configured-app-provider-expanded-proxies'
        : expandedMobileGroup
          ? 'configured-app-mobile-expanded-proxies'
          : 'configured-app-proxies',
    )
    const expandedDockRestore = expandedMobileGroup
      ? await runConfiguredAppExpandedDockRestoreCheck(send)
      : null

    return {
      pass: true,
      browser: 'edge-cdp-configured-app',
      browserVersion: version.Browser,
      builtCssFile,
      appUrl: `${baseUrl}/#/proxies`,
      verifyConfig: parsed.verifyConfig,
      groupCount: parsed.groupCount,
      lastGroupName: parsed.lastGroupName,
      touchAction: parsed.touchAction,
      overscrollBehaviorY: parsed.overscrollBehaviorY,
      scrollTop: parsed.afterScrollTop,
      scrollHeight: parsed.scrollHeight,
      clientHeight: parsed.clientHeight,
      frame: parsed.frame,
      frameTarget: parsed.frameTarget,
      providerGrouped: parsed.providerGrouped,
      expandedMobileGroup: parsed.expandedMobileGroup,
      providerDetails: parsed.providerDetails,
      expandedViewportChange: parsed.expandedViewportChange,
      expandedViewportResize,
      expandedDockAccessibility,
      expandedDockRestore,
      fontStatusBeforeReady: parsed.fontStatusBeforeReady,
      fontStatusAfterReady: parsed.fontStatusAfterReady,
      stableScrollMetrics: parsed.stableScrollMetrics,
      samplingIdle: parsed.samplingIdle,
      bottomGroup: parsed.bottomGroup,
      hitTargets: parsed.hitTargets,
      dockRouteClicks: parsed.dockRouteClicks,
      routeScrollSurfaces: parsed.routeScrollSurfaces,
      dock: parsed.dock,
      labelRects: parsed.labelRects,
      pageKeyboard,
      keyboard,
      accessibility,
      screenshot,
      activeName: parsed.activeName,
      focusOutline: {
        style: parsed.focusOutlineStyle,
        width: parsed.focusOutlineWidth,
      },
      servedRequests: servedRequests.slice(-30),
    }
  } finally {
    cdp?.close()
    edge.kill('SIGKILL')
    await rm(userDataDir, { recursive: true, force: true }).catch(() => {})
  }
}

const fail = (message, details = {}) => {
  const error = new Error(message)
  error.details = details
  throw error
}

const evaluateCdpValue = async (send, expression, label) => {
  const evaluation = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })

  if (evaluation.exceptionDetails) {
    fail(`${label} evaluation failed`, evaluation.exceptionDetails)
  }

  return evaluation.result.value
}

const dispatchKeyboardKey = async (send, key, options = {}) => {
  const params = {
    key,
    code: options.code || key,
    windowsVirtualKeyCode: options.windowsVirtualKeyCode,
    nativeVirtualKeyCode: options.windowsVirtualKeyCode,
    modifiers: options.modifiers || 0,
    ...(options.text ? { text: options.text, unmodifiedText: options.text } : {}),
  }

  await send('Input.dispatchKeyEvent', {
    ...params,
    type: options.raw ? 'rawKeyDown' : 'keyDown',
  })
  if (options.text) {
    await send('Input.dispatchKeyEvent', {
      ...params,
      type: 'char',
    })
  }
  await send('Input.dispatchKeyEvent', {
    ...params,
    type: 'keyUp',
  })
}

const waitForCdpValue = async (send, expression, label) => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const value = await evaluateCdpValue(send, expression, label)
    if (value?.ok) return value
    await delay(50)
  }

  fail(`Timed out waiting for ${label}`, await evaluateCdpValue(send, expression, `${label} diagnostics`))
}

const runConfiguredAppExpandedViewportResizeCheck = async (send) => {
  const readExpandedMetricsExpression = `(() => {
    const nestedScroll = document.querySelector('.proxies-scrollable-parent[data-expanded-ready="true"]');
    const panel = nestedScroll?.closest('.mobile-proxy-modal-panel') || null;
    const dockShell = document.querySelector('.dock-shell');
    const panelRect = panel?.getBoundingClientRect();
    const nestedRect = nestedScroll?.getBoundingClientRect();
    const dockRect = dockShell?.getBoundingClientRect();
    const nestedStyle = nestedScroll ? getComputedStyle(nestedScroll) : null;
    const dockHidden = dockShell ? getComputedStyle(dockShell).pointerEvents === 'none' : false;

    return {
      ok: Boolean(nestedScroll && panel && dockShell),
      hash: location.hash,
      panelTop: Number((panelRect?.top || 0).toFixed(2)),
      panelBottom: Number((panelRect?.bottom || 0).toFixed(2)),
      panelHeight: Number((panelRect?.height || 0).toFixed(2)),
      nestedTop: Number((nestedRect?.top || 0).toFixed(2)),
      nestedBottom: Number((nestedRect?.bottom || 0).toFixed(2)),
      nestedHeight: Number((nestedRect?.height || 0).toFixed(2)),
      nestedClientHeight: nestedScroll?.clientHeight || 0,
      nestedScrollHeight: nestedScroll?.scrollHeight || 0,
      nestedTouchAction: nestedStyle?.touchAction || '',
      nestedOverscrollBehaviorY: nestedStyle?.overscrollBehaviorY || '',
      dockTop: Number((dockRect?.top || window.innerHeight).toFixed(2)),
      dockBottom: Number((dockRect?.bottom || 0).toFixed(2)),
      dockHeight: Number((dockRect?.height || 0).toFixed(2)),
      dockWidth: Number((dockRect?.width || 0).toFixed(2)),
      dockHidden,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
    };
  })()`
  const readMetrics = (label) => evaluateCdpValue(send, readExpandedMetricsExpression, label)
  const setMetrics = async (width, height, screenOrientation) => {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 2,
      mobile: true,
      ...(screenOrientation ? { screenOrientation } : {}),
    })
    await delay(250)
  }

  const before = await readMetrics('expanded viewport resize check before')
  await setMetrics(390, 700)
  const compact = await readMetrics('expanded viewport resize check compact')
  await setMetrics(390, 844, { angle: 0, type: 'portraitPrimary' })
  const restored = await readMetrics('expanded viewport resize check restored')

  const result = { before, compact, restored }
  const assertExpandedMetrics = (metrics, label) => {
    if (!metrics.ok) fail(`Expanded mobile group viewport ${label} could not read panel metrics`, result)
    if (!metrics.hash.includes('#/proxies')) {
      fail(`Expanded mobile group viewport ${label} left the Proxies route`, result)
    }
    if (metrics.nestedTouchAction !== 'pan-y') {
      fail(`Expanded mobile group viewport ${label} nested touch-action changed`, result)
    }
    if (metrics.nestedOverscrollBehaviorY !== 'contain') {
      fail(`Expanded mobile group viewport ${label} nested overscroll behavior changed`, result)
    }
    if (metrics.nestedScrollHeight <= metrics.nestedClientHeight) {
      fail(`Expanded mobile group viewport ${label} nested scroll stopped being scrollable`, result)
    }
    if (!metrics.dockHidden) {
      fail(`Expanded mobile group viewport ${label} exposed the dock hit surface`, result)
    }
    if (metrics.panelHeight < 160 || metrics.panelTop < -1 || metrics.panelBottom > metrics.viewportHeight + 1) {
      fail(`Expanded mobile group viewport ${label} panel moved outside the viewport`, result)
    }
    if (metrics.nestedBottom > metrics.dockTop + 1) {
      fail(`Expanded mobile group viewport ${label} nested scroll overlaps the dock`, result)
    }
  }

  assertExpandedMetrics(before, 'before')
  assertExpandedMetrics(compact, 'compact')
  assertExpandedMetrics(restored, 'restored')

  return {
    ...result,
    compactHeightDelta: Number((compact.nestedHeight - before.nestedHeight).toFixed(2)),
    restoredHeightDelta: Number((restored.nestedHeight - before.nestedHeight).toFixed(2)),
  }
}

const runConfiguredAppExpandedDockAccessibilityCheck = async (send) => {
  const dom = await evaluateCdpValue(
    send,
    `(() => {
      const dock = document.querySelector('.dock-shell');
      const buttons = Array.from(document.querySelectorAll('.dock-button'));
      const dockStyle = dock ? getComputedStyle(dock) : null;
      const focusableSelector = [
        'button',
        'input',
        'select',
        'textarea',
        'a[href]',
        '[tabindex]:not([tabindex="-1"])',
      ].join(',');
      const isVisible = (element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);

        return (
          rect.width > 0 &&
          rect.height > 0 &&
          style.visibility !== 'hidden' &&
          style.display !== 'none'
        );
      };
      const modalFocusTarget = Array.from(document.querySelectorAll(focusableSelector)).find(
        (element) =>
          element.closest('.mobile-proxy-modal-panel') &&
          !element.closest('.dock-shell') &&
          !element.disabled &&
          element.getAttribute('aria-disabled') !== 'true' &&
          isVisible(element),
      );

      modalFocusTarget?.focus();
      buttons[0]?.focus();

      return {
        ok: Boolean(dock && buttons.length),
        ariaHidden: dock?.getAttribute('aria-hidden') || '',
        inert: Boolean(dock?.inert),
        pointerEvents: dockStyle?.pointerEvents || '',
        opacity: dockStyle?.opacity || '',
        buttonNames: buttons.map((button) => button.getAttribute('aria-label') || ''),
        focusedDockName: document.activeElement?.closest('.dock-button')?.getAttribute('aria-label') || '',
        focusedInsideModal: Boolean(document.activeElement?.closest('.mobile-proxy-modal-panel')),
      };
    })()`,
    'configured app expanded dock accessibility DOM state',
  )

  const tabFocusOrder = []
  for (let index = 0; index < 12; index += 1) {
    await dispatchKeyboardKey(send, 'Tab', { code: 'Tab', windowsVirtualKeyCode: 9 })
    tabFocusOrder.push(
      await evaluateCdpValue(
        send,
        `(() => {
          const element = document.activeElement;
          const dockButton = element?.closest?.('.dock-button') || null;
          const text = element?.textContent?.replace(/\\s+/g, ' ').trim() || '';

          return {
            dockName: dockButton?.getAttribute('aria-label') || '',
            inDock: Boolean(dockButton),
            label:
              element?.getAttribute?.('aria-label') ||
              element?.getAttribute?.('title') ||
              (text.length <= 80 ? text : text.slice(0, 80)) ||
              element?.tagName ||
              '',
          };
        })()`,
        `configured app expanded dock Tab ${index + 1}`,
      ),
    )
  }

  await send('Accessibility.enable')
  const tree = await send('Accessibility.getFullAXTree')
  const navigationNodes = (tree.nodes || [])
    .map(readAxNode)
    .filter((node) => !node.ignored && node.role === 'navigation' && node.name === 'Main navigation')
  const tabDockEntries = tabFocusOrder.filter((focus) => focus.inDock)
  const result = {
    dom,
    tabFocusOrder,
    navigationNodes,
  }

  if (!dom.ok) fail('Expanded mobile dock accessibility check could not read dock DOM', result)
  if (dom.ariaHidden !== 'true' || !dom.inert) {
    fail('Expanded mobile dock is not hidden from accessibility and sequential focus', result)
  }
  if (dom.pointerEvents !== 'none' || Number(dom.opacity) !== 0) {
    fail('Expanded mobile dock visual hit-surface state changed unexpectedly', result)
  }
  if (dom.focusedDockName) {
    fail('Expanded mobile dock accepted programmatic focus while inert', result)
  }
  if (tabDockEntries.length) {
    fail('Expanded mobile dock appeared in sequential keyboard focus order', result)
  }
  if (navigationNodes.length) {
    fail('Expanded mobile dock navigation leaked into the accessibility tree', result)
  }

  return result
}

const runConfiguredAppExpandedDockRestoreCheck = async (send) => {
  const close = await evaluateCdpValue(
    send,
    `(() => {
      const group = document.querySelector('[data-group-name="Group 01"]');
      group?.click();

      return {
        ok: Boolean(group),
        hash: location.hash,
      };
    })()`,
    'configured app expanded dock restore close action',
  )
  if (!close.ok || !close.hash.includes('#/proxies')) {
    fail('Expanded mobile dock restore could not close the expanded proxy group', close)
  }

  const dom = await waitForCdpValue(
    send,
    `(() => {
      const dock = document.querySelector('.dock-shell');
      const firstDockButton = document.querySelector('.dock-button');
      const nestedScroll = document.querySelector('.proxies-scrollable-parent[data-expanded-ready="true"]');
      const dockStyle = dock ? getComputedStyle(dock) : null;
      firstDockButton?.focus();

      const focusedDockName = document.activeElement
        ?.closest?.('.dock-button')
        ?.getAttribute('aria-label') || '';
      const opacity = Number(dockStyle?.opacity || '0');

      return {
        ok:
          Boolean(dock && firstDockButton) &&
          !nestedScroll &&
          dock?.getAttribute('aria-hidden') !== 'true' &&
          !dock?.inert &&
          dockStyle?.pointerEvents !== 'none' &&
          opacity > 0.95 &&
          focusedDockName === 'Proxies',
        ariaHidden: dock?.getAttribute('aria-hidden') || '',
        inert: Boolean(dock?.inert),
        pointerEvents: dockStyle?.pointerEvents || '',
        opacity: dockStyle?.opacity || '',
        focusedDockName,
        activeName: document.querySelector('.dock-active')?.getAttribute('aria-label') || '',
        nestedReady: Boolean(nestedScroll),
      };
    })()`,
    'configured app expanded dock restore DOM state',
  )

  await send('Accessibility.enable')
  const tree = await send('Accessibility.getFullAXTree')
  const navigationNodes = (tree.nodes || [])
    .map(readAxNode)
    .filter((node) => !node.ignored && node.role === 'navigation' && node.name === 'Main navigation')
  const result = {
    close,
    dom,
    navigationNodes,
  }

  if (dom.ariaHidden || dom.inert) {
    fail('Expanded mobile dock hidden accessibility state persisted after closing', result)
  }
  if (dom.pointerEvents === 'none' || Number(dom.opacity) <= 0.95) {
    fail('Expanded mobile dock visual hit-surface state did not restore after closing', result)
  }
  if (dom.focusedDockName !== 'Proxies' || dom.activeName !== 'Proxies') {
    fail('Expanded mobile dock focus and active route state did not restore after closing', result)
  }
  if (!navigationNodes.length) {
    fail('Expanded mobile dock navigation did not return to the accessibility tree after closing', result)
  }

  return result
}

const runConfiguredAppPageKeyboardTraversalCheck = async (send) => {
  const setup = await evaluateCdpValue(
    send,
    `(() => {
      const scroller = document.querySelector('#proxies-scrollable-page');
      const dock = document.querySelector('.dock-shell');
      if (scroller) scroller.scrollTop = 0;
      const focusableSelector = [
        'button',
        'input',
        'select',
        'textarea',
        'a[href]',
        '[tabindex]:not([tabindex="-1"])',
      ].join(',');
      const isVisible = (element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          style.visibility !== 'hidden' &&
          style.display !== 'none'
        );
      };
      const pageFocusables = Array.from(document.querySelectorAll(focusableSelector)).filter(
        (element) =>
          !element.closest('.dock-shell') &&
          !element.disabled &&
          element.getAttribute('aria-disabled') !== 'true' &&
          isVisible(element),
      );
      pageFocusables[0]?.focus();
      return {
        hash: location.hash,
        scrollerTop: scroller?.scrollTop ?? -1,
        dockVisible: dock ? getComputedStyle(dock).pointerEvents !== 'none' : false,
        pageFocusableCount: pageFocusables.length,
        activeTag: document.activeElement?.tagName || '',
      };
    })()`,
    'configured app page keyboard traversal setup',
  )

  if (!setup.hash.includes('#/proxies') || !setup.dockVisible || setup.scrollerTop !== 0) {
    fail('Configured app page keyboard traversal setup failed', setup)
  }

  const readFocusExpression = `(() => {
    const element = document.activeElement;
    const dockButton = element?.closest?.('.dock-button') || null;
    const dockShell = document.querySelector('.dock-shell');
    const dockRect = dockShell?.getBoundingClientRect();
    const rect = element?.getBoundingClientRect();
    const style = element ? getComputedStyle(element) : null;
    const text = element?.textContent?.replace(/\\s+/g, ' ').trim() || '';
    const label =
      element?.getAttribute?.('aria-label') ||
      element?.getAttribute?.('title') ||
      element?.getAttribute?.('placeholder') ||
      element?.getAttribute?.('name') ||
      (text.length <= 80 ? text : text.slice(0, 80)) ||
      element?.id ||
      '';
    return {
      tag: element?.tagName || '',
      type: element?.getAttribute?.('type') || '',
      role: element?.getAttribute?.('role') || '',
      label,
      dockName: dockButton?.getAttribute('aria-label') || '',
      inDock: Boolean(dockButton),
      visible: Boolean(
        rect &&
          rect.width > 0 &&
          rect.height > 0 &&
          style?.visibility !== 'hidden' &&
          style?.display !== 'none'
      ),
      disabled: Boolean(element?.disabled || element?.getAttribute?.('aria-disabled') === 'true'),
      rect: rect
        ? {
            top: Number(rect.top.toFixed(2)),
            bottom: Number(rect.bottom.toFixed(2)),
            height: Number(rect.height.toFixed(2)),
            width: Number(rect.width.toFixed(2)),
          }
        : null,
      dockTop: dockRect ? Number(dockRect.top.toFixed(2)) : 0,
      outlineStyle: style?.outlineStyle || '',
      outlineWidth: style?.outlineWidth || '',
      boxShadow: style?.boxShadow || '',
    };
  })()`
  const focusOrder = [
    await evaluateCdpValue(send, readFocusExpression, 'configured app page initial focus'),
  ]

  for (let index = 1; index < 80; index += 1) {
    await dispatchKeyboardKey(send, 'Tab', { code: 'Tab', windowsVirtualKeyCode: 9 })
    const focus = await evaluateCdpValue(
      send,
      readFocusExpression,
      `configured app page Tab ${index}`,
    )
    focusOrder.push(focus)
    if (focus.inDock) break
  }

  const pageFocusOrder = focusOrder.filter((focus) => !focus.inDock)
  const dockEntry = focusOrder.find((focus) => focus.inDock)
  const unlabeled = pageFocusOrder.filter((focus) => !focus.label)
  const invisible = pageFocusOrder.filter((focus) => !focus.visible || focus.disabled)
  const occluded = pageFocusOrder.filter(
    (focus) => focus.rect && focus.dockTop && focus.rect.bottom > focus.dockTop - 4,
  )
  const roles = new Set(pageFocusOrder.map((focus) => focus.role || focus.tag.toLowerCase()))

  if (!dockEntry) {
    fail('Configured app page keyboard traversal did not reach the mobile dock', {
      setup,
      focusOrder,
    })
  }
  if (pageFocusOrder.length < 8) {
    fail('Configured app page keyboard traversal skipped expected page controls before dock', {
      setup,
      focusOrder,
    })
  }
  if (!roles.has('a') || !roles.has('button')) {
    fail('Configured app page keyboard traversal missed an expected control type', {
      setup,
      roles: Array.from(roles),
      focusOrder,
    })
  }
  if (unlabeled.length) {
    fail('Configured app page keyboard traversal found unlabeled focus targets', {
      unlabeled,
      focusOrder,
    })
  }
  if (invisible.length) {
    fail('Configured app page keyboard traversal found invisible or disabled focus targets', {
      invisible,
      focusOrder,
    })
  }
  if (occluded.length) {
    fail('Configured app page keyboard traversal found focus targets under the dock', {
      occluded,
      focusOrder,
    })
  }
  if (dockEntry.dockName !== 'Proxies') {
    fail('Configured app page keyboard traversal entered the dock at the wrong target', {
      dockEntry,
      focusOrder,
    })
  }

  return {
    pageFocusCount: pageFocusOrder.length,
    firstPageFocus: pageFocusOrder[0],
    lastPageFocus: pageFocusOrder.at(-1),
    dockEntry,
    roles: Array.from(roles),
    focusOrder,
  }
}

const runConfiguredAppDockKeyboardCheck = async (send) => {
  const expectedOrder = ['Proxies', 'Connections', 'Logs', 'Rules', 'Settings']
  const setup = await evaluateCdpValue(
    send,
    `(() => {
      const buttons = Array.from(document.querySelectorAll('.dock-button'));
      const first = buttons[0];
      first?.focus();
      return {
        names: buttons.map((button) => button.getAttribute('aria-label') || ''),
        focusedName: document.activeElement?.getAttribute('aria-label') || '',
        activeName: document.querySelector('.dock-active')?.getAttribute('aria-label') || '',
      };
    })()`,
    'configured app dock keyboard setup',
  )

  if (JSON.stringify(setup.names) !== JSON.stringify(expectedOrder)) {
    fail('Configured app dock keyboard order changed', { setup, expectedOrder })
  }
  if (setup.focusedName !== 'Proxies' || setup.activeName !== 'Proxies') {
    fail('Configured app dock keyboard setup did not focus the active Proxies button', setup)
  }

  const tabOrder = [setup.focusedName]
  for (let index = 1; index < expectedOrder.length; index += 1) {
    await dispatchKeyboardKey(send, 'Tab', { code: 'Tab', windowsVirtualKeyCode: 9 })
    const focusedName = await evaluateCdpValue(
      send,
      `document.activeElement?.getAttribute('aria-label') || ''`,
      `configured app dock Tab ${index}`,
    )
    tabOrder.push(focusedName)
  }

  if (JSON.stringify(tabOrder) !== JSON.stringify(expectedOrder)) {
    fail('Configured app dock Tab order is inconsistent', { tabOrder, expectedOrder })
  }

  await dispatchKeyboardKey(send, 'Tab', { code: 'Tab', windowsVirtualKeyCode: 9, modifiers: 8 })
  const reverseTabName = await evaluateCdpValue(
    send,
    `document.activeElement?.getAttribute('aria-label') || ''`,
    'configured app dock Shift+Tab',
  )
  if (reverseTabName !== 'Rules') {
    fail('Configured app dock Shift+Tab did not move focus backward', { reverseTabName, tabOrder })
  }

  await evaluateCdpValue(
    send,
    `(() => {
      const button = Array.from(document.querySelectorAll('.dock-button')).find(
        (item) => item.getAttribute('aria-label') === 'Connections',
      );
      button?.focus();
      return document.activeElement?.getAttribute('aria-label') || '';
    })()`,
    'configured app focus Connections',
  )
  await dispatchKeyboardKey(send, 'Enter', {
    code: 'Enter',
    windowsVirtualKeyCode: 13,
    text: '\r',
    raw: true,
  })
  const enterActivation = await waitForCdpValue(
    send,
    `(() => {
      const active = document.querySelector('.dock-active')?.getAttribute('aria-label') || '';
      return {
        ok: location.hash.includes('#/connections') && active === 'Connections',
        hash: location.hash,
        activeName: active,
        focusedName: document.activeElement?.getAttribute('aria-label') || '',
      };
    })()`,
    'configured app dock Enter activation',
  )

  await evaluateCdpValue(
    send,
    `(() => {
      const button = Array.from(document.querySelectorAll('.dock-button')).find(
        (item) => item.getAttribute('aria-label') === 'Proxies',
      );
      button?.focus();
      return document.activeElement?.getAttribute('aria-label') || '';
    })()`,
    'configured app focus Proxies',
  )
  await dispatchKeyboardKey(send, ' ', {
    code: 'Space',
    windowsVirtualKeyCode: 32,
    text: ' ',
    raw: true,
  })
  const spaceActivation = await waitForCdpValue(
    send,
    `(() => {
      const active = document.querySelector('.dock-active')?.getAttribute('aria-label') || '';
      return {
        ok: location.hash.includes('#/proxies') && active === 'Proxies',
        hash: location.hash,
        activeName: active,
        focusedName: document.activeElement?.getAttribute('aria-label') || '',
      };
    })()`,
    'configured app dock Space activation',
  )

  return {
    tabOrder,
    reverseTabName,
    enterActivation,
    spaceActivation,
  }
}

const getAxValue = (payload) => payload?.value ?? payload?.description ?? ''

const getAxProperty = (node, name) => node.properties?.find((property) => property.name === name)?.value

const readAxNode = (node) => ({
  role: getAxValue(node.role),
  name: getAxValue(node.name),
  current: getAxValue(getAxProperty(node, 'current')),
  selected: getAxValue(getAxProperty(node, 'selected')),
  ignored: Boolean(node.ignored),
})

const runConfiguredAppDockAccessibilityCheck = async (send) => {
  const expectedOrder = ['Proxies', 'Connections', 'Logs', 'Rules', 'Settings']

  await send('Accessibility.enable')
  const tree = await send('Accessibility.getFullAXTree')
  const nodes = tree.nodes || []
  const nodeById = new Map(nodes.map((node) => [node.nodeId, node]))
  const readableNodes = nodes.map(readAxNode).filter((node) => !node.ignored)
  const navigationNode = nodes.find((node) => {
    const readable = readAxNode(node)
    return !readable.ignored && readable.role === 'navigation' && readable.name === 'Main navigation'
  })
  const navigation = navigationNode ? readAxNode(navigationNode) : null
  const collectSubtree = (node, collected = []) => {
    if (!node) return collected
    collected.push(node)
    for (const childId of node.childIds || []) collectSubtree(nodeById.get(childId), collected)
    return collected
  }
  const navigationSubtree = collectSubtree(navigationNode)
  const dockButtons = navigationSubtree
    .map(readAxNode)
    .filter(
      (node) => !node.ignored && node.role === 'button' && expectedOrder.includes(node.name),
    )
  const buttonNames = dockButtons.map((node) => node.name)
  const activeButton = dockButtons.find((node) => node.name === 'Proxies')
  const labelDescendantNames = navigationSubtree
    .map(readAxNode)
    .filter(
      (node) =>
        !node.ignored &&
        node.role !== 'button' &&
        node.name &&
        expectedOrder.includes(node.name),
    )
    .map((node) => node.name)
  const extraNamedNodes = navigationSubtree
    .map(readAxNode)
    .filter(
      (node) =>
        !node.ignored &&
        node.role !== 'navigation' &&
        node.role !== 'button' &&
        node.name &&
        !expectedOrder.includes(node.name),
    )
    .map((node) => ({ role: node.role, name: node.name }))
  const domSemantics = await evaluateCdpValue(
    send,
    `(() => {
      const dock = document.querySelector('.dock-shell');
      const buttons = Array.from(document.querySelectorAll('.dock-button'));
      return {
        navigationLabel: dock?.getAttribute('aria-label') || '',
        buttonNames: buttons.map((button) => button.getAttribute('aria-label') || ''),
        activeName: document.querySelector('.dock-active')?.getAttribute('aria-label') || '',
        activeAriaCurrent: document.querySelector('.dock-active')?.getAttribute('aria-current') || '',
        hiddenIconCount: document.querySelectorAll('.dock-button [aria-hidden="true"]').length,
      };
    })()`,
    'configured app dock accessibility DOM semantics',
  )

  if (!navigation) {
    fail('Configured app dock navigation landmark is missing from the accessibility tree', {
      navigationCandidates: readableNodes.filter((node) => node.role === 'navigation'),
      domSemantics,
    })
  }
  if (JSON.stringify(buttonNames) !== JSON.stringify(expectedOrder)) {
    fail('Configured app dock accessibility button order changed', {
      buttonNames,
      expectedOrder,
      dockButtons,
      domSemantics,
    })
  }
  if (!activeButton || (activeButton.current && activeButton.current !== 'page')) {
    fail('Configured app dock active button current state changed in the accessibility tree', {
      activeButton,
      dockButtons,
      domSemantics,
    })
  }
  if (domSemantics.activeName !== 'Proxies' || domSemantics.activeAriaCurrent !== 'page') {
    fail('Configured app dock active DOM current semantics changed', domSemantics)
  }
  if (domSemantics.hiddenIconCount < expectedOrder.length) {
    fail('Configured app dock icons are no longer hidden from assistive technology', domSemantics)
  }
  if (extraNamedNodes.length) {
    fail('Configured app dock icons leaked extra named nodes into the accessibility tree', {
      labelDescendantNames,
      extraNamedNodes,
      dockButtons,
      domSemantics,
    })
  }

  return {
    navigation,
    buttonNames,
    activeCurrent: activeButton?.current || '',
    activeSelected: activeButton?.selected || '',
    labelDescendantNames,
    extraNamedNodes,
    domSemantics,
  }
}

const captureAppScreenshot = async (send, name) => {
  const screenshot = await send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: false,
  })
  const image = Buffer.from(screenshot.data || '', 'base64')

  if (image.length < 10000) {
    fail('Configured app screenshot capture is unexpectedly small', {
      name,
      bytes: image.length,
    })
  }

  await mkdir(screenshotRoot, { recursive: true })
  const filePath = join(screenshotRoot, `${name}.png`)
  await writeFile(filePath, image)

  return {
    path: filePath,
    bytes: image.length,
  }
}

const assertAppDockSafeArea = (dock, message, details = {}) => {
  const shell = dock.shell || {}
  const viewport = dock.viewport || {}

  if (
    dock.safeAreaGap < 0 ||
    dock.safeAreaGap > 24 ||
    shell.width < 300 ||
    shell.width > 330 ||
    shell.bottom > viewport.height ||
    shell.top < 0 ||
    dock.bottom > viewport.height ||
    dock.top < 0 ||
    viewport.width < 389 ||
    viewport.width > 391 ||
    viewport.height < 843 ||
    viewport.height > 845
  ) {
    fail(message, details)
  }
}

const assertAppDockLabels = (labels, message, details = {}) => {
  const labelOverflow = labels.filter(
    (label) =>
      label.labelWidth <= 0 ||
      label.labelHeight <= 0 ||
      label.labelLeft < label.buttonLeft - 0.5 ||
      label.labelRight > label.buttonRight + 0.5 ||
      label.labelBottom > label.buttonBottom - 4 ||
      label.overflowX !== 'hidden' ||
      label.textOverflow !== 'ellipsis' ||
      label.whiteSpace !== 'nowrap' ||
      label.scrollWidth > label.clientWidth + 1,
  )
  const labelOverlaps = labels.filter((label, index) => {
    const nextLabel = labels[index + 1]
    return nextLabel && label.labelRight > nextLabel.labelLeft + 0.5
  })

  if (labelOverflow.length || labelOverlaps.length) {
    fail(message, {
      ...details,
      labelOverflow,
      labelOverlaps,
    })
  }
}

const main = async () => {
  let server
  try {
    const sourceChecks = await assertSourceChecks()
    const builtCssFile = await getLatestBuiltCssFile()
    const buildChecks = await assertBuildChecks(builtCssFile)

    if (shouldServeOnly || shouldRunFixtureBrowser || shouldRunAppBrowser || shouldRunProviderGroupedAppBrowser) {
      server = await startServer()
    }

    if (shouldServeOnly) {
      console.log(
        JSON.stringify(
          {
            pass: true,
            server: 'running',
            fixtureUrl: `${baseUrl}/__scroll-fixture`,
            sourceChecks,
            buildChecks,
          },
          null,
          2,
        ),
      )
      await waitForShutdown()
      return
    }

    if (shouldRunFixtureBrowser) {
      const browserChecks = await runEdgeCdpFixtureCheck(builtCssFile)
      console.log(JSON.stringify({ ...browserChecks, sourceChecks, buildChecks }, null, 2))
      return
    }

    if (shouldRunAppBrowser) {
      const browserChecks = await runEdgeCdpAppCheck(builtCssFile)
      const expandedBrowserChecks = await runEdgeCdpAppCheck(builtCssFile, {
        expandedMobileGroup: true,
      })
      console.log(
        JSON.stringify(
          {
            ...browserChecks,
            expandedMobileGroupChecks: expandedBrowserChecks,
            sourceChecks,
            buildChecks,
          },
          null,
          2,
        ),
      )
      return
    }

    if (shouldRunProviderGroupedAppBrowser) {
      const browserChecks = await runEdgeCdpAppCheck(builtCssFile, { providerGrouped: true })
      console.log(JSON.stringify({ ...browserChecks, sourceChecks, buildChecks }, null, 2))
      return
    }

    console.log(
      JSON.stringify(
        {
          pass: true,
          browser: 'skipped',
          reason: 'Set ZASHBOARD_SCROLL_VERIFY_FIXTURE_BROWSER=1 to run the Edge CDP scroll fixture',
          sourceChecks,
          buildChecks,
        },
        null,
        2,
      ),
    )
  } catch (error) {
    console.error(
      JSON.stringify(
        {
          pass: false,
          message: error.message,
          details: {
            ...error.details,
            servedRequests,
          },
        },
        null,
        2,
      ),
    )
    process.exitCode = 1
  } finally {
    if (server && !shouldServeOnly) await closeServer(server)
  }
}

main()
