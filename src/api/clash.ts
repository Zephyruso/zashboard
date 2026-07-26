import { getUrlFromBackend } from '@/helper/utils'
import { activeBackend } from '@/store/setup'
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
import axios from 'axios'
import { debounce } from 'lodash'
import ReconnectingWebSocket from 'reconnectingwebsocket'
import { shallowRef } from 'vue'

export const fetchClashVersion = () => axios.get<{ version: string }>('/version')

export const fetchProxiesAPI = () => {
  return axios.get<{ proxies: Record<string, Proxy> }>('/proxies')
}

export const selectProxyAPI = (proxyGroup: string, name: string) => {
  return axios.put(`/proxies/${encodeURIComponent(proxyGroup)}`, { name })
}

export const deleteFixedProxyAPI = (proxyGroup: string) => {
  return axios.delete(`/proxies/${encodeURIComponent(proxyGroup)}`)
}

export const fetchProxyLatencyAPI = (proxyName: string, url: string, timeout: number) => {
  return axios.get<{ delay: number }>(`/proxies/${encodeURIComponent(proxyName)}/delay`, {
    params: {
      url,
      timeout,
    },
  })
}

// provider 节点可能不在全局 /proxies 映射中(或与其他 provider 的同名节点冲突),
// 已知所属 provider 时用该端点测指定节点;与 /proxies/{name}/delay 共用内核的
// getProxyDelay,同样返回 { delay }
export const fetchProxyProviderLatencyAPI = (
  providerName: string,
  proxyName: string,
  url: string,
  timeout: number,
) => {
  return axios.get<{ delay: number }>(
    `/providers/proxies/${encodeURIComponent(providerName)}/${encodeURIComponent(proxyName)}/healthcheck`,
    {
      params: {
        url,
        timeout,
      },
    },
  )
}

export const fetchProxyGroupLatencyAPI = (proxyName: string, url: string, timeout: number) => {
  return axios.get<Record<string, number>>(`/group/${encodeURIComponent(proxyName)}/delay`, {
    params: {
      url,
      timeout,
    },
  })
}

export const fetchSmartWeightsAPI = () => {
  return axios.get<{
    message: string
    weights: Record<string, NodeRank[]>
  }>(`/group/weights`)
}

// deprecated
export const fetchSmartGroupWeightsAPI = (proxyName: string) => {
  return axios.get<{
    message: string
    weights: NodeRank[]
  }>(`/group/${encodeURIComponent(proxyName)}/weights`)
}

export const flushSmartGroupWeightsAPI = () => {
  return axios.post(`/cache/smart/flush`)
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

export const toggleRuleDisabledAPI = (data: Record<number, boolean>) => {
  return axios.patch(`/rules/disable`, data)
}

export const toggleRuleDisabledSingBoxAPI = (uuid: string) => {
  return axios.put(`/rules/${encodeURIComponent(uuid)}`)
}

export const fetchRuleProvidersAPI = () => {
  return axios.get<{ providers: Record<string, RuleProvider> }>('/providers/rules')
}

export const updateRuleProviderAPI = (name: string) => {
  return axios.put(`/providers/rules/${encodeURIComponent(name)}`)
}

export const blockConnectionByIdAPI = (id: string) => {
  return axios.delete(`/connections/smart/${id}`)
}

export const disconnectClashByIdAPI = (id: string) => {
  return axios.delete(`/connections/${id}`)
}

export const disconnectAllClashAPI = () => {
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

export const flushDNSCacheAPI = () => {
  return axios.post('/cache/dns/flush')
}

export const reloadConfigsAPI = () => {
  return axios.put('/configs?reload=true', { path: '', payload: '' })
}

export const updateConfigsAPI = (
  config: { path?: string; payload?: string },
  force: boolean = false,
) => {
  return axios.put(`/configs${force ? '?force=true' : ''}`, {
    path: config.path || '',
    payload: config.payload || '',
  })
}

export const upgradeUIAPI = () => {
  return axios.post('/upgrade/ui')
}

export const updateGeoDataAPI = () => {
  return axios.post('/configs/geo')
}

export const upgradeCoreAPI = (type: 'release' | 'alpha' | 'auto') => {
  const url = type === 'auto' ? '/upgrade' : `/upgrade?channel=${type}`

  return axios.post(url)
}

export const restartCoreAPI = () => {
  return axios.post('/restart')
}

export const queryDNSAPI = (params: { name: string; type: string }) => {
  return axios.get<DNSQuery>('/dns/query', {
    params,
  })
}

export const getStorageAPI = () => {
  return axios.get<Record<string, unknown>>(`/storage/zashboard`)
}

export const setStorageAPI = (value: Record<string, string>) => {
  return axios.put(`/storage/zashboard`, value)
}

export const deleteStorageAPI = () => {
  return axios.delete(`/storage/zashboard`)
}

export const createClashWebSocket = <T>(url: string, searchParams?: Record<string, string>) => {
  const backend = activeBackend.value!
  const resurl = new URL(`${getUrlFromBackend(backend).replace('http', 'ws')}/${url}`)

  resurl.searchParams.append('token', backend.password || '')

  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      resurl.searchParams.append(key, value)
    })
  }

  const data = shallowRef<T>()
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

export const probeClashChannel = async (backend: Backend, timeout: number) => {
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
