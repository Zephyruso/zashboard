import {
  disconnectByIdAPI,
  fetchProxiesAPI,
  fetchProxyGroupLatencyAPI,
  fetchProxyLatencyAPI,
  fetchProxyProviderAPI,
  selectProxyAPI,
} from '@/api'
import { IPV6_TEST_URL, NOT_CONNECTED } from '@/config'
import { deleteIconFromIndexedDB, getAllIconKeys } from '@/helper/utils'
import type { Proxy, ProxyProvider } from '@/types'
import { useStorage } from '@vueuse/core'
import { compact, difference, last } from 'lodash'
import { computed, ref, watch } from 'vue'
import { activeConnections } from './connections'
import { automaticDisconnection, IPv6test, speedtestTimeout, speedtestUrl } from './settings'

export const GLOBAL = 'GLOBAL'
export const proxyGroupList = ref<string[]>([])
export const proxyMap = ref<Record<string, Proxy>>({})
export const latencyMap = ref<Record<string, number>>({})
export const IPv6Map = useStorage<Record<string, boolean>>('config/ipv6-map', {})
export const proxyProviederList = ref<ProxyProvider[]>([])

export const getLatencyByName = (proxyName: string) => {
  return latencyMap.value[getNowProxyNodeName(proxyName)]
}
export const getIPv6ByName = (proxyName: string) => {
  return IPv6Map.value[getNowProxyNodeName(proxyName)]
}
export const fetchProxies = async () => {
  const { data: proxyData } = await fetchProxiesAPI()
  const { data: providerData } = await fetchProxyProviderAPI()
  const sortIndex = proxyData.proxies[GLOBAL].all ?? []

  proxyMap.value = proxyData.proxies
  proxyGroupList.value = Object.values(proxyData.proxies)
    .filter((proxy) => proxy.all?.length && proxy.name !== GLOBAL)
    .sort((prev, next) => sortIndex.indexOf(prev.name) - sortIndex.indexOf(next.name))
    .map((proxy) => proxy.name)

  latencyMap.value = Object.fromEntries(
    Object.entries(proxyData.proxies).map(([name, proxy]) => {
      if (IPv6test.value && getIPv6FromExtra(proxy)) {
        IPv6Map.value[name] = true
      }

      return [name, getLatencyFromHistory(proxy)]
    }),
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
  fetchProxies()
}

export const proxyLatencyTest = async (proxyName: string) => {
  if (IPv6test.value) {
    try {
      const { data: ipv6LatencyResult } = await fetchProxyLatencyAPI(proxyName, IPV6_TEST_URL, 4000)

      IPv6Map.value[getNowProxyNodeName(proxyName)] = ipv6LatencyResult.delay > NOT_CONNECTED
    } catch {
      IPv6Map.value[getNowProxyNodeName(proxyName)] = false
    }
  }
  const { data: latencyResult } = await fetchProxyLatencyAPI(
    proxyName,
    speedtestUrl.value,
    speedtestTimeout.value,
  )

  latencyMap.value[getNowProxyNodeName(proxyName)] = latencyResult.delay
}

export const proxyGroupLatencyTest = async (proxyGroupName: string) => {
  if (IPv6test.value) {
    try {
      const { data: ipv6LatencyResult } = await fetchProxyGroupLatencyAPI(
        proxyGroupName,
        IPV6_TEST_URL,
        4000,
      )

      proxyMap.value[proxyGroupName].all?.forEach((name) => {
        IPv6Map.value[getNowProxyNodeName(name)] = ipv6LatencyResult[name] > NOT_CONNECTED
      })
    } catch {
      proxyMap.value[proxyGroupName].all?.forEach((name) => {
        IPv6Map.value[getNowProxyNodeName(name)] = false
      })
    }
  }
  await fetchProxyGroupLatencyAPI(proxyGroupName, speedtestUrl.value, speedtestTimeout.value)
  await fetchProxies()
}

const getLatencyFromHistory = (proxy: Proxy) => {
  return last(proxy.history)?.delay ?? 0
}

const getIPv6FromExtra = (proxy: Proxy) => {
  const ipv6History = proxy.extra?.[IPV6_TEST_URL]?.history

  return (last(ipv6History)?.delay ?? 0) > NOT_CONNECTED
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

const allIcons = computed(() => {
  return compact(Object.values(proxyMap.value).map((proxy) => proxy.icon))
})

watch(allIcons, async (values) => {
  const allCachedIcons = await getAllIconKeys()

  difference(allCachedIcons, values).forEach((icon) => {
    deleteIconFromIndexedDB(icon)
  })
})
