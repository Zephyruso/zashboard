import { MIN_PROXY_CARD_WIDTH, PROXY_CARD_SIZE } from '@/constant'
import type { Backend, BackendType } from '@/types'
import { useMediaQuery } from '@vueuse/core'
import dayjs from 'dayjs'
import prettyBytes, { type Options } from 'pretty-bytes'

export const isPreferredDark = useMediaQuery('(prefers-color-scheme: dark)')
export const isMiddleScreen = useMediaQuery('(max-width: 768px)')
export const isPWA = (() => {
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone
})()

export const prettyBytesHelper = (bytes: number, opts?: Options) => {
  return prettyBytes(Number.isFinite(bytes) ? bytes : 0, {
    binary: false,
    ...opts,
  })
}

export const prettySpeedHelper = (bytes: number, opts?: Options) => {
  const value = Number.isFinite(bytes) ? bytes : 0
  const maximumFractionDigits = opts?.maximumFractionDigits ?? 1

  return value < 1000
    ? `${(value / 1000).toFixed(maximumFractionDigits)} kB`
    : prettyBytesHelper(value, { maximumFractionDigits, ...opts })
}

export const fromNow = (timestamp: string | number) => {
  return dayjs(timestamp).fromNow()
}

export const prettyUptimeHelper = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '-'

  const uptime = dayjs.duration(seconds, 'seconds')

  return uptime.days() > 0 ? uptime.format('D[d] HH:mm:ss') : uptime.format('HH:mm:ss')
}

export const getDashboardSettingsFromStorage = () => {
  const settings: Record<string, string> = {}

  for (const key in localStorage) {
    if (key.startsWith('config/')) {
      settings[key] = localStorage.getItem(key) as string
    }
  }

  return settings
}

export const applyDashboardSettingsToStorage = (settings: Record<string, unknown>) => {
  for (const key in settings) {
    if (key.startsWith('config/')) {
      localStorage.setItem(key, settings[key] as string)
    }
  }
}

export const exportSettings = () => {
  const settings = getDashboardSettingsFromStorage()
  const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'zashboard-settings'
  a.click()
  URL.revokeObjectURL(url)
}

export const resetSettings = () => {
  const keysToReset = Object.keys(localStorage).filter((key) => {
    return key.startsWith('config/')
  })

  keysToReset.forEach((key) => localStorage.removeItem(key))
  window.location.reload()
}

export const getUrlFromBackend = (end: {
  protocol: string
  host: string
  port: string
  secondaryPath?: string
}) => {
  return `${end.protocol}://${end.host}:${end.port}${end.secondaryPath || ''}`
}

export const getBackendProbeUrl = (end: Omit<Backend, 'uuid'>) => getUrlFromBackend(end)

export const getLabelFromBackend = (end: Omit<Backend, 'uuid'>) => {
  return end.label || `${end.host}:${end.port}`
}

export const getMinCardWidth = (size: PROXY_CARD_SIZE) => {
  return size === PROXY_CARD_SIZE.LARGE ? MIN_PROXY_CARD_WIDTH.LARGE : MIN_PROXY_CARD_WIDTH.SMALL
}

export const PROXIES_PARENT_CLASS = 'proxies-scrollable-parent'

const getProtocolFromQuery = (query: URLSearchParams) => {
  const protocol = query.get('protocol')

  if (protocol === 'http' || protocol === 'https') {
    return protocol
  }
  if (query.get('http')) {
    return 'http'
  }
  if (query.get('https')) {
    return 'https'
  }

  return window.location.protocol.replace(':', '')
}

const getUrlQuery = () => {
  const query = new URLSearchParams(window.location.search)

  new URLSearchParams(location.hash.match(/\?.*$/)?.[0]).forEach((value, key) =>
    query.set(key, value),
  )

  return query
}

const getBackendFromQuery = (
  query: URLSearchParams,
  host: string,
  port: string,
): Omit<Backend, 'uuid'> => ({
  type: (query.get('type') === 'dae' ? 'dae' : 'clash') as BackendType,
  protocol: getProtocolFromQuery(query),
  secondaryPath: query.get('secondaryPath') || '',
  host,
  port,
  password: query.get('secret') || '',
  label: query.get('label') || '',
  disableUpgradeCore:
    query.get('disableUpgradeCore') === '1' || query.get('disableUpgradeCore') === 'core',
  disableTunMode: query.get('disableTunMode') === '1' || query.get('disableTunMode') === 'tun',
})

export const getBackendFromUrl = () => {
  const query = getUrlQuery()

  if (!query.has('hostname')) return null

  return getBackendFromQuery(query, query.get('hostname') as string, query.get('port') as string)
}

export const getOriginBackend = () => {
  const { protocol, hostname, port } = window.location

  if (protocol !== 'http:' && protocol !== 'https:') return null

  return {
    ...getBackendFromQuery(getUrlQuery(), hostname, port || (protocol === 'https:' ? '443' : '80')),
    protocol: protocol.slice(0, -1),
  }
}
