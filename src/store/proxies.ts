import { disconnectByIdAPI, fetchProxiesAPI, fetchProxyLatencyAPI, selectProxyAPI } from "@/api";
import type { Proxy, ProxyGroup } from "@/types";
import { ref } from "vue";
import { last } from 'lodash'
import { useStorage } from "@vueuse/core";
import { activeConnections } from "./connections";

export const speedtestUrl = useStorage<string>('setup/speedtest-url', 'http://www.gstatic.com/generate_204')
export const speedtestTimeout = useStorage<number>('setup/speedtest-timeout', 5000)

export const proxyGroups = ref<ProxyGroup[]>([])
export const proxyMap = ref<Record<string, Proxy>>({})
export const latencyMap = ref<Record<string, number>>({})

export const getLatencyByName = (proxyName: string) => {
  return latencyMap.value[getNowProxyNodeName(proxyName)]
}

export const fetchProxies = async () => {
  const { data } = await fetchProxiesAPI()
  const sortIndex = data.proxies['GLOBAL'].all ?? []
  const proxies = Object.values(data.proxies).filter((proxy) => proxy.all?.length && proxy.name !== 'GLOBAL') as ProxyGroup[]

  proxyMap.value = data.proxies
  proxyGroups.value = proxies.sort((prev, next) =>
      sortIndex.indexOf(prev.name) - sortIndex.indexOf(next.name))

  latencyMap.value = Object.fromEntries(
      Object.entries(data.proxies).map(([name, proxy]) => [name, getLatencyFromHistory(proxy)]))
}

export const selectProxy = async (proxyGroup: string, name: string) => {
  await selectProxyAPI(proxyGroup, name)

  proxyMap.value[proxyGroup].now = name
  activeConnections.value
    .filter((c) => c.chains.includes(proxyGroup))
    .forEach((c) => disconnectByIdAPI(c.id))
}

export const proxyLatencyTest = async (proxyName: string) => {
  const { data: latencyResult } = await fetchProxyLatencyAPI(proxyName, speedtestUrl.value, speedtestTimeout.value)

  latencyMap.value[proxyName] = latencyResult.delay
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
