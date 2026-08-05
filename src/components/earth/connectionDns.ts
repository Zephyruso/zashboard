import { queryConnectionDNSAPI } from '@/api/clash'
import { activeBackend } from '@/store/setup'
import * as ipaddr from 'ipaddr.js'

interface ResolvedAddress {
  address?: string
  ttl: number
}

interface CachedAddress {
  expiresAt: number
  pending: Promise<string | undefined>
}

const DNS_CACHE_MAX = 1024
const DNS_MISS_TTL = 30 * 1000
const DNS_TTL_MIN = 30 * 1000
const DNS_TTL_MAX = 10 * 60 * 1000
const addressCache = new Map<string, CachedAddress>()

/** Parse plain IPs, ip:port, and [IPv6]:port without attempting DNS. */
export const parseConnectionIP = (value: string): string | undefined => {
  let candidate = value.trim()

  if (!candidate) return undefined

  if (candidate.startsWith('[')) {
    candidate = candidate.slice(1).split(']')[0]
  } else if (!ipaddr.isValid(candidate) && candidate.split(':').length === 2) {
    const [host, port] = candidate.split(':')

    if (/^\d+$/.test(port)) candidate = host
  }

  // Link-local IPv6 zone identifiers are not part of an MMDB lookup key.
  candidate = candidate.split('%')[0]
  if (!ipaddr.isValid(candidate)) return undefined

  return ipaddr.parse(candidate).toString()
}

const parseConnectionHostname = (value: string): string | undefined => {
  const trimmed = value.trim()

  if (!trimmed || parseConnectionIP(trimmed)) return undefined

  try {
    const parsed = new URL(`http://${trimmed}`)

    // remoteDestination is a host or host:port, never a URL with credentials,
    // a path, a query, or a fragment.
    if (
      parsed.username ||
      parsed.password ||
      parsed.pathname !== '/' ||
      parsed.search ||
      parsed.hash
    ) {
      return undefined
    }

    const hostname = parsed.hostname.replace(/\.$/, '').toLowerCase()

    if (!hostname || hostname.length > 253 || ipaddr.isValid(hostname)) return undefined

    return hostname
  } catch {
    return undefined
  }
}

const clampTTL = (ttl: number | undefined) => {
  if (!Number.isFinite(ttl)) return DNS_TTL_MIN

  return Math.min(DNS_TTL_MAX, Math.max(DNS_TTL_MIN, (ttl as number) * 1000))
}

const queryAddress = async (hostname: string, type: 'A' | 'AAAA'): Promise<ResolvedAddress> => {
  try {
    const response = await queryConnectionDNSAPI({ name: hostname, type })
    const recordType = type === 'A' ? 1 : 28
    const answer = response.Answer?.find(
      (item) => item.type === recordType && parseConnectionIP(item.data),
    )

    return {
      address: answer ? parseConnectionIP(answer.data) : undefined,
      ttl: clampTTL(answer?.TTL),
    }
  } catch {
    return { ttl: DNS_MISS_TTL }
  }
}

const lookupHostname = async (hostname: string): Promise<ResolvedAddress> => {
  const ipv4 = await queryAddress(hostname, 'A')

  if (ipv4.address) return ipv4

  return queryAddress(hostname, 'AAAA')
}

/**
 * Resolve a connection endpoint for the map. Literal IPs never issue a DNS
 * request; Clash/Mihomo hostnames use the active core's /dns/query endpoint.
 */
export const resolveConnectionIP = (value: string): Promise<string | undefined> => {
  const address = parseConnectionIP(value)

  if (address) return Promise.resolve(address)

  const backend = activeBackend.value
  const hostname = parseConnectionHostname(value)

  // The native sing-box channel currently exposes no DNS query RPC.
  if (!backend || backend.type === 'singbox' || !hostname) return Promise.resolve(undefined)

  const key = `${backend.uuid}:${hostname}`
  const now = Date.now()
  const cached = addressCache.get(key)

  if (cached && cached.expiresAt > now) {
    // Touch the entry so the bounded cache behaves as an LRU.
    addressCache.delete(key)
    addressCache.set(key, cached)
    return cached.pending
  }

  if (cached) addressCache.delete(key)

  const entry: CachedAddress = {
    expiresAt: Number.POSITIVE_INFINITY,
    pending: Promise.resolve(undefined),
  }

  entry.pending = lookupHostname(hostname).then((result) => {
    entry.expiresAt = Date.now() + (result.address ? result.ttl : DNS_MISS_TTL)
    return result.address
  })
  addressCache.set(key, entry)

  while (addressCache.size > DNS_CACHE_MAX) {
    const oldest = addressCache.keys().next().value

    if (oldest === undefined) break
    addressCache.delete(oldest)
  }

  return entry.pending
}
