import { IP_INFO_API, LANG } from '@/constant'
import { geoipASNDatabaseURL, geoipCountryDatabaseURL, IPInfoAPI, language } from '@/store/settings'
import { watchDebounced } from '@vueuse/core'
import { Buffer } from 'buffer'
import * as ipaddr from 'ipaddr.js'
import type { AsnResponse, CountryResponse, Reader } from 'mmdb-lib'
import { reactive } from 'vue'

// mmdb-lib relies on the global Buffer at module-eval time.
if (!(globalThis as { Buffer?: unknown }).Buffer) {
  ;(globalThis as { Buffer?: unknown }).Buffer = Buffer
}

export interface IPInfo {
  ip: string
  country: string
  region: string
  city: string
  asn: string
  organization: string
}

// china
export const getIPFromIpipnetAPI = async () => {
  const response = await fetch('https://myip.ipip.net/json?t=' + Date.now())

  return (await response.json()) as {
    data: {
      ip: string
      location: string[]
    }
  }
}

// global
const getIPFromIpsbAPI = async (ip = '') => {
  const response = await fetch(
    'https://api.ip.sb/geoip' + (ip ? `/${ip}` : '') + '?t=' + Date.now(),
  )

  return (await response.json()) as {
    organization: string
    longitude: number
    city: string
    region: string
    timezone: string
    isp: string
    offset: number
    asn: number
    asn_organization: string
    country: string
    ip: string
    latitude: number
    postal_code: string
    continent_code: string
    country_code: string
    region_code: string
  }
}

const getIPFromIPWhoisAPI = async (ip = '') => {
  const response = await fetch('https://ipwho.is' + (ip ? `/${ip}` : '') + '?t=' + Date.now())

  return (await response.json()) as {
    ip: string
    success: boolean
    type: string
    continent: string
    continent_code: string
    country: string
    country_code: string
    region: string
    region_code: string
    city: string
    latitude: number
    longitude: number
    is_eu: boolean
    postal: string
    calling_code: string
    capital: string
    borders: string
    flag: {
      img: string
      emoji: string
      emoji_unicode: string
    }
    connection: {
      asn: number
      org: string
      isp: string
      domain: string
    }
    timezone: {
      id: string
      abbr: string
      is_dst: boolean
      offset: number
      utc: string
      current_time: string
    }
  }
}

const getIPFromIPapiisAPI = async (ip = '') => {
  const response = await fetch(
    'https://api.ipapi.is' + (ip ? `/?q=${ip}` : '') + (ip ? '&' : '?') + 't=' + Date.now(),
  )

  return (await response.json()) as {
    ip: string
    rir: string
    is_bogon: boolean
    is_mobile: boolean
    is_satellite: boolean
    is_crawler: boolean
    is_datacenter: boolean
    is_tor: boolean
    is_proxy: boolean
    is_vpn: boolean
    is_abuser: boolean
    datacenter: {
      datacenter: string
      network: string
      region: string
      service: string
      network_border_group: string
    }
    company: {
      name: string
      abuser_score: string
      domain: string
      type: string
      network: string
      whois: string
    }
    abuse: {
      name: string
      address: string
      email: string
      phone: string
    }
    asn: {
      asn: number
      abuser_score: string
      route: string
      descr: string
      country: string
      active: boolean
      org: string
      domain: string
      abuse: string
      type: string
      created: string
      updated: string
      rir: string
      whois: string
    }
    location: {
      is_eu_member: boolean
      calling_code: string
      currency_code: string
      continent: string
      country: string
      country_code: string
      state: string
      city: string
      latitude: number
      longitude: number
      zip: string
      timezone: string
      local_time: string
      local_time_unix: number
      is_dst: boolean
    }
    elapsed_ms: number
  }
}

export const getIPInfo = async (ip = ''): Promise<IPInfo> => {
  switch (IPInfoAPI.value) {
    case IP_INFO_API.IPAPI:
      const ipapi = await getIPFromIPapiisAPI(ip)

      return {
        ip: ipapi.ip,
        country: ipapi.location.country,
        region: ipapi.location.state,
        city: ipapi.location.city,
        asn: ipapi.asn.asn?.toString(),
        organization: ipapi.asn.org,
      }
    case IP_INFO_API.IPWHOIS:
      const ipwhois = await getIPFromIPWhoisAPI(ip)

      return {
        ip: ipwhois.ip,
        region: ipwhois.region,
        country: ipwhois.country,
        city: ipwhois.city,
        asn: ipwhois.connection.asn?.toString(),
        organization: ipwhois.connection.org,
      }
    case IP_INFO_API.IPSB:
    default:
      const ipsb = await getIPFromIpsbAPI(ip)

      return {
        ip: ipsb.ip,
        country: ipsb.country,
        region: ipsb.region,
        city: ipsb.city,
        asn: ipsb.asn?.toString(),
        organization: ipsb.organization,
      }
  }
}

/**
 * Local GeoIP lookup backed by GeoIP databases (Country for the country, ASN for
 * the autonomous system / organization).
 *
 * Each database is downloaded once from the CDN, cached in IndexedDB (which,
 * unlike the Cache API, also works over plain HTTP), and queried in the browser
 * so location lookups no longer hit a remote geolocation API.
 */
const GEOIP_IDB_NAME = 'zashboard-geoip'
const GEOIP_IDB_STORE = 'mmdb'
const GEOIP_DATABASE_TTL = 30 * 24 * 60 * 60 * 1000

interface CachedGeoIPDatabase {
  buffer: ArrayBuffer
  updatedAt: number
}

const openGeoIPDB = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(GEOIP_IDB_NAME, 1)

    request.onupgradeneeded = () => {
      request.result.createObjectStore(GEOIP_IDB_STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

const readCachedDatabase = async (key: string): Promise<CachedGeoIPDatabase | undefined> => {
  const db = await openGeoIPDB()

  return new Promise((resolve, reject) => {
    const request = db
      .transaction(GEOIP_IDB_STORE, 'readonly')
      .objectStore(GEOIP_IDB_STORE)
      .get(key)

    request.onsuccess = () => resolve(request.result as CachedGeoIPDatabase | undefined)
    request.onerror = () => reject(request.error)
  }).finally(() => db.close()) as Promise<CachedGeoIPDatabase | undefined>
}

const writeCachedDatabase = async (key: string, value: CachedGeoIPDatabase): Promise<void> => {
  const db = await openGeoIPDB()

  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(GEOIP_IDB_STORE, 'readwrite')

    transaction.objectStore(GEOIP_IDB_STORE).put(value, key)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  }).finally(() => db.close())
}

type GeoIPResponse = CountryResponse | AsnResponse

const loadReader = async (url: string): Promise<Reader<GeoIPResponse>> => {
  let cached = await readCachedDatabase(url).catch(() => undefined)

  if (!cached || Date.now() - cached.updatedAt > GEOIP_DATABASE_TTL) {
    try {
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Failed to download GeoIP database: ${response.status}`)
      }

      cached = { buffer: await response.arrayBuffer(), updatedAt: Date.now() }
      await writeCachedDatabase(url, cached).catch(() => {})
    } catch (error) {
      // Fall back to a stale cache when refreshing fails; only rethrow when we
      // have nothing usable at all.
      if (!cached) {
        throw error
      }
    }
  }

  const { Reader } = await import('mmdb-lib')

  return new Reader<GeoIPResponse>(Buffer.from(cached.buffer))
}

// Cap the in-memory reader cache. Normally only two databases (country + ASN)
// are live at once; the headroom absorbs transient URL edits before the stale
// entries are evicted (least-recently-used first).
const GEOIP_READER_CACHE_MAX = 4
const readerCache = new Map<string, Promise<Reader<GeoIPResponse>>>()

const getReader = <T extends GeoIPResponse>(url: string): Promise<Reader<T>> => {
  const cached = readerCache.get(url)

  if (cached) {
    // Mark as most-recently-used.
    readerCache.delete(url)
    readerCache.set(url, cached)

    return cached as Promise<Reader<T>>
  }

  const reader = loadReader(url).catch((error) => {
    // Drop the failed entry so a later lookup can retry the download.
    readerCache.delete(url)
    throw error
  })

  readerCache.set(url, reader)

  // Evict the least-recently-used entries beyond the cap.
  while (readerCache.size > GEOIP_READER_CACHE_MAX) {
    const oldest = readerCache.keys().next().value

    if (oldest === undefined) {
      break
    }

    readerCache.delete(oldest)
  }

  return reader as Promise<Reader<T>>
}

const localizedName = (names?: { en: string; 'zh-CN'?: string }): string => {
  if (!names) {
    return ''
  }

  const preferChinese = language.value === LANG.ZH_CN || language.value === LANG.ZH_TW

  return preferChinese ? (names['zh-CN'] ?? names.en) : names.en
}

// Look up a single IP. A failure to load the database propagates (so the caller
// can retry later); only a lookup miss / decode error for this IP becomes null.
const lookup = async <T extends GeoIPResponse>(url: string, ip: string): Promise<T | null> => {
  const reader = await getReader<T>(url)

  try {
    return reader.get(ip)
  } catch {
    return null
  }
}

const getGeoIPInfo = async (ip: string): Promise<IPInfo> => {
  const [country, asn] = await Promise.all([
    lookup<CountryResponse>(geoipCountryDatabaseURL.value, ip),
    lookup<AsnResponse>(geoipASNDatabaseURL.value, ip),
  ])

  return {
    ip,
    // Real countries carry localized names; category ranges (e.g. GOOGLE) only
    // have an iso_code, so fall back to that.
    country: localizedName(country?.country?.names) || (country?.country?.iso_code ?? ''),
    region: '',
    city: '',
    asn: asn?.autonomous_system_number?.toString() ?? '',
    organization: asn?.autonomous_system_organization ?? '',
  }
}

const EMPTY_GEOIP_INFO: IPInfo = {
  ip: '',
  country: '',
  region: '',
  city: '',
  asn: '',
  organization: '',
}
// Cap the resolved-info cache; a session may touch many distinct IPs, and each
// entry is tiny, so this only guards against unbounded growth.
const GEOIP_INFO_CACHE_MAX = 4096
const geoInfoCache = reactive(new Map<string, IPInfo>())
const geoInfoPending = new Set<string>()

/**
 * Reactive, synchronous GeoIP lookup for render paths (e.g. table cells).
 *
 * Returns the cached info immediately, or empty values while the async lookup
 * runs in the background; once resolved the reactive cache updates and dependent
 * views re-render.
 */
export const getGeoIPInfoSync = (ip: string): IPInfo => {
  if (!ip || !ipaddr.isValid(ip)) {
    return EMPTY_GEOIP_INFO
  }

  const cached = geoInfoCache.get(ip)

  if (cached) {
    return cached
  }

  if (!geoInfoPending.has(ip)) {
    geoInfoPending.add(ip)
    getGeoIPInfo(ip)
      .then((info) => {
        geoInfoCache.set(ip, info)

        // Evict oldest entries beyond the cap (FIFO; safe here since this runs
        // in a microtask, not during a render read of the reactive cache).
        while (geoInfoCache.size > GEOIP_INFO_CACHE_MAX) {
          const oldest = geoInfoCache.keys().next().value

          if (oldest === undefined) {
            break
          }

          geoInfoCache.delete(oldest)
        }
      })
      .catch(() => {})
      .finally(() => geoInfoPending.delete(ip))
  }

  return EMPTY_GEOIP_INFO
}

// When the database URLs change, drop the cached readers and resolved results so
// the new databases are (re)downloaded and take effect. Clearing the reactive
// result cache makes any visible GeoIP cells re-query immediately; if nothing is
// shown, nothing is downloaded. Debounced so editing the URL character by
// character does not trigger a download per keystroke.
watchDebounced(
  [geoipCountryDatabaseURL, geoipASNDatabaseURL],
  () => {
    readerCache.clear()
    geoInfoCache.clear()
    geoInfoPending.clear()
  },
  { debounce: 800 },
)
