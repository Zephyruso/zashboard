// Run the real history store with browser/storage dependencies replaced; no browser or build needed.
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import test from 'node:test'
import { nextTick, shallowRef } from 'vue'

const types = ['sourceIP', 'destination', 'process', 'outbound', 'proxyGroup']
const listeners = new Map()
const timers = []
const writes = []
const originalGlobals = Object.fromEntries(
  ['document', 'window', 'setInterval'].map((key) => [
    key,
    Object.getOwnPropertyDescriptor(globalThis, key),
  ]),
)
const fixture = {
  closedBatch: shallowRef([]),
  activeBackend: shallowRef({ uuid: 'history-test' }),
  ConnectionHistoryType: Object.fromEntries(
    ['SourceIP', 'Destination', 'Process', 'Outbound', 'ProxyGroup'].map((key, i) => [
      key,
      types[i],
    ]),
  ),
  getConnectionSourceIP: (connection) => connection.metadata.sourceIP,
  getConnectionHostname: (connection) => connection.metadata.host,
  getProcessFromConnection: (connection) => connection.metadata.process,
  getConnectionChains: (connection) => connection.chains,
  getConnectionDownload: (connection) => connection.download,
  getConnectionUpload: (connection) => connection.upload,
  getConnectionHistoryFromIndexedDB: async () => [],
  saveConnectionHistoryToIndexedDB: async (uuid, type, data) => {
    writes.push({ uuid, type, data })
  },
  clearConnectionHistoryFromIndexedDB: async () => {},
}

globalThis.__connectionHistoryTest = fixture
globalThis.document = {
  hidden: false,
  addEventListener: (event, callback) => listeners.set(event, callback),
}
globalThis.window = { addEventListener: () => {} }
globalThis.setInterval = (callback) => timers.push(callback)

const storeUrl = new URL('../src/store/conn-history.ts', import.meta.url).href
const mockUrl = `data:text/javascript,${encodeURIComponent(
  `export const { ${Object.keys(fixture).join(', ')} } = globalThis.__connectionHistoryTest`,
)}`
const dependencies = new Set([
  '@/assembly/connections',
  '@/helper',
  '@/helper/indexeddb',
  './setup',
])
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL === storeUrl && dependencies.has(specifier)) {
      return { url: mockUrl, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
})

const connection = (index) => ({
  id: `connection-${index}`,
  metadata: {
    sourceIP: `192.168.${index >> 8}.${index & 255}`,
    host: `10.0.${index >> 8}.${index & 255}`,
    process: `process-${index}`,
  },
  chains: [`outbound-${index}`, `group-${index}`],
  download: index + 1,
  upload: 1,
})

try {
  const history = await import(storeUrl)
  const tick = () => timers[0]()
  const view = () => history.aggregatedDataMap.value
  const send = async (batch) => {
    fixture.closedBatch.value = batch
    await nextTick()
  }
  const reset = async () => {
    document.hidden = false
    await history.initAggregatedDataMap()
    writes.length = 0
  }

  await test('background history stays bounded without persistence timer ticks', async () => {
    await reset()
    document.hidden = true
    listeners.get('visibilitychange')()

    for (const offset of [0, 5000, 10000, 15000]) {
      await send(Array.from({ length: 5000 }, (_, index) => connection(offset + index)))
    }
    assert.ok(
      types.every((type) => view()[type].length === 0),
      'hidden views stay unchanged',
    )

    // The first visible tick refreshes the view, but does not flush/trim via the 30s timer.
    document.hidden = false
    tick()
    for (const type of types) {
      assert.equal(view()[type].length, 1500, `${type} retains only the largest entries`)
      assert.ok(view()[type].some((entry) => entry.download === 20000))
    }
    assert.equal(writes.length, 0, 'capacity limits do not depend on IndexedDB writes')
  })

  await test('threshold, download ranking, and accumulated totals are preserved', async () => {
    await reset()
    await send(Array.from({ length: 2000 }, (_, index) => connection(index)))
    tick()
    assert.ok(types.every((type) => view()[type].length === 2000))

    await send([connection(2000)])
    tick()
    for (const type of types) {
      assert.equal(view()[type].length, 1500)
      assert.ok(view()[type].every((entry) => entry.download >= 502))
    }

    await send([{ ...connection(2000), download: 9, upload: 4 }])
    tick()
    for (const type of types) {
      const entry = view()[type].find((entry) => entry.download === 2010)
      assert.ok(entry)
      assert.equal(entry.upload, 5)
      assert.equal(entry.count, 2)
    }
  })
} finally {
  hooks.deregister()
  delete globalThis.__connectionHistoryTest
  for (const [key, descriptor] of Object.entries(originalGlobals)) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor)
    else delete globalThis[key]
  }
}
