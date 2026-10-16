// pnpm build && node test/setup.mjs
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { connectBrowser, sleep, waitFor } from './lib/cdp.mjs'
import { launchChrome } from './lib/chrome.mjs'
import { DIST_DIR } from './lib/harness.mjs'
import { findFreePort } from './lib/ports.mjs'
import { serveDirectory } from './lib/static-server.mjs'
import { createMockServer } from './mock-server.mjs'

const assets = await serveDirectory(DIST_DIR)
const mock = await createMockServer({ groups: 2, nodes: 2, connections: 0 })
let mode = 'online'
let originProbes = 0
const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname
  if (path === '/version') {
    originProbes++
    if (mode === 'delayed') await new Promise((resolve) => setTimeout(resolve, 1000))
    if (mode === 'html') return res.end('<!doctype html><html>Dashboard</html>')
    if (mode === 'invalid') return res.end(JSON.stringify({ status: 'ok' }))
    if (
      mode === 'unauthorized' ||
      mode === 'delayed' ||
      (mode === 'secret' && req.headers.authorization !== 'Bearer test-secret')
    ) {
      res.writeHead(401)
      return res.end('{}')
    }
  }
  const upstream = path.startsWith('/ui/') ? assets.url : mock.url
  const target = path.startsWith('/ui/') ? req.url.slice(3) : req.url
  const response = await fetch(upstream + target)
  res.writeHead(response.status, { 'content-type': response.headers.get('content-type') || '' })
  res.end(Buffer.from(await response.arrayBuffer()))
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${server.address().port}`
const debuggingPort = await findFreePort()
const chrome = await launchChrome({ port: debuggingPort })
const browser = await connectBrowser(debuggingPort)

const saved = {
  uuid: 'saved',
  type: 'clash',
  protocol: 'http',
  host: '127.0.0.1',
  port: String(mock.port),
  password: '',
  secondaryPath: '',
  label: '',
}

const run = async (
  name,
  {
    response = 'online',
    query = '',
    initial = [],
    edit = false,
    port,
    password = '',
    label = '',
    form,
  } = {},
) => {
  mode = response
  originProbes = 0
  const page = await browser.newPage()
  try {
    await page.call('Network.setBlockedURLs', { urls: ['http://127.0.0.1:9090/*'] })
    await page.call('Page.addScriptToEvaluateOnNewDocument', {
      source: `localStorage.clear();
        localStorage.setItem('setup/api-list', ${JSON.stringify(JSON.stringify(initial))});
        localStorage.setItem('setup/active-uuid', ${JSON.stringify(initial[0]?.uuid || '')});`,
    })
    await page.goto(`${origin}/ui/${query}`)
    if (edit) {
      assert.notEqual(await waitFor(() => originProbes > 0), null)
      await page.evaluate(`(() => {
        const input = document.querySelector('input[placeholder="127.0.0.1"]');
        input.value = 'edited.example';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      })()`)
      await sleep(1500)
    }
    if (port) {
      assert.notEqual(await waitFor(() => page.evaluate(`location.hash.includes('proxies')`)), null)
      const backends = await page.evaluateJson(`localStorage.getItem('setup/api-list')`)
      assert.equal(backends.length, 1)
      assert.equal(backends[0].port, String(port))
      assert.equal(backends[0].password, password)
      assert.equal(backends[0].label, label)
    } else {
      const [host, expectedPort] =
        form ?? (edit ? ['edited.example', String(server.address().port)] : ['127.0.0.1', '9090'])
      assert.notEqual(
        await waitFor(() =>
          page.evaluate(`
        document.querySelector('input[placeholder="127.0.0.1"]')?.value === ${JSON.stringify(host)} &&
        document.querySelector('input[placeholder="9090"]')?.value === ${JSON.stringify(expectedPort)} &&
        document.querySelector('button.btn-primary')?.disabled
      `),
        ),
        null,
      )
      assert.equal(await page.evaluate(`location.hash.includes('setup')`), true)
      assert.equal(await page.evaluate(`localStorage.getItem('setup/api-list')`), '[]')
    }
    if (query.includes('hostname=') || query.includes('port=') || initial.length) {
      assert.equal(originProbes, 0)
    }
    console.log(`✓ ${name}`)
  } finally {
    await page.close()
  }
}

try {
  await run('same-origin API', { port: server.address().port })
  await run('same-origin API with secret', {
    response: 'secret',
    query: '?secret=test-secret',
    port: server.address().port,
    password: 'test-secret',
  })
  await run('same-origin API with query options', {
    query: '?label=Home&disableTunMode=1',
    port: server.address().port,
    label: 'Home',
  })
  await run('unauthorized origin keeps origin form', {
    response: 'unauthorized',
    form: ['127.0.0.1', String(server.address().port)],
  })
  await run('HTML response falls back', { response: 'html' })
  await run('unrelated JSON falls back', { response: 'invalid' })
  await run('explicit search backend wins', {
    query: `?hostname=127.0.0.1&port=${mock.port}`,
    port: mock.port,
  })
  await run('explicit hash backend wins', {
    query: `#/setup?hostname=127.0.0.1&port=${mock.port}`,
    port: mock.port,
  })
  await run('port parameter overrides origin port', {
    query: `?port=${mock.port}`,
    port: mock.port,
  })
  await run('saved backend wins', { initial: [saved], port: mock.port })
  await run('manual edits survive a pending origin probe', { response: 'delayed', edit: true })
} finally {
  browser.close()
  await chrome.close()
  await new Promise((resolve) => {
    server.closeAllConnections()
    server.close(resolve)
  })
  await assets.close()
  await mock.close()
}
