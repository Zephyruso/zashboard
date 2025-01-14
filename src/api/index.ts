import { useTip } from '@/composables/tip'
import { ROUTE_NAME } from '@/config'
import { getUrlFromBackend } from '@/helper'
import router from '@/router'
import { autoUpgradeCore } from '@/store/settings'
import { activeBackend, activeUuid, removeBackend } from '@/store/setup'
import type { Backend, Config, DNSQuery, Proxy, ProxyProvider, Rule, RuleProvider } from '@/types'
import axios from 'axios'
import { debounce } from 'lodash'
import ReconnectingWebSocket from 'reconnectingwebsocket'
import { computed, nextTick, ref, watch } from 'vue'

axios.interceptors.request.use((config) => {
  config.baseURL = getUrlFromBackend(activeBackend.value!)
  config.headers['Authorization'] = 'Bearer ' + activeBackend.value?.password
  return config
})

axios.interceptors.response.use(null, (error) => {
  if (error.status === 401 && activeUuid.value) {
    removeBackend(activeUuid.value)
    activeUuid.value = null
    router.push({ name: ROUTE_NAME.setup })
    nextTick(() => {
      const { showTip } = useTip()

      showTip('unauthorizedTip')
    })
  } else if (error.status === 404) {
    activeUuid.value = null
    router.push({ name: ROUTE_NAME.setup })
  }
  return error
})

export const version = ref()
export const isCoreUpdateAvailable = ref(false)
export const fetchVersionAPI = () => {
  return axios.get<{ version: string }>('/version')
}
export const isSingBox = computed(() => version.value?.includes('sing-box'))
export const zashboardVersion = ref(__APP_VERSION__)

watch(
  activeBackend,
  async (val) => {
    if (val) {
      const { data } = await fetchVersionAPI()

      version.value = data.version
      if (isSingBox.value) return
      isCoreUpdateAvailable.value = await fetchBackendUpdateAvailableAPI()

      if (isCoreUpdateAvailable.value && autoUpgradeCore.value) {
        upgradeCoreAPI()
      }
    }
  },
  { immediate: true },
)

export const fetchProxiesAPI = () => {
  return axios.get<{ proxies: Record<string, Proxy> }>('/proxies')
}

export const selectProxyAPI = (proxyGroup: string, name: string) => {
  return axios.put(`/proxies/${encodeURIComponent(proxyGroup)}`, { name })
}

export const fetchProxyLatencyAPI = (proxyName: string, url: string, timeout: number) => {
  return axios.get<{ delay: number }>(`/proxies/${encodeURIComponent(proxyName)}/delay`, {
    params: {
      url,
      timeout,
    },
  })
}

export const fetchProxyGroupLatencyAPI = (proxyName: string, url: string, timeout: number) => {
  return axios.get<Record<string, number>>(`/group/${encodeURIComponent(proxyName)}/delay`, {
    params: {
      url,
      timeout,
    },
  })
}

export const fetchProxyProviderAPI = () => {
  return axios.get<{ providers: Record<string, ProxyProvider> }>('/providers/proxies')
}

export const updateProxyProviderAPI = (name: string) => {
  return axios.put(`/providers/proxies/${encodeURIComponent(name)}`)
}

export const proxyProviderHealthCheckAPI = (name: string) => {
  return axios.get<Record<string, number>>(
    `/providers/proxies/${encodeURIComponent(name)}/healthcheck`,
    {
      timeout: 15000,
    },
  )
}

export const fetchRulesAPI = () => {
  return axios.get<{ rules: Rule[] }>('/rules')
}

export const fetchRuleProvidersAPI = () => {
  return axios.get<{ providers: Record<string, RuleProvider> }>('/providers/rules')
}

export const updateRuleProviderAPI = (name: string) => {
  return axios.put(`/providers/rules/${encodeURIComponent(name)}`)
}

export const disconnectByIdAPI = (id: string) => {
  return axios.delete(`/connections/${id}`)
}

export const disconnectAllAPI = () => {
  return axios.delete('/connections')
}

export const getConfigsAPI = () => {
  return axios.get<Config>('/configs')
}

export const patchConfigsAPI = (configs: Record<string, string | boolean | object | number>) => {
  return axios.patch('/configs', configs)
}

export const flushFakeIPAPI = () => {
  return axios.post('/cache/fakeip/flush')
}

export const reloadConfigsAPI = () => {
  return axios.put('/configs?reload=true', { path: '', payload: '' })
}

export const upgradeUIAPI = () => {
  return axios.post('/upgrade/ui')
}

export const upgradeCoreAPI = () => {
  return axios.post('/upgrade')
}

export const restartCoreAPI = () => {
  return axios.post('/restart')
}

export const queryDNSAPI = (params: { name: string; type: string }) => {
  return axios.get<DNSQuery>('/dns/query', {
    params,
  })
}

const createWebSocket = <T>(url: string, searchParams?: Record<string, string>) => {
  const backend = activeBackend.value!
  const resurl = new URL(`${getUrlFromBackend(backend).replace('http', 'ws')}/${url}`)

  resurl.searchParams.append('token', backend?.password || '')

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

export const fetchIsUIUpdateAvailable = async () => {
  const response = await fetch('https://api.github.com/repos/Zephyruso/zashboard/releases/latest')
  const { tag_name } = await response.json()

  return tag_name && tag_name !== `v${zashboardVersion.value}`
}

const check = async (url: string, versionNumber: string) => {
  const response = await fetch(`https://api.github.com/repos/MetaCubeX/mihomo${url}`)
  const { assets } = await response.json()
  const alreadyLatest = assets.some(({ name }: { name: string }) => name.includes(versionNumber))

  return !alreadyLatest
}

export const fetchBackendUpdateAvailableAPI = async () => {
  const match = /(alpha|beta|meta)-?(\w+)/.exec(version.value)

  if (!match) {
    const response = await fetch(`https://api.github.com/repos/MetaCubeX/mihomo/releases/latest`)
    const { tag_name } = await response.json()

    return tag_name && !tag_name.endsWith(version.value)
  }

  const channel = match[1],
    versionNumber = match[2]

  if (channel === 'meta') return await check('/releases/latest', versionNumber)
  if (channel === 'alpha') return await check('/releases/tags/Prerelease-Alpha', versionNumber)

  return false
}

export const getIPFromSpeedtestcnAPI = () => {
  return fetch('https://api-v3.speedtest.cn/ip')
}

export type GlobalIPType = {
  organization: string
  longitude: number
  city: string
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
}

export const getIPFromIpsbAPI = async (ip = '') => {
  const response = await fetch('https://api.ip.sb/geoip' + (ip ? `/${ip}` : ''))

  return (await response.json()) as GlobalIPType
}

export const getIPFromIpipnetAPI = async () => {
  const response = await fetch('https://myip.ipip.net/json')

  return (await response.json()) as {
    data: {
      ip: string
      location: string[]
    }
  }
}

export const getIPFromIntermbRuAPI = async () => {
  const response = await fetch('https://ip.intermb.ru/json')

  return (await response.json()) as {
    ip: string
    country: string
    region_name: string
    asn_org: string
  }
}

export const getLatencyFromUrlAPI = (url: string) => {
  return new Promise<number>((resolve) => {
    const startTime = performance.now()
    const img = document.createElement('img')
    img.src = url + '?_=' + new Date().getTime()
    img.style.display = 'none'
    img.onload = () => {
      const endTime = performance.now()
      img.remove()

      resolve(endTime - startTime)
    }
    img.onerror = () => {
      img.remove()

      resolve(0)
    }

    document.body.appendChild(img)
  })
}

export const getCloudflareLatencyAPI = () => {
  return getLatencyFromUrlAPI('https://www.cloudflare.com/favicon.ico')
}

export const getYouTubeLatencyAPI = () => {
  return getLatencyFromUrlAPI('https://yt3.ggpht.com/favicon.ico')
}

export const getGithubLatencyAPI = () => {
  return getLatencyFromUrlAPI('https://github.githubassets.com/favicon.ico')
}

export const getOpenAILatencyAPI = () => {
  return getLatencyFromUrlAPI('https://openai.com/favicon.ico')
}

export const getBaiduLatencyAPI = () => {
  return getLatencyFromUrlAPI('https://apps.bdimg.com/favicon.ico')
}
