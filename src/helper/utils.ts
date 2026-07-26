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
  return prettyBytes(bytes, {
    binary: false,
    ...opts,
  })
}

export const fromNow = (timestamp: string | number) => {
  return dayjs(timestamp).fromNow()
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

// sing-box native 后端复用顶层连接字段作为 gRPC baseUrl(secondaryPath 留空)。
export const getSingboxUrlFromBackend = (
  end: Pick<Backend, 'type' | 'protocol' | 'host' | 'port'>,
) => {
  if (end.type !== 'singbox' || !end.host) return ''
  return `${end.protocol}://${end.host}:${end.port}`
}

export const getSingboxSecret = (end: Pick<Backend, 'type' | 'password'>) =>
  end.type === 'singbox' ? end.password || '' : ''

export const getLabelFromBackend = (end: Omit<Backend, 'uuid'>) => {
  return end.label || `${end.host}:${end.port}`
}

export const getMinCardWidth = (size: PROXY_CARD_SIZE) => {
  return size === PROXY_CARD_SIZE.LARGE ? MIN_PROXY_CARD_WIDTH.LARGE : MIN_PROXY_CARD_WIDTH.SMALL
}

export const PROXIES_PARENT_CLASS = 'proxies-scrollable-parent'

export const scrollIntoCenter = (el: HTMLElement) => {
  const scrollableParent = findScrollableParent(el)

  if (!scrollableParent) return

  const elRect = el.getBoundingClientRect()
  const parentRect = scrollableParent.getBoundingClientRect()

  if (elRect.top >= parentRect.top && elRect.bottom <= parentRect.bottom) return

  const parentTop = scrollableParent.offsetTop
  const childTop = el.offsetTop

  const centerOffset =
    childTop - parentTop - scrollableParent.clientHeight / 2 + el.clientHeight / 2

  scrollableParent.scrollTo({
    top: centerOffset,
    behavior: 'smooth',
  })
}

export const findScrollableParent = (el: HTMLElement | null): HTMLElement | null => {
  const parent = el?.parentElement

  if (
    parent?.classList.contains(PROXIES_PARENT_CLASS) &&
    parent.scrollHeight > parent.clientHeight
  ) {
    return parent
  }

  return parent ? findScrollableParent(parent) : null
}

export const getBackendFromUrl = () => {
  const query = new URLSearchParams(
    window.location.search || location.hash.match(/\?.*$/)?.[0]?.replace('?', ''),
  )

  if (query.has('hostname')) {
    return {
      // 后端类型:'singbox' 走 sing-box native gRPC,其余(含缺省)按 'clash' 处理。
      type: (query.get('type') === 'singbox' ? 'singbox' : 'clash') as BackendType,
      protocol: query.get('http')
        ? 'http'
        : query.get('https')
          ? 'https'
          : window.location.protocol.replace(':', ''),
      secondaryPath: query.get('secondaryPath') || '',
      host: query.get('hostname') as string,
      port: query.get('port') as string,
      password: query.get('secret') || '',
      label: query.get('label') || '',
      disableUpgradeCore:
        query.get('disableUpgradeCore') === '1' || query.get('disableUpgradeCore') === 'core',
      disableTunMode: query.get('disableTunMode') === '1' || query.get('disableTunMode') === 'tun',
    }
  }
  return null
}
