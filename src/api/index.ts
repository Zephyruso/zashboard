import { MIHOMO, MIHOMO_CHANNEL, ROUTE_NAME } from '@/constant'
import { showNotification } from '@/helper/notification'
import { getApiBaseUrl, getWebSocketBaseUrl } from '@/helper/utils'
import router from '@/router'
import { autoUpgradeCore, checkUpgradeCore } from '@/store/settings'
import {
  activeBackend,
  activeBackendFlavor,
  activeUuid,
  setActiveBackendFlavor,
} from '@/store/setup'
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
import axios, { AxiosError, type AxiosRequestConfig } from 'axios'
import { debounce } from 'lodash'
import ReconnectingWebSocket from 'reconnectingwebsocket'
import { computed, nextTick, ref, watch } from 'vue'
import { detectBackendFlavor } from './fastproxy'

axios.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl(activeBackend.value)
  if (activeBackend.value?.password) {
    config.headers['Authorization'] = 'Bearer ' + activeBackend.value.password
  }
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
    if (error.status === 401 && activeUuid.value && !import.meta.env.DEV) {
      const currentBackendUuid = activeUuid.value
      activeUuid.value = null
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

const fastProxyApiPath = (path: string) => (import.meta.env.DEV ? path : `/api${path}`)
const fastProxyControllerProxyPath = (path: string) =>
  fastProxyApiPath(`/runtime/controller/${path.replace(/^\/+/, '')}`)

const shouldUseFastProxyControllerProxy = () => {
  if (activeBackendFlavor.value === 'fastproxy') {
    return true
  }
  if (activeBackendFlavor.value === 'controller') {
    return false
  }
  return ['__dev_backend__', '__local_fastproxy__'].includes(activeBackend.value?.uuid || '')
}

const controllerRequest = <T>(config: AxiosRequestConfig) => {
  if (!shouldUseFastProxyControllerProxy()) {
    return axios.request<T>(config)
  }

  return axios.request<T>({
    ...config,
    baseURL: getApiBaseUrl(activeBackend.value),
    url: fastProxyControllerProxyPath(String(config.url || '/')),
  })
}

export const version = ref()
export const isCoreUpdateAvailable = ref(false)
export const fetchVersionAPI = () => {
  return controllerRequest<{ version: string }>({ method: 'GET', url: '/version' })
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
export const appVersion = ref(__APP_VERSION__)

watch(
  activeBackend,
  async (val) => {
    if (val) {
      const flavor = await detectBackendFlavor(val)
      setActiveBackendFlavor(flavor)
      if (flavor === 'fastproxy') {
        version.value = 'fastproxy-server'
        isCoreUpdateAvailable.value = false
        return
      }
      if (flavor !== 'controller') {
        version.value = ''
        isCoreUpdateAvailable.value = false
        return
      }
      const { data } = await fetchVersionAPI()

      version.value = data?.version || ''
      if (isSingBox.value || !checkUpgradeCore.value || activeBackend.value?.disableUpgradeCore)
        return
      isCoreUpdateAvailable.value = await fetchBackendUpdateAvailableAPI()

      if (isCoreUpdateAvailable.value && autoUpgradeCore.value) {
        upgradeCoreAPI('auto')
      }
    }
  },
  { immediate: true },
)

export const fetchProxiesAPI = () => {
  return controllerRequest<{ proxies: Record<string, Proxy> }>({ method: 'GET', url: '/proxies' })
}

export const selectProxyAPI = (proxyGroup: string, name: string) => {
  return controllerRequest({
    method: 'PUT',
    url: `/proxies/${encodeURIComponent(proxyGroup)}`,
    data: { name },
  })
}

export const deleteFixedProxyAPI = (proxyGroup: string) => {
  return controllerRequest({ method: 'DELETE', url: `/proxies/${encodeURIComponent(proxyGroup)}` })
}

export const fetchProxyLatencyAPI = (proxyName: string, url: string, timeout: number) => {
  return controllerRequest<{ delay: number }>({
    method: 'GET',
    url: `/proxies/${encodeURIComponent(proxyName)}/delay`,
    params: {
      url,
      timeout,
    },
  })
}

export const fetchProxyGroupLatencyAPI = (proxyName: string, url: string, timeout: number) => {
  return controllerRequest<Record<string, number>>({
    method: 'GET',
    url: `/group/${encodeURIComponent(proxyName)}/delay`,
    params: {
      url,
      timeout,
    },
  })
}

export const fetchSmartWeightsAPI = () => {
  return controllerRequest<{
    message: string
    weights: Record<string, NodeRank[]>
  }>({ method: 'GET', url: '/group/weights' })
}

// deprecated
export const fetchSmartGroupWeightsAPI = (proxyName: string) => {
  return controllerRequest<{
    message: string
    weights: NodeRank[]
  }>({ method: 'GET', url: `/group/${encodeURIComponent(proxyName)}/weights` })
}

export const flushSmartGroupWeightsAPI = () => {
  return controllerRequest({ method: 'POST', url: '/cache/smart/flush' })
}

export const fetchProxyProviderAPI = () => {
  return controllerRequest<{ providers: Record<string, ProxyProvider> }>({
    method: 'GET',
    url: '/providers/proxies',
  })
}

export const updateProxyProviderAPI = (name: string) => {
  return controllerRequest({ method: 'PUT', url: `/providers/proxies/${encodeURIComponent(name)}` })
}

export const proxyProviderHealthCheckAPI = (name: string) => {
  return controllerRequest<Record<string, number>>({
    method: 'GET',
    url: `/providers/proxies/${encodeURIComponent(name)}/healthcheck`,
    timeout: 15000,
  })
}

export const fetchRulesAPI = () => {
  return controllerRequest<{ rules: Rule[] }>({ method: 'GET', url: '/rules' })
}

export const toggleRuleDisabledAPI = (data: Record<number, boolean>) => {
  return controllerRequest({ method: 'PATCH', url: '/rules/disable', data })
}

export const toggleRuleDisabledSingBoxAPI = (uuid: string) => {
  return controllerRequest({ method: 'PUT', url: `/rules/${encodeURIComponent(uuid)}` })
}

export const fetchRuleProvidersAPI = () => {
  return controllerRequest<{ providers: Record<string, RuleProvider> }>({
    method: 'GET',
    url: '/providers/rules',
  })
}

export const updateRuleProviderAPI = (name: string) => {
  return controllerRequest({ method: 'PUT', url: `/providers/rules/${encodeURIComponent(name)}` })
}

export const blockConnectionByIdAPI = (id: string) => {
  return controllerRequest({ method: 'DELETE', url: `/connections/smart/${id}` })
}

export const disconnectByIdAPI = (id: string) => {
  return controllerRequest({ method: 'DELETE', url: `/connections/${id}` })
}

export const disconnectAllAPI = () => {
  return controllerRequest({ method: 'DELETE', url: '/connections' })
}

export const getConfigsAPI = () => {
  return controllerRequest<Config>({ method: 'GET', url: '/configs' })
}

export const patchConfigsAPI = (configs: Record<string, string | boolean | object | number>) => {
  return controllerRequest({ method: 'PATCH', url: '/configs', data: configs })
}

export const flushFakeIPAPI = () => {
  return controllerRequest({ method: 'POST', url: '/cache/fakeip/flush' })
}

export const flushDNSCacheAPI = () => {
  return controllerRequest({ method: 'POST', url: '/cache/dns/flush' })
}

export const reloadConfigsAPI = () => {
  return controllerRequest({
    method: 'PUT',
    url: '/configs?reload=true',
    data: { path: '', payload: '' },
  })
}

export const updateConfigsAPI = (
  config: { path?: string; payload?: string },
  force: boolean = false,
) => {
  return controllerRequest({
    method: 'PUT',
    url: `/configs${force ? '?force=true' : ''}`,
    data: {
      path: config.path || '',
      payload: config.payload || '',
    },
  })
}

export const upgradeUIAPI = () => {
  return controllerRequest({ method: 'POST', url: '/upgrade/ui' })
}

export const updateGeoDataAPI = () => {
  return controllerRequest({ method: 'POST', url: '/configs/geo' })
}

export const upgradeCoreAPI = (type: 'release' | 'alpha' | 'auto') => {
  const url = type === 'auto' ? '/upgrade' : `/upgrade?channel=${type}`

  return controllerRequest({ method: 'POST', url })
}

export const restartCoreAPI = () => {
  return controllerRequest({ method: 'POST', url: '/restart' })
}

export const queryDNSAPI = (params: { name: string; type: string }) => {
  return controllerRequest<DNSQuery>({
    method: 'GET',
    url: '/dns/query',
    params,
  })
}

export const getStorageAPI = () => {
  return controllerRequest<Record<string, unknown>>({ method: 'GET', url: '/storage/zashboard' })
}

export const setStorageAPI = (value: Record<string, string>) => {
  return controllerRequest({ method: 'PUT', url: '/storage/zashboard', data: value })
}

export const deleteStorageAPI = () => {
  return controllerRequest({ method: 'DELETE', url: '/storage/zashboard' })
}

const createWebSocket = <T>(url: string, searchParams?: Record<string, string>) => {
  const path = shouldUseFastProxyControllerProxy()
    ? fastProxyControllerProxyPath(url)
    : `/${url.replace(/^\/+/, '')}`
  const resurl = new URL(`${getWebSocketBaseUrl(activeBackend.value)}${path}`)
  const token = shouldUseFastProxyControllerProxy() ? '' : activeBackend.value?.password || ''

  if (token) {
    resurl.searchParams.append('token', token)
  }

  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      resurl.searchParams.append(key, value)
    })
  }

  const data = ref<T>()
  const websocket = new ReconnectingWebSocket(resurl.toString())

  const close = () => {
    websocket.close()
  }

  const messageHandler = ({ data: message }: { data: string }) => {
    data.value = JSON.parse(message)
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
  try {
    return (await detectBackendFlavor(backend, timeout)) !== 'unknown'
  } catch {
    return false
  }
}

const CACHE_DURATION = 1000 * 60 * 60

interface CacheEntry<T> {
  timestamp: number
  version: string
  data: T
}

async function fetchWithLocalCache<T>(url: string, version: string): Promise<T> {
  const cacheKey = 'cache/' + url
  const cacheRaw = localStorage.getItem(cacheKey)

  if (cacheRaw) {
    try {
      const cache: CacheEntry<T> = JSON.parse(cacheRaw)
      const now = Date.now()

      if (now - cache.timestamp < CACHE_DURATION && cache.version === version) {
        return cache.data
      } else {
        localStorage.removeItem(cacheKey)
      }
    } catch (e) {
      console.warn('Failed to parse cache for', url, e)
    }
  }

  const response = await fetch(url)
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
  return data
}

export const fetchIsUIUpdateAvailable = async () => {
  try {
    const { tag_name } = await fetchWithLocalCache<{ tag_name: string }>(
      'https://api.github.com/repos/atlantis-mk/FastProxy/releases/latest',
      appVersion.value,
    )

    return Boolean(tag_name && tag_name !== `v${appVersion.value}`)
  } catch (error) {
    console.warn('Failed to check UI update availability', error)
    return false
  }
}

const check = async (url: string, versionNumber: string) => {
  const { assets } = await fetchWithLocalCache<{ assets: { name: string }[] }>(url, versionNumber)
  const alreadyLatest = assets.some(({ name }) => name.includes(versionNumber))

  return !alreadyLatest
}

export const fetchBackendUpdateAvailableAPI = async () => {
  return await check(
    MIHOMO_CHANNEL[mihomo.value?.[0] ?? MIHOMO.Meta].check_update_url,
    mihomo.value?.[1] ?? version.value,
  )
}
