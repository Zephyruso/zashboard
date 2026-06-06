import { MIHOMO, MIHOMO_CHANNEL, ROUTE_NAME } from '@/constant'
import { showNotification } from '@/helper/notification'
import { getUrlFromBackend } from '@/helper/utils'
import { emitRequestHealth } from '@/observability/events'
import router from '@/router'
import { autoUpgradeCore, checkUpgradeCore } from '@/store/settings'
import { activeBackend, activeUuid } from '@/store/setup'
import type {
  Backend,
  Config,
  DNSQuery,
  NodeRank,
  Proxy,
  ProxyProvider,
  Rule,
  RuleProvider,
} from '@/types'
import axios, { AxiosError } from 'axios'
import { debounce } from 'lodash-es'
import ReconnectingWebSocket from 'reconnectingwebsocket'
import { computed, nextTick, ref, watch } from 'vue'

axios.interceptors.request.use((config) => {
  if (!activeBackend.value) {
    return Promise.reject(new axios.CanceledError('No active backend'))
  }

  config.baseURL = getUrlFromBackend(activeBackend.value)
  config.headers['Authorization'] = 'Bearer ' + activeBackend.value.password
  return config
})

const ignoreNotificationUrls = ['/delay', '/weights', '/storage/zashboard']

axios.interceptors.response.use(
  null,
  (
    error: AxiosError<{
      message: string
    }>,
  ) => {
    if (axios.isCancel(error)) {
      return Promise.reject(error)
    }

    if (error.status === 401 && activeUuid.value) {
      const currentBackendUuid = activeUuid.value
      activeUuid.value = ''
      router.push({
        name: ROUTE_NAME.setup,
        query: { editBackend: currentBackendUuid },
      })
      nextTick(() => {
        showNotification({ content: 'unauthorizedTip' })
      })
    } else if (!ignoreNotificationUrls.some((url) => error.config?.url?.endsWith(url))) {
      const errorMessage = error.response?.data?.message || error.message

      showNotification({
        key: errorMessage,
        content: `${decodeURIComponent(error.config?.url || '')} \n${errorMessage}`,
        type: 'alert-error',
      })
      return Promise.reject(error)
    }

    return error
  },
)

export const isRequestCanceled = (error: unknown) => {
  return axios.isCancel(error) || (error instanceof DOMException && error.name === 'AbortError')
}

export const version = ref()
export const isCoreUpdateAvailable = ref(false)
const fetchVersionAPI = (signal?: AbortSignal) => {
  return axios.get<{ version: string }>('/version', { signal })
}
export const isSingBox = computed(() => version.value?.includes('sing-box'))
export const mihomo = computed<[MIHOMO, string] | undefined>(() => {
  if (isSingBox.value) return undefined
  else {
    const match = /(alpha-smart|alpha|beta|meta)-?(\w+)/.exec(version.value)
    switch (match?.[1]) {
      case 'alpha':
        return [MIHOMO.Alpha, match[2] ?? version.value]
      case 'alpha-smart':
        return [MIHOMO.Smart, match[2] ?? version.value]
      case 'meta':
        return [MIHOMO.Meta, match[2] ?? version.value]
      default:
        return [MIHOMO.Meta, version.value]
    }
  }
})
export const zashboardVersion = ref(__APP_VERSION__)
let fetchVersionAbortController: AbortController | undefined

watch(
  activeBackend,
  async (val) => {
    fetchVersionAbortController?.abort()

    if (!val) {
      version.value = ''
      isCoreUpdateAvailable.value = false
      return
    }

    const backendUuid = val.uuid
    const controller = new AbortController()
    fetchVersionAbortController = controller

    try {
      const { data } = await fetchVersionAPI(controller.signal)

      if (activeUuid.value !== backendUuid) return

      version.value = data?.version || ''
      if (isSingBox.value || !checkUpgradeCore.value || activeBackend.value?.disableUpgradeCore)
        return
      const updateAvailable = await fetchBackendUpdateAvailableAPI(controller.signal)

      if (activeUuid.value !== backendUuid) return

      isCoreUpdateAvailable.value = updateAvailable

      if (isCoreUpdateAvailable.value && autoUpgradeCore.value) {
        void upgradeCoreAPI('auto', controller.signal).catch(() => {})
      }
    } catch (error) {
      if (isRequestCanceled(error)) return
      throw error
    } finally {
      if (fetchVersionAbortController === controller) {
        fetchVersionAbortController = undefined
      }
    }
  },
  { immediate: true },
)

export const fetchProxiesAPI = (signal?: AbortSignal) => {
  return axios.get<{ proxies: Record<string, Proxy> }>('/proxies', { signal })
}

export const selectProxyAPI = (proxyGroup: string, name: string) => {
  return axios.put(`/proxies/${encodeURIComponent(proxyGroup)}`, { name })
}

export const deleteFixedProxyAPI = (proxyGroup: string) => {
  return axios.delete(`/proxies/${encodeURIComponent(proxyGroup)}`)
}

export const fetchProxyLatencyAPI = (
  proxyName: string,
  url: string,
  timeout: number,
  signal?: AbortSignal,
) => {
  return axios.get<{ delay: number }>(`/proxies/${encodeURIComponent(proxyName)}/delay`, {
    params: {
      url,
      timeout,
    },
    signal,
  })
}

export const fetchProxyGroupLatencyAPI = (
  proxyName: string,
  url: string,
  timeout: number,
  signal?: AbortSignal,
) => {
  return axios.get<Record<string, number>>(`/group/${encodeURIComponent(proxyName)}/delay`, {
    params: {
      url,
      timeout,
    },
    signal,
  })
}

export const fetchSmartWeightsAPI = (signal?: AbortSignal) => {
  return axios.get<{
    message: string
    weights: Record<string, NodeRank[]>
  }>(`/group/weights`, { signal })
}

// deprecated
export const fetchSmartGroupWeightsAPI = (proxyName: string, signal?: AbortSignal) => {
  return axios.get<{
    message: string
    weights: NodeRank[]
  }>(`/group/${encodeURIComponent(proxyName)}/weights`, { signal })
}

export const flushSmartGroupWeightsAPI = (signal?: AbortSignal) => {
  return axios.post(`/cache/smart/flush`, undefined, { signal })
}

export const fetchProxyProviderAPI = (signal?: AbortSignal) => {
  return axios.get<{ providers: Record<string, ProxyProvider> }>('/providers/proxies', { signal })
}

export const updateProxyProviderAPI = (name: string, signal?: AbortSignal) => {
  return axios.put(`/providers/proxies/${encodeURIComponent(name)}`, undefined, { signal })
}

export const proxyProviderHealthCheckAPI = (name: string, signal?: AbortSignal) => {
  return axios.get<Record<string, number>>(
    `/providers/proxies/${encodeURIComponent(name)}/healthcheck`,
    {
      timeout: 15000,
      signal,
    },
  )
}

export const fetchRulesAPI = (signal?: AbortSignal) => {
  return axios.get<{ rules: Rule[] }>('/rules', { signal })
}

export const toggleRuleDisabledAPI = (data: Record<number, boolean>, signal?: AbortSignal) => {
  return axios.patch(`/rules/disable`, data, { signal })
}

export const toggleRuleDisabledSingBoxAPI = (uuid: string, signal?: AbortSignal) => {
  return axios.put(`/rules/${encodeURIComponent(uuid)}`, undefined, { signal })
}

export const fetchRuleProvidersAPI = (signal?: AbortSignal) => {
  return axios.get<{ providers: Record<string, RuleProvider> }>('/providers/rules', { signal })
}

export const updateRuleProviderAPI = (name: string, signal?: AbortSignal) => {
  return axios.put(`/providers/rules/${encodeURIComponent(name)}`, undefined, { signal })
}

export const blockConnectionByIdAPI = (id: string, signal?: AbortSignal) => {
  return axios.delete(`/connections/smart/${id}`, { signal })
}

export const disconnectByIdAPI = (id: string, signal?: AbortSignal) => {
  return axios.delete(`/connections/${id}`, { signal })
}

export const disconnectAllAPI = (signal?: AbortSignal) => {
  return axios.delete('/connections', { signal })
}

export const getConfigsAPI = (signal?: AbortSignal) => {
  return axios.get<Config>('/configs', { signal })
}

export const patchConfigsAPI = (
  configs: Record<string, string | boolean | object | number>,
  signal?: AbortSignal,
) => {
  return axios.patch('/configs', configs, { signal })
}

export const flushFakeIPAPI = (signal?: AbortSignal) => {
  return axios.post('/cache/fakeip/flush', undefined, { signal })
}

export const flushDNSCacheAPI = (signal?: AbortSignal) => {
  return axios.post('/cache/dns/flush', undefined, { signal })
}

export const reloadConfigsAPI = (signal?: AbortSignal) => {
  return axios.put('/configs?reload=true', { path: '', payload: '' }, { signal })
}

export const updateConfigsAPI = (
  config: { path?: string; payload?: string },
  force: boolean = false,
  signal?: AbortSignal,
) => {
  return axios.put(
    `/configs${force ? '?force=true' : ''}`,
    {
      path: config.path || '',
      payload: config.payload || '',
    },
    { signal },
  )
}

export const upgradeUIAPI = (signal?: AbortSignal) => {
  return axios.post('/upgrade/ui', undefined, { signal })
}

export const updateGeoDataAPI = (signal?: AbortSignal) => {
  return axios.post('/configs/geo', undefined, { signal })
}

export const upgradeCoreAPI = (type: 'release' | 'alpha' | 'auto', signal?: AbortSignal) => {
  const url = type === 'auto' ? '/upgrade' : `/upgrade?channel=${type}`

  return axios.post(url, undefined, { signal })
}

export const restartCoreAPI = (signal?: AbortSignal) => {
  return axios.post('/restart', undefined, { signal })
}

export const queryDNSAPI = (params: { name: string; type: string }, signal?: AbortSignal) => {
  return axios.get<DNSQuery>('/dns/query', {
    params,
    signal,
  })
}

export const getStorageAPI = (signal?: AbortSignal) => {
  return axios.get<Record<string, unknown>>(`/storage/zashboard`, { signal })
}

export const setStorageAPI = (value: Record<string, string>, signal?: AbortSignal) => {
  return axios.put(`/storage/zashboard`, value, { signal })
}

export const deleteStorageAPI = (signal?: AbortSignal) => {
  return axios.delete(`/storage/zashboard`, { signal })
}

const createWebSocket = <T>(url: string, searchParams?: Record<string, string>) => {
  const data = ref<T>()
  const backend = activeBackend.value

  if (!backend) {
    return {
      data,
      close: () => {},
    }
  }

  const resurl = new URL(`${getUrlFromBackend(backend).replace('http', 'ws')}/${url}`)

  resurl.searchParams.append('token', backend?.password || '')

  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      resurl.searchParams.append(key, value)
    })
  }

  const websocket = new ReconnectingWebSocket(resurl.toString())

  const close = () => {
    websocket.close()
  }

  const messageHandler = ({ data: message }: { data: string }) => {
    try {
      data.value = JSON.parse(message)
    } catch (error) {
      console.warn(`Failed to parse ${url} websocket message`, error)
    }
  }

  websocket.onmessage = url === 'logs' ? messageHandler : debounce(messageHandler, 100)

  return {
    data,
    close,
  }
}

export const fetchConnectionsAPI = <T>() => {
  return createWebSocket<T>('connections')
}

export const fetchLogsAPI = <T>(params: Record<string, string> = {}) => {
  return createWebSocket<T>('logs', params)
}

export const fetchMemoryAPI = <T>() => {
  return createWebSocket<T>('memory')
}

export const fetchTrafficAPI = <T>() => {
  return createWebSocket<T>('traffic')
}

export const isBackendAvailable = async (backend: Backend, timeout: number = 10000) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const res = await fetch(`${getUrlFromBackend(backend)}/version`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${backend.password}`,
      },
      signal: controller.signal,
    })

    return res.ok
  } catch {
    return false
  } finally {
    clearTimeout(timeoutId)
  }
}

const CACHE_DURATION = 1000 * 60 * 60

interface CacheEntry<T> {
  timestamp: number
  version: string
  data: T
}

async function fetchWithLocalCache<T>(
  url: string,
  version: string,
  signal?: AbortSignal,
  resource: string = 'external_cache',
): Promise<T> {
  const start = performance.now()
  const cacheKey = 'cache/' + url
  const cacheRaw = localStorage.getItem(cacheKey)

  if (cacheRaw) {
    try {
      const cache: CacheEntry<T> = JSON.parse(cacheRaw)
      const now = Date.now()

      if (now - cache.timestamp < CACHE_DURATION && cache.version === version) {
        emitRequestHealth({
          resource,
          status: 'cache_hit',
          duration_ms: Math.round(performance.now() - start),
          retry_count: 0,
          cancelled: false,
          deduped: true,
        })
        return cache.data
      } else {
        localStorage.removeItem(cacheKey)
      }
    } catch (e) {
      console.warn('Failed to parse cache for', url, e)
    }
  }

  try {
    const response = await fetch(url, { signal })
    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status} ${response.statusText}`)
    }

    const data: T = await response.json()
    const newCache: CacheEntry<T> = {
      timestamp: Date.now(),
      version,
      data,
    }

    localStorage.setItem(cacheKey, JSON.stringify(newCache))
    emitRequestHealth({
      resource,
      status: 'success',
      duration_ms: Math.round(performance.now() - start),
      retry_count: 0,
      cancelled: false,
      deduped: false,
    })
    return data
  } catch (error) {
    const cancelled = isRequestCanceled(error)

    emitRequestHealth({
      resource,
      status: cancelled ? 'cancelled' : 'error',
      duration_ms: Math.round(performance.now() - start),
      retry_count: 0,
      cancelled,
      deduped: false,
    })
    throw error
  }
}

export const fetchIsUIUpdateAvailable = async (signal?: AbortSignal) => {
  const { tag_name } = await fetchWithLocalCache<{ tag_name: string }>(
    'https://api.github.com/repos/Zephyruso/zashboard/releases/latest',
    zashboardVersion.value,
    signal,
    'zashboard_release_latest',
  )

  return Boolean(tag_name && tag_name !== `v${zashboardVersion.value}`)
}

const check = async (url: string, versionNumber: string, signal?: AbortSignal) => {
  const { assets } = await fetchWithLocalCache<{ assets: { name: string }[] }>(
    url,
    versionNumber,
    signal,
    'backend_release_assets',
  )
  const alreadyLatest = assets.some(({ name }) => name.includes(versionNumber))

  return !alreadyLatest
}

const fetchBackendUpdateAvailableAPI = async (signal?: AbortSignal) => {
  return await check(
    MIHOMO_CHANNEL[mihomo.value?.[0] ?? MIHOMO.Meta].check_update_url,
    mihomo.value?.[1] ?? version.value,
    signal,
  )
}
