import { createServer } from 'node:http'
import { createReadStream, existsSync } from 'node:fs'
import { mkdir, mkdtemp, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, extname, join, normalize, resolve, sep } from 'node:path'
import { tmpdir } from 'node:os'
import { readFile } from 'node:fs/promises'
import { execFileSync, spawn } from 'node:child_process'

const root = resolve(process.cwd(), 'dist')
const sourceRoot = resolve(process.cwd(), 'src')
const constantRoot = resolve(process.cwd(), 'src', 'constant')
const servedRequests = []
const args = new Set(process.argv.slice(2))
const shouldRunBrowserCheck = process.env.ZASHBOARD_DOCK_VERIFY_BROWSER === '1' || args.has('--browser')
const shouldRunUnstableBrowserCli =
  process.env.ZASHBOARD_DOCK_VERIFY_UNSTABLE_CLI === '1' || args.has('--unstable-cli')
const shouldServeOnly = process.env.ZASHBOARD_DOCK_VERIFY_SERVER_ONLY === '1' || args.has('--server-only')
const shouldRunFixtureBrowser = process.env.ZASHBOARD_DOCK_VERIFY_FIXTURE_BROWSER === '1' || args.has('--fixture-browser')
const defaultPort = shouldRunBrowserCheck || shouldRunUnstableBrowserCli ? 4192 : 4193
const port = Number(process.env.ZASHBOARD_DOCK_VERIFY_PORT || defaultPort)
const baseUrl = `http://localhost:${port}`
const screenshotRoot = resolve(
  process.env.ZASHBOARD_DOCK_VERIFY_SCREENSHOT_DIR || join(process.cwd(), 'output', 'verify-mobile-dock'),
)
const npxCliPath = join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npx-cli.js')
const npxCommand = process.platform === 'win32' && existsSync(npxCliPath) ? process.execPath : 'npx'
const npxCommandPrefix = npxCommand === process.execPath ? [npxCliPath] : []
const runNpxCli = (args, options = {}) =>
  execFileSync(npxCommand, [...npxCommandPrefix, ...args], {
    ...options,
  })
const toPlaywrightCliCode = (code) => code.trim().replace(/\s+/g, ' ')
const expectedDarkDockThemes = [
  'dark',
  'dark-monet',
  'dark-daisyui5',
  'black',
  'business',
  'night',
  'dim',
  'dracula',
  'forest',
  'halloween',
  'abyss',
  'sunset',
]

const getVerifiedSourceChecks = (themeClassification) => ({
  navSemantics: true,
  decorativeIcons: true,
  focusVisibleRule: true,
  lightThemeBackgroundRule: true,
  darkThemeBackgroundRule: true,
  lightThemesExcludedFromDarkDockRule: true,
  allThemesClassifiedForDock: true,
  darkDockThemes: themeClassification.darkDockThemes,
  lightDockThemes: themeClassification.lightDockThemes,
})

const getVerifiedBuildChecks = (builtCssFile, themeClassification) => ({
  builtCssFile,
  focusVisibleRule: true,
  lightThemeBackgroundRule: true,
  darkThemeBackgroundRule: true,
  lightThemesExcludedFromDarkDockRule: true,
  allThemesClassifiedForDock: true,
  darkDockThemes: themeClassification.darkDockThemes,
  lightDockThemes: themeClassification.lightDockThemes,
})

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

const mockBackend = {
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
  providers: { providers: {} },
  proxies: {
    proxies: {
      GLOBAL: {
        name: 'GLOBAL',
        type: 'Selector',
        now: 'DIRECT',
        all: ['DIRECT', 'REJECT'],
        history: [],
        udp: true,
      },
      DIRECT: { name: 'DIRECT', type: 'Direct', history: [], udp: true },
      REJECT: { name: 'REJECT', type: 'Reject', history: [], udp: false },
    },
  },
  rules: { rules: [] },
  version: { version: 'Meta-Dock-Verify' },
}

const getSetupScript = () => {
  const backend = {
    host: 'localhost',
    port: String(port),
    secondaryPath: '',
    password: '',
    protocol: 'http',
    uuid: 'dock-verify',
    label: 'Dock Verify',
  }

  return `<script>
localStorage.setItem('setup/api-list', ${JSON.stringify(JSON.stringify([backend]))});
localStorage.setItem('setup/active-uuid', ${JSON.stringify(JSON.stringify('dock-verify'))});
localStorage.setItem('config/default-theme', ${JSON.stringify(JSON.stringify('light'))});
localStorage.setItem('config/dark-theme', ${JSON.stringify(JSON.stringify('dark'))});
localStorage.setItem('config/auto-theme', ${JSON.stringify(JSON.stringify(false))});
localStorage.setItem('config/language', ${JSON.stringify(JSON.stringify('en-US'))});
</script>`
}

const readText = (path) => readFile(path, 'utf8')

const getDockFixtureHtml = async () => {
  const builtCssFile = await getLatestBuiltCssFile()

  return `<!doctype html>
<html lang="en" data-theme="light">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="/assets/${builtCssFile}">
  <style>
    body {
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(180deg, var(--color-base-100), var(--color-base-200));
    }
    .dock-fixture-frame {
      position: relative;
      width: 390px;
      height: 844px;
      max-width: 100vw;
      margin: 0 auto;
      overflow: hidden;
      background: var(--color-base-100);
    }
    .dock-shell {
      top: auto;
    }
  </style>
</head>
<body>
  <main class="dock-fixture-frame" aria-label="Mobile dock fixture">
    <nav class="dock-shell transition-opacity duration-200 ease-out" aria-label="Main navigation">
      <div class="dock dock-xs h-[52px]">
        ${['Overview', 'Proxies', 'Rules', 'Connections', 'Settings']
          .map(
            (name, index) => `<button class="dock-button h-[52px] flex-col items-center justify-center pt-1.5 ${index === 1 ? 'dock-active' : ''}" type="button" aria-label="${name}" ${
              index === 1 ? 'aria-current="page"' : ''
            }>
              <svg class="dock-icon h-5 w-5 flex-shrink-0" aria-hidden="true" focusable="false" viewBox="0 0 20 20"><circle cx="10" cy="10" r="4"></circle></svg>
              <span class="dock-label">${name}</span>
            </button>`,
          )
          .join('')}
      </div>
    </nav>
  </main>
</body>
</html>`
}

const getLatestBuiltCssFile = async () => {
  if (!existsSync(root)) fail('Build output is missing; run npm run build before dock verification')

  const assetsRoot = join(root, 'assets')
  if (!existsSync(assetsRoot)) fail('Built assets directory is missing; run npm run build before dock verification')

  const indexCssFiles = (await readdir(assetsRoot)).filter((file) => /^index-.*\.css$/.test(file))
  if (!indexCssFiles.length) fail('Built index CSS file is missing; run npm run build before dock verification')

  const filesWithStats = await Promise.all(
    indexCssFiles.map(async (file) => ({
      file,
      mtimeMs: (await stat(join(assetsRoot, file))).mtimeMs,
    })),
  )

  return filesWithStats.sort((a, b) => b.mtimeMs - a.mtimeMs)[0]?.file || null
}

const runPlaywrightCliBrowserCheck = async (
  sessionName,
  targetUrl,
  builtCssFile,
  sourceThemeClassification,
  buildThemeClassification,
) => {
  const browserCode = `
    async () => {
      const waitForSelector = (selector, timeout = 15000) =>
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

      await waitForSelector('nav.dock-shell .dock-button');

        const nav = document.querySelector('nav.dock-shell');
        const dock = document.querySelector('.dock');
        const buttons = Array.from(document.querySelectorAll('.dock-button'));
        const active = document.querySelector('.dock-button[aria-current="page"]');
        const names = buttons.map((button) => button.getAttribute('aria-label'));
        const iconHidden = buttons.every((button) => {
          const icon = button.querySelector('.dock-icon');
          return icon?.getAttribute('aria-hidden') === 'true' && icon?.getAttribute('focusable') === 'false';
        });

        buttons[0]?.focus();

        const focused = document.activeElement;
        const focusStyle = focused ? getComputedStyle(focused) : null;
        const dockStyle = dock ? getComputedStyle(dock) : null;

        return {
          activeAriaCurrent: active?.getAttribute('aria-current') || '',
          activeName: active?.getAttribute('aria-label') || '',
          buttonCount: buttons.length,
          dockBackground: dockStyle?.backgroundColor || '',
          dockHeight: dock?.getBoundingClientRect().height || 0,
          dockWidth: dock?.getBoundingClientRect().width || 0,
          focusedAriaLabel: focused?.getAttribute('aria-label') || '',
          focusOutlineColor: focusStyle?.outlineColor || '',
          focusOutlineStyle: focusStyle?.outlineStyle || '',
          focusOutlineWidth: focusStyle?.outlineWidth || '',
          iconHidden,
          navAriaLabel: nav?.getAttribute('aria-label') || '',
          names,
        };
    }
  `

  runNpxCli(
    [
      '--yes',
      '--package',
      '@playwright/cli',
      'playwright-cli',
      '--session',
      sessionName,
      'open',
      targetUrl,
      '--browser',
      'msedge',
    ],
    { stdio: 'ignore', timeout: 30000 },
  )

  try {
    const raw = runNpxCli(
      [
        '--yes',
        '--package',
        '@playwright/cli',
        'playwright-cli',
        '--session',
        sessionName,
        'eval',
        toPlaywrightCliCode(browserCode),
      ],
      { encoding: 'utf8', timeout: 60000 },
    )

    const parsed = parsePlaywrightCliResult(raw)

    if (parsed.navAriaLabel !== 'Main navigation') fail('Dock nav label mismatch', parsed)
    if (parsed.buttonCount < 5) fail('Dock rendered too few route buttons', parsed)
    if (!parsed.names.every(Boolean)) fail('Dock button accessible names missing', parsed)
    if (parsed.activeAriaCurrent !== 'page') fail('Active dock route lacks aria-current=page', parsed)
    if (parsed.activeName !== 'Proxies') fail('Active dock route should be Proxies on #/proxies', parsed)
    if (!parsed.iconHidden) fail('Dock icons are not consistently decorative', parsed)
    if (parsed.focusedAriaLabel !== 'Overview') fail('First dock button did not receive focus', parsed)
    if (parsed.focusOutlineStyle === 'none' || parsed.focusOutlineWidth === '0px') {
      fail('Focused dock button has no visible outline', parsed)
    }
    if (parsed.dockHeight < 50 || parsed.dockHeight > 58) fail('Dock height changed unexpectedly', parsed)
    if (parsed.dockWidth < 300 || parsed.dockWidth > 330) fail('Dock width changed unexpectedly', parsed)

    const lightColor = parseRgb(parsed.dockBackground)
    if (!lightColor) fail('Could not parse light dock background', parsed)
    assertLightDockColor(lightColor, 'Light dock background no longer matches the expected frosted light plate', parsed)

    const darkRaw = runNpxCli(
      [
        '--yes',
        '--package',
        '@playwright/cli',
        'playwright-cli',
        '--session',
        sessionName,
        'eval',
        toPlaywrightCliCode(`async () => {
          document.documentElement.setAttribute('data-theme', 'dark')
          const dock = document.querySelector('.dock')
          if (!dock) throw new Error('Dock element is missing')
          await new Promise((resolve) => requestAnimationFrame(resolve))
          return getComputedStyle(dock).backgroundColor
        }`),
      ],
      { encoding: 'utf8', timeout: 60000 },
    )

    const darkBackground = parsePlaywrightCliResult(darkRaw)
    const darkColor = parseRgb(darkBackground)
    if (!darkColor) fail('Could not parse dark dock background', { ...parsed, darkBackground })
    assertDarkDockColor(darkColor, 'Dark dock background does not match expected frosted dark plate', {
      ...parsed,
      darkBackground,
    })

    return {
      pass: true,
      browser: 'cli',
      sourceChecks: getVerifiedSourceChecks(sourceThemeClassification),
      buildChecks: getVerifiedBuildChecks(builtCssFile, buildThemeClassification),
      lightDockBackground: parsed.dockBackground,
      darkDockBackground: darkBackground,
      navAriaLabel: parsed.navAriaLabel,
      activeName: parsed.activeName,
      buttonCount: parsed.buttonCount,
      focusOutline: {
        color: parsed.focusOutlineColor,
        style: parsed.focusOutlineStyle,
        width: parsed.focusOutlineWidth,
      },
      dockBox: {
        height: parsed.dockHeight,
        width: parsed.dockWidth,
      },
    }
  } finally {
    try {
      runNpxCli(
        ['--yes', '--package', '@playwright/cli', 'playwright-cli', '--session', sessionName, 'close'],
        { stdio: 'ignore', timeout: 15000 },
      )
    } catch {
      // best effort cleanup
    }
  }
}

const serveFile = async (req, res) => {
  const url = new URL(req.url || '/', baseUrl)
  const pathname = decodeURIComponent(url.pathname)
  servedRequests.push(pathname)

  if (pathname === '/__dock-fixture') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    res.end(await getDockFixtureHtml())
    return
  }

  if (pathname === '/version') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify(mockBackend.version))
    return
  }
  if (pathname === '/configs') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify(mockBackend.configs))
    return
  }
  if (pathname === '/proxies') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify(mockBackend.proxies))
    return
  }
  if (pathname === '/providers/proxies' || pathname === '/providers/rules') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify(mockBackend.providers))
    return
  }
  if (pathname === '/rules') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify(mockBackend.rules))
    return
  }

  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '')
  const filePath = normalize(join(root, relativePath))

  if (!filePath.startsWith(root + sep) && filePath !== root) {
    res.writeHead(403)
    res.end('Forbidden')
    return
  }

  const target = existsSync(filePath) ? filePath : join(root, 'index.html')
  const contentType = mimeTypes[extname(target)] || 'application/octet-stream'

  res.writeHead(200, { 'content-type': contentType })
  if (extname(target) === '.html') {
    const html = await readFile(target, 'utf8')
    res.end(html.replace('<head>', `<head>${getSetupScript()}`))
    return
  }

  createReadStream(target).pipe(res)
}

const startServer = () =>
  new Promise((resolveServer, rejectServer) => {
    const server = createServer(serveFile)
    server.once('error', rejectServer)
    server.listen(port, () => resolveServer(server))
  })

const closeServer = (server) =>
  new Promise((resolveClose) => {
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

const runEdgeCdpFixtureCheck = async (builtCssFile, sourceThemeClassification, buildThemeClassification) => {
  const edgePath = getEdgeExecutable()
  if (!edgePath) fail('Microsoft Edge executable could not be located')

  const cdpPort = Number(process.env.ZASHBOARD_DOCK_VERIFY_CDP_PORT || 9233)
  const userDataDir = await mkdtemp(join(tmpdir(), 'zashboard-dock-cdp-'))
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
  const edge = spawn(
    edgePath,
    edgeArgs,
    { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true },
  )
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
      url: `${baseUrl}/__dock-fixture`,
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
    await send('Page.navigate', { url: `${baseUrl}/__dock-fixture` })
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

      await waitForSelector('nav.dock-shell .dock-button');
      const dock = document.querySelector('.dock');
      const nav = document.querySelector('nav.dock-shell');
      const buttons = Array.from(document.querySelectorAll('.dock-button'));
      const waitForDockReady = (timeout = 10000) =>
        new Promise((resolve, reject) => {
          const startedAt = performance.now();
          const tick = () => {
            const rect = dock?.getBoundingClientRect();
            const style = dock ? getComputedStyle(dock) : null;
            if (rect?.width >= 300 && rect?.width <= 330 && rect?.height >= 50 && rect?.height <= 58 && style?.backgroundColor) {
              resolve();
              return;
            }
            if (performance.now() - startedAt > timeout) {
              reject(new Error('Timed out waiting for dock geometry to stabilize'));
              return;
            }
            requestAnimationFrame(tick);
          };
          tick();
        });
      const hitTestElement = (element) => {
        const rect = element.getBoundingClientRect();
        const x = Math.max(1, Math.min(window.innerWidth - 1, rect.left + rect.width / 2));
        const y = Math.max(1, Math.min(window.innerHeight - 1, rect.top + rect.height / 2));
        const hit = document.elementFromPoint(x, y);
        return {
          x: Number(x.toFixed(2)),
          y: Number(y.toFixed(2)),
          width: Number(rect.width.toFixed(2)),
          height: Number(rect.height.toFixed(2)),
          hitTag: hit?.tagName || '',
          hitDockButtonName: hit?.closest('.dock-button')?.getAttribute('aria-label') || '',
          hitDockShell: Boolean(hit?.closest('.dock-shell')),
        };
      };
      const readLabelRects = () =>
        buttons.map((button) => {
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
      const readDock = () => {
        const style = getComputedStyle(dock);
        const box = dock.getBoundingClientRect();
        const navBox = nav.getBoundingClientRect();
        const frameBox = document.querySelector('.dock-fixture-frame').getBoundingClientRect();
        return {
          backgroundColor: style.backgroundColor,
          backdropFilter: style.backdropFilter || style.webkitBackdropFilter || '',
          height: box.height,
          width: box.width,
          top: box.top,
          bottom: box.bottom,
          safeAreaGap: Number((frameBox.bottom - box.bottom).toFixed(2)),
          shell: {
            height: navBox.height,
            width: navBox.width,
            top: navBox.top,
            bottom: navBox.bottom,
          },
          frame: {
            height: frameBox.height,
            width: frameBox.width,
            top: frameBox.top,
            bottom: frameBox.bottom,
          },
        };
      };
      await waitForDockReady();
      const light = readDock();
      document.documentElement.setAttribute('data-theme', 'dark');
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const dark = readDock();
      document.documentElement.setAttribute('data-theme', 'light');
      buttons[0]?.focus();
      const focusStyle = getComputedStyle(document.activeElement);
      return {
        navAriaLabel: nav?.getAttribute('aria-label') || '',
        activeName: document.querySelector('[aria-current="page"]')?.getAttribute('aria-label') || '',
        activeAriaCurrent: document.querySelector('[aria-current="page"]')?.getAttribute('aria-current') || '',
        buttonCount: buttons.length,
        buttonNames: buttons.map((button) => button.getAttribute('aria-label')),
        iconHidden: buttons.every((button) => {
          const icon = button.querySelector('.dock-icon');
          return icon?.getAttribute('aria-hidden') === 'true' && icon?.getAttribute('focusable') === 'false';
        }),
        focusedName: document.activeElement?.getAttribute('aria-label') || '',
        focusOutlineStyle: focusStyle.outlineStyle,
        focusOutlineWidth: focusStyle.outlineWidth,
          light,
          dark,
          labelRects: readLabelRects(),
          buttonHitTargets: buttons.map((button) => ({
            expectedName: button.getAttribute('aria-label') || '',
            ...hitTestElement(button),
          })),
        };
      }`
    const evaluation = await send('Runtime.evaluate', {
      expression: `(${expression})()`,
      awaitPromise: true,
      returnByValue: true,
    })

    if (evaluation.exceptionDetails) fail('Edge CDP fixture evaluation failed', evaluation.exceptionDetails)

    const parsed = evaluation.result.value
    if (parsed.navAriaLabel !== 'Main navigation') fail('Fixture dock nav label mismatch', parsed)
    if (parsed.buttonCount !== 5) fail('Fixture dock rendered unexpected route button count', parsed)
    if (!parsed.buttonNames.every(Boolean)) fail('Fixture dock button accessible names missing', parsed)
    if (parsed.activeAriaCurrent !== 'page' || parsed.activeName !== 'Proxies') {
      fail('Fixture active route semantics mismatch', parsed)
    }
    if (!parsed.iconHidden) fail('Fixture dock icons are not decorative', parsed)
    if (parsed.focusedName !== 'Overview') fail('Fixture first dock button did not receive focus', parsed)
    if (parsed.focusOutlineStyle === 'none' || parsed.focusOutlineWidth === '0px') {
      fail('Fixture focused dock button has no visible outline', parsed)
    }
    const undersizedButtons = parsed.buttonHitTargets.filter(
      (button) => button.width < 44 || button.height < 44,
    )
    if (undersizedButtons.length) fail('Fixture dock buttons are below the 44px touch target floor', parsed)
    const missedButtonHits = parsed.buttonHitTargets.filter(
      (button) => button.hitDockButtonName !== button.expectedName || !button.hitDockShell,
    )
    if (missedButtonHits.length) fail('Fixture dock button centers are not top hit targets', parsed)
    assertDockLabels(parsed.labelRects, 'Fixture dock labels overlap or overflow their buttons', parsed)

    const lightColor = parseRgb(parsed.light.backgroundColor)
    const darkColor = parseRgb(parsed.dark.backgroundColor)
    if (!lightColor || !darkColor) fail('Fixture dock background colors could not be parsed', parsed)
    assertDockBounds(parsed.light, 'Fixture light dock dimensions changed unexpectedly', parsed)
    assertDockBounds(parsed.dark, 'Fixture dark dock dimensions changed unexpectedly', parsed)
    assertDockSafeArea(parsed.light, 'Fixture light dock safe-area geometry changed unexpectedly', parsed)
    assertDockSafeArea(parsed.dark, 'Fixture dark dock safe-area geometry changed unexpectedly', parsed)
    assertLightDockColor(
      lightColor,
      'Fixture light dock background no longer matches the expected frosted light plate',
      parsed,
    )
    assertDarkDockColor(darkColor, 'Fixture dark dock background does not match expected frosted dark plate', parsed)
    const lightScreenshot = await captureDockScreenshot(send, 'light')
    await send('Runtime.evaluate', {
      expression: "document.documentElement.setAttribute('data-theme', 'dark')",
    })
    await delay(50)
    const darkScreenshot = await captureDockScreenshot(send, 'dark')

    return {
      pass: true,
      browser: 'edge-cdp-fixture',
      browserVersion: version.Browser,
      sourceChecks: getVerifiedSourceChecks(sourceThemeClassification),
      buildChecks: getVerifiedBuildChecks(builtCssFile, buildThemeClassification),
      fixtureUrl: `${baseUrl}/__dock-fixture`,
      navAriaLabel: parsed.navAriaLabel,
      activeName: parsed.activeName,
      buttonCount: parsed.buttonCount,
      focusOutline: {
        style: parsed.focusOutlineStyle,
        width: parsed.focusOutlineWidth,
      },
      buttonHitTargets: parsed.buttonHitTargets,
      labelRects: parsed.labelRects,
      lightDock: parsed.light,
      darkDock: parsed.dark,
      screenshots: {
        light: lightScreenshot,
        dark: darkScreenshot,
      },
      servedRequests: servedRequests.slice(-20),
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

const captureDockScreenshot = async (send, themeName) => {
  const screenshot = await send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: false,
  })
  const image = Buffer.from(screenshot.data || '', 'base64')

  if (image.length < 10000) {
    fail('Fixture dock screenshot capture is unexpectedly small', {
      themeName,
      bytes: image.length,
    })
  }

  await mkdir(screenshotRoot, { recursive: true })
  const filePath = join(screenshotRoot, `dock-fixture-${themeName}.png`)
  await writeFile(filePath, image)

  return {
    path: filePath,
    bytes: image.length,
  }
}

const rgbDistance = (a, b) =>
  Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2)

const assertDockBounds = (dock, message, details = {}) => {
  if (dock.height < 50 || dock.height > 58 || dock.width < 300 || dock.width > 330) {
    fail(message, details)
  }
}

const assertDockSafeArea = (dock, message, details = {}) => {
  const shell = dock.shell || {}
  const frame = dock.frame || {}

  if (
    dock.safeAreaGap < 0 ||
    dock.safeAreaGap > 24 ||
    shell.width < 300 ||
    shell.width > 330 ||
    shell.bottom > frame.bottom ||
    shell.top < frame.top ||
    dock.bottom > frame.bottom ||
    dock.top < frame.top ||
    frame.width < 389 ||
    frame.width > 391 ||
    frame.height < 843 ||
    frame.height > 845
  ) {
    fail(message, details)
  }
}

const assertDockLabels = (labels, message, details = {}) => {
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

const assertLightDockColor = (color, message, details = {}) => {
  const expectedLight = { r: 255, g: 255, b: 255 }

  if (rgbDistance(color, expectedLight) > 2 || color.a < 0.65 || color.a > 0.8) {
    fail(message, {
      ...details,
      parsedLight: color,
    })
  }
}

const assertDarkDockColor = (color, message, details = {}) => {
  const expectedDark = { r: 28, g: 28, b: 30 }

  if (rgbDistance(color, expectedDark) > 2 || color.a < 0.25 || color.a > 0.4) {
    fail(message, {
      ...details,
      parsedDark: color,
    })
  }
}

const parseRgb = (value) => {
  const match = value.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/)
  if (match) {
    return {
      r: Number(match[1]),
      g: Number(match[2]),
      b: Number(match[3]),
      a: match[4] === undefined ? 1 : Number(match[4]),
    }
  }

  const srgbMatch = value.match(
    /color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)/,
  )
  if (!srgbMatch) return null

  return {
    r: Number(srgbMatch[1]) * 255,
    g: Number(srgbMatch[2]) * 255,
    b: Number(srgbMatch[3]) * 255,
    a: srgbMatch[4] === undefined ? 1 : Number(srgbMatch[4]),
  }
}

const extractAllThemesFromConstantSource = (source) => {
  const allThemeMatch = source.match(/export\s+const\s+ALL_THEME\s*=\s*\[([\s\S]*?)\]\s*$/m)
  if (!allThemeMatch?.[1]) fail('ALL_THEME source list could not be located')

  const themes = [...allThemeMatch[1].matchAll(/['"]([^'"]+)['"]/g)].map((match) => match[1])
  const uniqueThemes = [...new Set(themes)]

  if (!uniqueThemes.length) fail('ALL_THEME source list is empty')

  return uniqueThemes
}

const extractDarkDockRuleThemes = (css) => {
  const darkDockRules = [...css.matchAll(/([^{}]+)\{[^{}]*rgb\(28 28 30\s*\/\s*var\(--dock-bg-alpha,\s*(?:0?\.)?32\)\)[^{}]*\}/g)]

  if (!darkDockRules.length) {
    return []
  }

  return [
    ...new Set(
      darkDockRules.flatMap((rule) =>
        [...rule[1].matchAll(/\[data-theme=(?:"([^"]+)"|'([^']+)'|([^\]\s]+))\]/g)].map(
          (match) => match[1] || match[2] || match[3],
        ),
      ),
    ),
  ]
}

const assertDockThemeClassification = (css, allThemes, label) => {
  const darkDockThemes = extractDarkDockRuleThemes(css)

  if (!darkDockThemes.length) {
    fail('Dark dock background rule could not be located', { label })
  }

  const unknownDarkThemes = darkDockThemes.filter((themeName) => !allThemes.includes(themeName))
  if (unknownDarkThemes.length) {
    fail('Dark dock rule includes themes that are not in ALL_THEME', {
      label,
      themes: unknownDarkThemes,
    })
  }

  const missingDarkThemes = expectedDarkDockThemes.filter((themeName) => !darkDockThemes.includes(themeName))
  if (missingDarkThemes.length) {
    fail('Expected dark themes are missing from the dark dock background rule', {
      label,
      themes: missingDarkThemes,
    })
  }

  const expectedDarkThemeSet = new Set(expectedDarkDockThemes)
  const unexpectedDarkThemes = darkDockThemes.filter((themeName) => !expectedDarkThemeSet.has(themeName))
  if (unexpectedDarkThemes.length) {
    fail('Light-side themes are included in the dark dock background rule', {
      label,
      themes: unexpectedDarkThemes,
    })
  }

  const lightDockThemes = allThemes.filter((themeName) => !expectedDarkThemeSet.has(themeName))
  if (!lightDockThemes.length) {
    fail('No light-side dock themes were classified', { label })
  }

  return {
    allThemes,
    darkDockThemes,
    lightDockThemes,
  }
}

const parsePlaywrightCliResult = (raw) => {
  const output = raw.trim()

  try {
    return JSON.parse(output)
  } catch {
    const result = output.match(/### Result\s*([\s\S]*?)(?:\r?\n### |\s*$)/)
    if (result?.[1]) return JSON.parse(result[1].trim())

    fail('Playwright CLI did not return a JSON result', {
      output: output.slice(0, 1000),
    })
  }
}

const isPlaywrightCliEnvironmentError = (error) => {
  const output = error.details?.output || ''

  return (
    error.code === 'ETIMEDOUT' ||
    error.signal === 'SIGTERM' ||
    error.message.includes('Command failed') ||
    output.includes('navigation to finish') ||
    output.includes('page.goto: Timeout') ||
    output.includes('page.waitForSelector: Timeout')
  )
}

let server
let browser

try {
  const [homePage, componentsCss, constantsSource] = await Promise.all([
    readText(join(sourceRoot, 'views', 'HomePage.vue')),
    readText(join(sourceRoot, 'assets', 'styles', 'components.css')),
    readText(join(constantRoot, 'index.ts')),
  ])

  const builtCssFile = await getLatestBuiltCssFile()

  if (
    !homePage.includes('<nav') ||
    !homePage.includes(':aria-label="$t(\'mainNavigation\')"') ||
    !homePage.includes(':aria-current="r === route.name ? \'page\' : undefined"')
  ) {
    fail('HomePage dock source is missing nav or aria-current semantics')
  }
  if (
    !homePage.includes('type="button"') ||
    !homePage.includes(':aria-label="$t(r)"') ||
    !homePage.includes('aria-hidden="true"') ||
    !homePage.includes('focusable="false"')
  ) {
    fail('HomePage dock source is missing decorative icon semantics')
  }
  if (!componentsCss.includes('.dock-button:focus-visible')) {
    fail('Dock focus-visible source rule is missing')
  }
  if (
    !componentsCss.includes('height: 44px !important') ||
    !componentsCss.includes('min-height: 44px !important')
  ) {
    fail('Dock button source touch target floor is missing')
  }
  if (
    !componentsCss.includes('text-ellipsis') ||
    !componentsCss.includes('whitespace-nowrap') ||
    !componentsCss.includes('letter-spacing: 0')
  ) {
    fail('Dock label source overflow guard is missing')
  }
  if (!componentsCss.includes('var(--color-base-100) var(--dock-bg-tint, 72%)')) {
    fail('Light dock source background rule is missing')
  }
  if (!componentsCss.includes('rgb(28 28 30 / var(--dock-bg-alpha, 0.32))')) {
    fail('Dark dock source background override is missing')
  }
  const allThemes = extractAllThemesFromConstantSource(constantsSource)
  const sourceThemeClassification = assertDockThemeClassification(componentsCss, allThemes, 'source CSS')

  const builtCss = await readText(join(root, 'assets', builtCssFile))
  if (!builtCss.includes('.dock-button:focus-visible')) {
    fail('Built CSS is missing dock focus-visible rule', { builtCssFile })
  }
  if (!builtCss.includes('height:44px!important') || !builtCss.includes('min-height:44px!important')) {
    fail('Built CSS is missing dock button touch target floor', { builtCssFile })
  }
  if (
    !builtCss.includes('text-overflow:ellipsis') ||
    !builtCss.includes('white-space:nowrap') ||
    !builtCss.includes('letter-spacing:0')
  ) {
    fail('Built CSS is missing dock label overflow guard', { builtCssFile })
  }
  if (!builtCss.includes('var(--color-base-100) var(--dock-bg-tint,72%)')) {
    fail('Built CSS is missing light dock rule', { builtCssFile })
  }
  if (!builtCss.includes('rgb(28 28 30/var(--dock-bg-alpha,.32))')) {
    fail('Built CSS is missing dark dock rule', { builtCssFile })
  }
  const buildThemeClassification = assertDockThemeClassification(builtCss, allThemes, `built CSS ${builtCssFile}`)

  let result
  if (shouldRunFixtureBrowser) {
    server = await startServer()
    result = await runEdgeCdpFixtureCheck(
      builtCssFile,
      sourceThemeClassification,
      buildThemeClassification,
    )
  } else if (shouldServeOnly) {
    server = await startServer()
    console.log(
      JSON.stringify(
        {
          pass: true,
          server: 'ready',
          baseUrl,
          fixtureUrl: `${baseUrl}/__dock-fixture`,
          sourceChecks: getVerifiedSourceChecks(sourceThemeClassification),
          buildChecks: getVerifiedBuildChecks(builtCssFile, buildThemeClassification),
        },
        null,
        2,
      ),
    )
    await waitForShutdown()
    result = null
  } else if (!shouldRunBrowserCheck) {
    result = {
      pass: true,
      browser: 'skipped',
      reason: 'Set ZASHBOARD_DOCK_VERIFY_BROWSER=1 to run Playwright CLI browser checks',
      sourceChecks: getVerifiedSourceChecks(sourceThemeClassification),
      buildChecks: getVerifiedBuildChecks(builtCssFile, buildThemeClassification),
      servedRequests: [],
    }
  } else if (process.platform === 'win32' && !shouldRunUnstableBrowserCli) {
    result = {
      pass: true,
      browser: 'skipped',
      reason:
        'Windows Playwright CLI browser execution is disabled by default because npx/npm child-process execution can return without JSON output; set ZASHBOARD_DOCK_VERIFY_UNSTABLE_CLI=1 to attempt it',
      sourceChecks: getVerifiedSourceChecks(sourceThemeClassification),
      buildChecks: getVerifiedBuildChecks(builtCssFile, buildThemeClassification),
      servedRequests: [],
    }
  } else {
    server = await startServer()

    try {
      result = await runPlaywrightCliBrowserCheck(
        `dock-verify-${process.pid}`,
        `${baseUrl}/#/proxies`,
        builtCssFile,
        sourceThemeClassification,
        buildThemeClassification,
      )
    } catch (error) {
      if (!isPlaywrightCliEnvironmentError(error)) throw error

      result = {
        pass: true,
        browser: 'skipped',
        reason: error.message,
        output: error.details?.output?.slice(0, 1000) || '',
        sourceChecks: getVerifiedSourceChecks(sourceThemeClassification),
        buildChecks: getVerifiedBuildChecks(builtCssFile, buildThemeClassification),
        servedRequests: servedRequests.slice(-20),
      }
    }
  }

  if (result) console.log(JSON.stringify(result, null, 2))
} catch (error) {
  console.error(
    JSON.stringify(
      {
        pass: false,
        message: error.message,
        details: {
          ...(error.details || {}),
          servedRequests: servedRequests.slice(-20),
        },
      },
      null,
      2,
    ),
  )
  process.exitCode = 1
} finally {
  await browser?.close().catch(() => {})
  if (server) {
    await closeServer(server).catch(() => {})
  }
}
