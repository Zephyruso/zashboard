import {
  disconnectByIdAPI,
  fetchProxiesAPI,
  fetchProxyGroupLatencyAPI,
  fetchProxyLatencyAPI,
  fetchProxyProviderAPI,
  selectProxyAPI,
} from '@/api'
import type { Proxy, ProxyProvider } from '@/types'
import { last } from 'lodash'
import { ref } from 'vue'
import { activeConnections } from './connections'
import { automaticDisconnection, speedtestTimeout, speedtestUrl } from './settings'

export const GLOBAL = 'GLOBAL'
export const proxyGroupList = ref<string[]>([])
export const proxyMap = ref<Record<string, Proxy>>({})
export const latencyMap = ref<Record<string, number>>({})
export const proxyProviederList = ref<ProxyProvider[]>([])

export const getLatencyByName = (proxyName: string) => {
  return latencyMap.value[getNowProxyNodeName(proxyName)]
}

export const fetchProxies = async () => {
  const { data: proxyData } = await fetchProxiesAPI()
  const { data: providerData } = await fetchProxyProviderAPI()
  const sortIndex = proxyData.proxies[GLOBAL].all ?? []

  proxyMap.value = proxyData.proxies
  proxyGroupList.value = Object.values(proxyData.proxies)
    .filter((proxy) => proxy.all?.length && proxy.name !== GLOBAL && !proxy?.hidden)
    .sort((prev, next) => sortIndex.indexOf(prev.name) - sortIndex.indexOf(next.name))
    .map((proxy) => proxy.name)

  latencyMap.value = Object.fromEntries(
    Object.entries(proxyData.proxies).map(([name, proxy]) => [name, getLatencyFromHistory(proxy)]),
  )
  proxyProviederList.value = Object.values(providerData.providers).filter(
    (provider) => provider.name !== 'default' && provider.vehicleType !== 'Compatible',
  )
}

export const selectProxy = async (proxyGroup: string, name: string) => {
  await selectProxyAPI(proxyGroup, name)
  proxyMap.value[proxyGroup].now = name

  if (automaticDisconnection.value) {
    activeConnections.value
      .filter((c) => c.chains.includes(proxyGroup))
      .forEach((c) => disconnectByIdAPI(c.id))
  }
}

export const proxyLatencyTest = async (proxyName: string) => {
  const { data: latencyResult } = await fetchProxyLatencyAPI(
    proxyName,
    speedtestUrl.value,
    speedtestTimeout.value,
  )

  latencyMap.value[getNowProxyNodeName(proxyName)] = latencyResult.delay
}

export const proxyGroupLatencyTest = async (proxyGroupName: string) => {
  await fetchProxyGroupLatencyAPI(proxyGroupName, speedtestUrl.value, speedtestTimeout.value)
  await fetchProxies()
}

const getLatencyFromHistory = (proxy: Proxy) => {
  return last(proxy.history)?.delay ?? 0
}

const getNowProxyNodeName = (name: string) => {
  let node = proxyMap.value[name]

  if (!name || !node) {
    return name
  }

  while (node.now && node.now !== node.name) {
    const nextNode = proxyMap.value[node.now]

    if (!nextNode) {
      return node.name
    }

    node = nextNode
  }

  return node.name
}
