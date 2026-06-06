type ObservabilityEventName = 'request_health'

type RequestHealthStatus = 'success' | 'error' | 'cancelled' | 'cache_hit'

export type RequestHealthEvent = {
  page: string
  pattern: string
  resource: string
  status: RequestHealthStatus
  duration_ms: number
  retry_count: number
  cancelled: boolean
  deduped: boolean
  release: string
}

type ObservabilityEventMap = {
  request_health: RequestHealthEvent
}

const getCurrentPage = () => {
  return window.location.hash.replace(/^#\/?/, '').split(/[/?#]/)[0] || 'setup'
}

const PAGE_PATTERN_MAP: Record<string, string> = {
  connections: 'list',
  logs: 'list',
  overview: 'dashboard',
  proxies: 'list',
  rules: 'list',
  settings: 'settings',
  setup: 'settings',
}

const getCurrentPattern = (page: string) => {
  return PAGE_PATTERN_MAP[page] ?? 'unknown'
}

export const emitObservabilityEvent = <T extends ObservabilityEventName>(
  name: T,
  detail: ObservabilityEventMap[T],
) => {
  window.dispatchEvent(new CustomEvent(`zashboard:${name}`, { detail }))
}

export const emitRequestHealth = (
  detail: Omit<RequestHealthEvent, 'page' | 'pattern' | 'release'>,
) => {
  const page = getCurrentPage()

  emitObservabilityEvent('request_health', {
    page,
    pattern: getCurrentPattern(page),
    release: __APP_VERSION__,
    ...detail,
  })
}
