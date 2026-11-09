// pnpm build && pnpm test:setup
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { connectBrowser, sleep, waitFor } from './lib/cdp.mjs'
import { launchChrome } from './lib/chrome.mjs'
import { DIST_DIR } from './lib/harness.mjs'
import { findFreePort } from './lib/ports.mjs'
import { serveDirectory } from './lib/static-server.mjs'
import { createMockServer } from './mock-server.mjs'

const SECRET = 'test-secret'
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': '*',
}

const assets = await serveDirectory(DIST_DIR)
const mock = await createMockServer({ groups: 2, nodes: 2, connections: 0 })

const forward = async (res, upstream, path, headers = {}) => {
  const response = await fetch(upstream + path)
  res.writeHead(response.status, {
    'content-type': response.headers.get('content-type') || '',
    ...headers,
  })
  res.end(Buffer.from(await response.arrayBuffer()))
}

const answerVersion = async (mode, req, res, headers = {}) => {
  if (mode === 'delayed') await sleep(1000)
  if (mode === 'offline') return res.socket.destroy()
  if (mode === 'html') {
    res.writeHead(200, { 'content-type': 'text/html', ...headers })
    return res.end('<!doctype html><html>Dashboard</html>')
  }
  if (mode === 'invalid') {
    res.writeHead(200, { 'content-type': 'application/json', ...headers })
    return res.end(JSON.stringify({ status: 'ok' }))
  }
  if (
    mode === 'unauthorized' ||
    mode === 'delayed' ||
    (mode === 'secret' && req.headers.authorization !== `Bearer ${SECRET}`)
  ) {
    res.writeHead(401, headers)
    return res.end('{}')
  }
  return forward(res, mock.url, req.url, headers)
}

const state = { origin: 'offline', local: 'offline', originProbes: 0, localProbes: 0 }

const originServer = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname
  if (path === '/version') {
    state.originProbes++
    return answerVersion(state.origin, req, res)
  }
  if (path.startsWith('/ui/')) return forward(res, assets.url, req.url.slice(3))
  return forward(res, mock.url, req.url)
})

const localServer = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS)
    return res.end()
  }
  const path = new URL(req.url, 'http://localhost').pathname
  if (path === '/version') {
    state.localProbes++
    return answerVersion(state.local, req, res, CORS)
  }
  return forward(res, mock.url, req.url, CORS)
})

const listen = (server) =>
  new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)))
const originPort = String(await listen(originServer))
const localPort = await listen(localServer)
const origin = `http://127.0.0.1:${originPort}`
const debuggingPort = await findFreePort()
const chrome = await launchChrome({
  port: debuggingPort,
  args: [`--host-resolver-rules=MAP 127.0.0.1:9090 127.0.0.1:${localPort}`],
})
const browser = await connectBrowser(debuggingPort)

const savedBackend = {
  uuid: 'saved',
  type: 'clash',
  protocol: 'http',
  host: '127.0.0.1',
  port: String(mock.port),
  password: '',
  secondaryPath: '',
  label: '',
}

const readForm = (page) =>
  page.evaluateJson(`JSON.stringify({
    host: document.querySelector('input[placeholder="127.0.0.1"]')?.value,
    port: document.querySelector('input[placeholder="9090"]')?.value,
    password: document.querySelector('input[type="password"]')?.value,
    submitDisabled: document.querySelector('button.btn-primary')?.disabled,
  })`)

const readBackends = (page) => page.evaluateJson(`localStorage.getItem('setup/api-list')`)

const run = async (
  name,
  {
    origin: originMode = 'offline',
    local = 'offline',
    query = '',
    initial = [],
    active = initial[0]?.uuid || '',
    edit = false,
    login,
    form,
    probes,
  },
) => {
  Object.assign(state, { origin: originMode, local, originProbes: 0, localProbes: 0 })
  const page = await browser.newPage()
  try {
    await page.call('Page.addScriptToEvaluateOnNewDocument', {
      source: `localStorage.clear();
        localStorage.setItem('setup/api-list', ${JSON.stringify(JSON.stringify(initial))});
        localStorage.setItem('setup/active-uuid', ${JSON.stringify(active)});`,
    })
    await page.goto(`${origin}/ui/${query}`)

    if (edit) {
      assert.notEqual(await waitFor(() => state.originProbes > 0), null, 'origin was not probed')
      await page.evaluate(`(() => {
        const input = document.querySelector('input[placeholder="127.0.0.1"]');
        input.value = 'edited.example';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      })()`)
    }

    if (login) {
      assert.notEqual(
        await waitFor(() =>
          page.evaluate(
            `location.hash.includes('proxies') && !!localStorage.getItem('setup/active-uuid')`,
          ),
        ),
        null,
        'did not log in',
      )
      const backends = await readBackends(page)
      assert.equal(backends.length, initial.length || 1)
      const active = await page.evaluate(`localStorage.getItem('setup/active-uuid')`)
      const backend = backends.find((item) => item.uuid === active)
      assert.ok(backend, 'active backend is not saved')
      assert.deepEqual(
        Object.fromEntries(Object.keys(login).map((key) => [key, backend[key]])),
        login,
      )
    } else {
      await waitFor(async () => {
        const current = await readForm(page)
        return current.host === form.host && current.port === form.port
      })
      await sleep(1500)
      const current = await readForm(page)
      const expected = { submitDisabled: true, ...form }
      assert.deepEqual(
        Object.fromEntries(Object.keys(expected).map((key) => [key, current[key]])),
        expected,
      )
      assert.equal(await page.evaluate(`location.hash.includes('setup')`), true)
      assert.deepEqual(await readBackends(page), initial)
    }

    if (probes) {
      const probed = { origin: state.originProbes > 0, local: state.localProbes > 0 }
      assert.deepEqual(
        Object.fromEntries(Object.keys(probes).map((key) => [key, probed[key]])),
        probes,
        'unexpected probes',
      )
    }
    console.log(`✓ ${name}`)
  } finally {
    await page.close()
  }
}

const explicit = (port, extra = '') => `hostname=127.0.0.1&port=${port}${extra}`

try {
  console.log('URL parameters')
  await run('search backend logs in before origin and 127.0.0.1', {
    origin: 'online',
    local: 'online',
    query: `?${explicit(mock.port)}`,
    login: { host: '127.0.0.1', port: String(mock.port) },
    probes: { origin: false },
  })
  await run('hash backend logs in', {
    query: `#/setup?${explicit(mock.port)}`,
    login: { host: '127.0.0.1', port: String(mock.port) },
    probes: { origin: false },
  })
  await run('backend options come from the URL', {
    local: 'secret',
    query: `?${explicit(9090, `&secret=${SECRET}&label=Home&disableTunMode=1&disableUpgradeCore=1`)}`,
    login: {
      port: '9090',
      password: SECRET,
      label: 'Home',
      disableTunMode: true,
      disableUpgradeCore: true,
    },
    probes: { origin: false, local: true },
  })
  await run('unreachable URL backend stays on setup', {
    origin: 'online',
    query: `?${explicit(9090)}`,
    form: { host: '127.0.0.1', port: '9090' },
    probes: { origin: false, local: true },
  })
  await run('URL backend with a wrong secret stays on setup', {
    local: 'secret',
    query: `?${explicit(9090, '&secret=wrong')}`,
    form: { host: '127.0.0.1', port: '9090' },
    probes: { origin: false, local: true },
  })
  await run('URL backend switches to a matching saved backend', {
    query: `?${explicit(mock.port)}`,
    initial: [
      savedBackend,
      { ...savedBackend, uuid: 'url', disableTunMode: false, disableUpgradeCore: false },
    ],
    active: '',
    login: { uuid: 'url' },
  })

  console.log('URL shapes')
  for (const [name, query] of [
    ['search before #/setup', `?${explicit(mock.port)}#/setup`],
    ['search before #/proxies', `?${explicit(mock.port)}#/proxies`],
    ['hash query on #/proxies', `#/proxies?${explicit(mock.port)}`],
    ['hash query on #/', `#/?${explicit(mock.port)}`],
    ['index.html with search', `index.html?${explicit(mock.port)}#/setup`],
  ]) {
    await run(`URL backend from ${name}`, {
      origin: 'online',
      query,
      login: { host: '127.0.0.1', port: String(mock.port) },
      probes: { origin: false },
    })
  }
  await run('URL backend split between search and hash', {
    local: 'secret',
    query: `?secret=${SECRET}#/setup?${explicit(9090)}`,
    login: { port: '9090', password: SECRET },
    probes: { origin: false },
  })
  for (const [name, query] of [
    ['search before #/proxies', `?secret=${SECRET}#/proxies`],
    ['hash query on #/proxies', `#/proxies?secret=${SECRET}`],
  ]) {
    await run(`origin secret from ${name}`, {
      origin: 'secret',
      query,
      login: { port: originPort, password: SECRET },
    })
  }

  console.log('Same origin')
  await run('origin logs in', {
    origin: 'online',
    login: { host: '127.0.0.1', port: originPort, password: '' },
  })
  await run('origin wins over 127.0.0.1', {
    origin: 'online',
    local: 'online',
    login: { port: originPort },
    probes: { origin: true, local: true },
  })
  await run('origin uses the secret parameter', {
    origin: 'secret',
    query: `?secret=${SECRET}`,
    login: { port: originPort, password: SECRET },
  })
  await run('origin uses other URL options', {
    origin: 'online',
    query: '?label=Home&disableTunMode=1',
    login: { port: originPort, label: 'Home', disableTunMode: true },
  })
  await run('protocol and port parameters do not change the origin', {
    origin: 'online',
    query: `?protocol=https&port=${mock.port}`,
    login: { protocol: 'http', host: '127.0.0.1', port: originPort },
    probes: { origin: true },
  })
  await run('unauthorized origin keeps the origin form over 127.0.0.1', {
    origin: 'unauthorized',
    local: 'online',
    form: { host: '127.0.0.1', port: originPort },
  })
  await run('wrong origin secret keeps the entered secret', {
    origin: 'secret',
    local: 'online',
    query: '?secret=wrong',
    form: { host: '127.0.0.1', port: originPort, password: 'wrong' },
  })

  console.log('127.0.0.1:9090')
  for (const mode of ['offline', 'html', 'invalid']) {
    await run(`127.0.0.1 logs in when origin is ${mode}`, {
      origin: mode,
      local: 'online',
      login: { host: '127.0.0.1', port: '9090' },
      probes: { origin: true, local: true },
    })
  }
  await run('unauthorized 127.0.0.1 keeps the default form', {
    local: 'unauthorized',
    form: { host: '127.0.0.1', port: '9090' },
  })
  await run('nothing reachable shows the default form', {
    origin: 'html',
    form: { host: '127.0.0.1', port: '9090' },
    probes: { origin: true, local: true },
  })

  console.log('Saved backends')
  await run('active saved backend wins', {
    origin: 'online',
    local: 'online',
    initial: [savedBackend],
    login: { uuid: 'saved' },
    probes: { origin: false, local: false },
  })
  await run('saved backends without an active one disable auto login', {
    origin: 'online',
    local: 'online',
    initial: [savedBackend],
    active: '',
    form: { host: '127.0.0.1', port: '9090', submitDisabled: false },
    probes: { origin: false, local: true },
  })

  console.log('Manual edits')
  await run('editing during detection cancels auto login', {
    origin: 'delayed',
    local: 'online',
    edit: true,
    form: { host: 'edited.example', port: originPort },
  })
} finally {
  browser.close()
  await chrome.close()
  for (const server of [originServer, localServer]) {
    server.closeAllConnections()
    await new Promise((resolve) => server.close(resolve))
  }
  await assets.close()
  await mock.close()
}
