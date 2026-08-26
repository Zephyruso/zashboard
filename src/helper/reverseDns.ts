import { queryDNS } from '@/assembly/config'
import { resolveClientHostname } from '@/store/settings'
import { activeBackend } from '@/store/setup'
import * as ipaddr from 'ipaddr.js'
import { reactive, ref } from 'vue'

interface HostnameEntry {
  // null represents a completed lookup without a PTR answer.
  name: string | null
  ts: number
}

// Positive results are useful across reloads. Negative results are deliberately
// shorter lived and memory-only so a new DHCP lease can acquire a name quickly.
const POSITIVE_TTL = 45 * 60 * 1000
const NEGATIVE_TTL = 10 * 60 * 1000
const CACHE_KEY = 'cache/reverse-dns-hostnames'
const CACHE_CAP = 200

// Private IPs can identify different devices on different backends.
const memoryCache = new Map<string, HostnameEntry>()
const inflight = new Map<string, Promise<string | null>>()
const hostnameState = reactive<Record<string, string>>({})

// Consumers whose labels are built outside a computed/render effect can watch
// this revision to rebuild when an asynchronous hostname arrives.
export const reverseDNSRevision = ref(0)

const parseIP = (ip: string): ipaddr.IPv4 | ipaddr.IPv6 | null => {
  try {
    const address = ipaddr.parse(ip.split('%')[0]!)

    if (address.kind() === 'ipv6') {
      const ipv6 = address as ipaddr.IPv6
      if (ipv6.isIPv4MappedAddress()) return ipv6.toIPv4Address()
    }

    return address
  } catch {
    return null
  }
}

// Skip addresses that cannot provide a useful client hostname. Private and
// public unicast addresses remain eligible; the configured core DNS decides
// which reverse zones it can answer.
export function isResolvableIP(ip: string | undefined): boolean {
  if (!ip) return false

  const address = parseIP(ip)
  if (!address) return false

  return !['unspecified', 'loopback', 'linkLocal'].includes(address.range())
}

export function reverseName(ip: string): string | null {
  const address = parseIP(ip)
  if (!address) return null

  if (address.kind() === 'ipv4') {
    return `${[...(address as ipaddr.IPv4).octets].reverse().join('.')}.in-addr.arpa`
  }

  const nibbles = address
    .toByteArray()
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')

  return `${nibbles.split('').reverse().join('.')}.ip6.arpa`
}

const isExpired = (entry: HostnameEntry, now: number) => {
  const ttl = entry.name === null ? NEGATIVE_TTL : POSITIVE_TTL
  return now - entry.ts > ttl
}

type PersistedCache = Record<string, HostnameEntry>

function readPersistedCache(): PersistedCache {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return {}

    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}

    const cache: PersistedCache = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (
        value &&
        typeof value === 'object' &&
        typeof (value as HostnameEntry).name === 'string' &&
        typeof (value as HostnameEntry).ts === 'number'
      ) {
        cache[key] = value as HostnameEntry
      }
    }

    return cache
  } catch {
    return {}
  }
}

function writePersistedCache(cache: PersistedCache): void {
  try {
    const entries = Object.entries(cache)
      .sort(([, a], [, b]) => a.ts - b.ts)
      .slice(-CACHE_CAP)

    localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(entries)))
  } catch {
    // Resolution is best-effort; storage quota and serialization failures are harmless.
  }
}

function persistPositive(key: string, entry: HostnameEntry): void {
  const cache = readPersistedCache()
  delete cache[key]
  cache[key] = entry
  writePersistedCache(cache)
}

function hydrateMemoryFromPersisted(): void {
  const now = Date.now()

  for (const [key, entry] of Object.entries(readPersistedCache())) {
    if (!isExpired(entry, now)) {
      memoryCache.set(key, entry)
    }
  }
}

hydrateMemoryFromPersisted()

const pendingPromotions = new Set<string>()

function promote(key: string, name: string): void {
  if (hostnameState[key] === name || pendingPromotions.has(key)) return

  pendingPromotions.add(key)
  queueMicrotask(() => {
    pendingPromotions.delete(key)

    if (hostnameState[key] !== name) {
      hostnameState[key] = name
      reverseDNSRevision.value++
    }
  })
}

function clearHostname(key: string): void {
  if (!(key in hostnameState)) return

  queueMicrotask(() => {
    if (key in hostnameState) {
      delete hostnameState[key]
      reverseDNSRevision.value++
    }
  })
}

async function fetchHostname(ip: string): Promise<string | null> {
  const name = reverseName(ip)
  if (!name) return null

  try {
    // 应答已在 assembly/config 的方言里归一,两条通道都能反查。
    const answers = await queryDNS(name, 'PTR')
    const answer = answers.find(({ type }) => type === 'PTR')?.data

    if (!answer) return null

    const hostname = answer.trim()
    if (!hostname) return null

    return hostname.endsWith('.') ? hostname.slice(0, -1) : hostname
  } catch {
    return null
  }
}

function lookup(ip: string): string | undefined {
  if (!resolveClientHostname.value || !isResolvableIP(ip)) return undefined

  const backendUuid = activeBackend.value?.uuid
  if (!backendUuid) return undefined

  const key = `${backendUuid}\u0000${ip}`
  const cached = memoryCache.get(key)
  const now = Date.now()

  if (cached) {
    if (!isExpired(cached, now)) {
      if (cached.name) promote(key, cached.name)
      return hostnameState[key]
    }

    memoryCache.delete(key)
    clearHostname(key)
  }

  if (!inflight.has(key)) {
    const promise = fetchHostname(ip)
    inflight.set(key, promise)

    promise
      .then((name) => {
        const entry: HostnameEntry = { name, ts: Date.now() }
        memoryCache.set(key, entry)

        if (name) {
          promote(key, name)
          persistPositive(key, entry)
        }
      })
      .finally(() => inflight.delete(key))
  }

  return hostnameState[key]
}

export const getReverseDNSHostname = (ip: string | undefined): string | undefined => {
  if (!ip) return undefined
  return lookup(ip)
}
