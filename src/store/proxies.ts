import {
  deleteFixedProxyAPI,
  disconnectByIdAPI,
  fetchProxiesAPI,
  fetchProxyGroupLatencyAPI,
  fetchProxyLatencyAPI,
  fetchProxyProviderAPI,
  isRequestCanceled,
  isSingBox,
  selectProxyAPI,
} from '@/api'
import {
  GLOBAL,
  IPV6_TEST_URL,
  NOT_CONNECTED,
  PROXY_TAB_TYPE,
  PROXY_TYPE,
  SPEEDTEST_MODE,
  TEST_URL,
} from '@/constant'
import { isProxyGroup } from '@/helper'
import { showNotification } from '@/helper/notification'
import type { Proxy, ProxyProvider } from '@/types'
import { useStorage } from '@vueuse/core'
import { last } from 'lodash-es'
import pLimit from 'p-limit'
import { computed, ref } from 'vue'
import { activeConnections } from './connections'
import {
  automaticDisconnection,
  groupTestUrls,
  iconReflectList,
  independentLatencyTest,
  IPv6test,
  speedtestMode,
  speedtestTimeout,
  speedtestUrl,
} from './settings'
import { activeUuid } from './setup'
import { clearSmartWeights, initSmartWeights } from './smart'

export const proxiesFilter = ref('')
export const proxiesTabShow = ref(PROXY_TAB_TYPE.PROXIES)

export const proxyGroupList = ref<string[]>([])
export const proxyMap = ref<Record<string, Proxy>>({})
const IPv6Map = useStorage<Record<string, boolean>>('cache/ipv6-map', {})
export const hiddenGroupMap = useStorage<Record<string, boolean>>('config/hidden-group-map', {})
export const proxyProviederList = ref<ProxyProvider[]>([])
export const proxyProviderByName = computed(() => {
  const providersByName = new Map<string, ProxyProvider>()

  for (const provider of proxyProviederList.value) {
    providersByName.set(provider.name, provider)
  }

  return providersByName
})
export const providerNameByProxy = computed(() => {
  const nameByProxy = new Map<string, string>()

  for (const provider of proxyProviederList.value) {
    for (const proxy of provider.proxies) {
      nameByProxy.set(proxy.name, provider.name)
    }
  }

  return nameByProxy
})

const speedtestUrlWithDefault = computed(() => {
  return speedtestUrl.value || TEST_URL
})

export const getTestUrl = (groupName?: string) => {
  if (!groupName || !independentLatencyTest.value) {
    return speedtestUrlWithDefault.value
  }

  const groupTestUrl = groupTestUrls.value.find((item) => item.name === groupName)

  if (groupTestUrl) {
    return groupTestUrl.url
  }

  const proxyNode = proxyMap.value[groupName] || proxyProviderByName.value.get(groupName)

  return proxyNode?.testUrl || speedtestUrlWithDefault.value
}

export const getLatencyByName = (proxyName: string, groupName?: string) => {
  const history = getHistoryByName(proxyName, groupName, false)

  return getLatencyFromHistory(history)
}

export const getHistoryByName = (
  proxyName: string,
  groupName?: string,
  ensureIndependentHistory = true,
) => {
  if (independentLatencyTest.value && !isSingBox.value) {
    const proxyNode = proxyMap.value[proxyName]
    const url = getTestUrl(groupName)

    if (!proxyNode) {
      return []
    }

    if (!ensureIndependentHistory && !proxyNode.extra?.[url]) {
      return []
    }

    if (!proxyNode.extra) {
      proxyNode.extra = {}
    }

    if (!proxyNode.extra?.[url]) {
      proxyNode.extra[url] = {
        history: [],
        alive: true,
      }
    }

    return proxyNode?.extra?.[url]?.history
  }

  const nowNode = proxyMap.value[getNowProxyNodeName(proxyName)]

  return nowNode?.history
}

export const getIPv6ByName = (proxyName: string) => {
  return IPv6Map.value[getNowProxyNodeName(proxyName)]
}

let fetchSequence = 0
let fetchAbortController: AbortController | undefined

const isBackendCurrent = (backendUuid: string) => activeUuid.value === backendUuid

export const fetchProxies = async () => {
  const sequence = ++fetchSequence
  const backendUuid = activeUuid.value

  if (!backendUuid) {
    return
  }

  const controller = new AbortController()

  fetchAbortController?.abort()
  fetchAbortController = controller

  let proxyRes: Awaited<ReturnType<typeof fetchProxiesAPI>>
  let providerRes: Awaited<ReturnType<typeof fetchProxyProviderAPI>>

  try {
    ;[proxyRes, providerRes] = await Promise.all([
      fetchProxiesAPI(controller.signal),
      fetchProxyProviderAPI(controller.signal),
    ])
  } catch (error) {
    if (isRequestCanceled(error)) return
    throw error
  } finally {
    if (fetchAbortController === controller) {
      fetchAbortController = undefined
    }
  }

  const proxyData = proxyRes.data
  const providerData = providerRes.data

  if (fetchSequence !== sequence || activeUuid.value !== backendUuid) {
    return
  }

  const sortIndex = proxyData.proxies[GLOBAL].all ?? []
  const allProviderProxies: Record<string, Proxy> = {}
  const providers = Object.values(providerData.providers).filter(
    (provider) => provider.name !== 'default' && provider.vehicleType !== 'Compatible',
  )

  for (const provider of providers) {
    for (const proxy of provider.proxies) {
      allProviderProxies[proxy.name] = proxy
    }
  }

  proxyMap.value = {
    ...allProviderProxies,
    ...proxyData.proxies,
  }
  proxyGroupList.value = Object.values(proxyData.proxies)
    .filter((proxy) => proxy.all?.length && proxy.name !== GLOBAL)
    .sort((prev, next) => {
      const prevIndex = sortIndex.indexOf(prev.name)
      const nextIndex = sortIndex.indexOf(next.name)

      if (prevIndex === -1 && nextIndex === -1) {
        return 0
      }
      if (prevIndex === -1) {
        return 1
      }
      if (nextIndex === -1) {
        return -1
      }
      // 都在 sortIndex 中，按索引排序
      return prevIndex - nextIndex
    })
    .map((proxy) => proxy.name)

  proxyProviederList.value = providers

  const smartGroups: string[] = []

  Object.entries(proxyMap.value).forEach(([name, proxy]) => {
    const iconReflect = iconReflectList.value.find((icon) => icon.name === name)

    if (iconReflect) {
      proxyMap.value[name].icon = iconReflect.icon
    }
    if (IPv6test.value && getIPv6FromExtra(proxy)) {
      IPv6Map.value[name] = true
    }

    if (proxy.type.toLowerCase() === PROXY_TYPE.Smart) {
      smartGroups.push(name)
    }
  })

  if (smartGroups.length > 0) {
    initSmartWeights(smartGroups)
  } else {
    clearSmartWeights()
  }
}

export const handlerProxySelect = async (proxyGroupName: string, proxyName: string) => {
  const proxyGroup = proxyMap.value[proxyGroupName]
  const backendUuid = activeUuid.value

  if (!backendUuid) return
  if (!proxyGroup) return
  if (proxyGroup.type.toLowerCase() === PROXY_TYPE.LoadBalance) return
  if (proxyGroup.now === proxyName) {
    await fetchProxies()
    if (!isBackendCurrent(backendUuid)) return
    if (proxyMap.value[proxyGroupName]?.now === proxyName) return
  }

  await selectProxyAPI(proxyGroupName, proxyName)
  if (activeUuid.value !== backendUuid || !proxyMap.value[proxyGroupName]) return

  proxyMap.value[proxyGroupName].now = proxyName

  if (automaticDisconnection.value) {
    await Promise.allSettled(
      activeConnections.value
        .filter((c) => c.chains.includes(proxyGroupName))
        .map((c) => disconnectByIdAPI(c.id)),
    )
  }
  fetchProxies()
}

const latencyTestForSingle = async (
  proxyName: string,
  url: string,
  timeout: number,
  backendUuid = activeUuid.value,
  signal?: AbortSignal,
) => {
  if (signal?.aborted || !isBackendCurrent(backendUuid)) return null

  const now = getNowProxyNodeName(proxyName)

  if (IPv6test.value) {
    try {
      const { data: ipv6LatencyResult } = await fetchProxyLatencyAPI(
        now,
        IPV6_TEST_URL,
        2000,
        signal,
      )

      if (signal?.aborted || !isBackendCurrent(backendUuid)) return null

      IPv6Map.value[now] = ipv6LatencyResult.delay > NOT_CONNECTED
    } catch (error) {
      if (isRequestCanceled(error) || signal?.aborted || !isBackendCurrent(backendUuid)) return null

      IPv6Map.value[now] = false
    }
  }

  if (signal?.aborted || !isBackendCurrent(backendUuid)) return null

  const res = await fetchProxyLatencyAPI(
    independentLatencyTest.value ? proxyName : now,
    url,
    timeout,
    signal,
  )

  if (signal?.aborted || !isBackendCurrent(backendUuid)) return null

  return res
}

const getNameForNotification = (name: string, url: string) => {
  if (independentLatencyTest.value) {
    return `${name}\n@${url}`
  }

  return name
}

export const proxyLatencyTest = async (
  proxyName: string,
  url = speedtestUrlWithDefault.value,
  timeout = speedtestTimeout.value,
  signal?: AbortSignal,
) => {
  const backendUuid = activeUuid.value
  const res = await latencyTestForSingle(proxyName, url, timeout, backendUuid, signal)

  if (!res || signal?.aborted || !isBackendCurrent(backendUuid)) return

  await fetchProxies()

  if (signal?.aborted || !isBackendCurrent(backendUuid)) return

  if (res.status !== 200) {
    showNotification({
      content: 'testFailedTip',
      params: {
        name: getNameForNotification(proxyName, url),
      },
      type: 'alert-error',
    })
  }
}

const setHistory = (proxyName: string, delay: number, backendUuid = activeUuid.value) => {
  if (!isBackendCurrent(backendUuid)) return

  const history = getHistoryByName(proxyName)
  const now = new Date()

  if (!history) return

  history.push({
    time: now.toISOString(),
    delay,
  })
}

const TIP_KEY = 'testLatencyOneByOneWithTip'
const limiter = pLimit(5)
const testLatencyOneByOneWithTip = async (
  proxyGroupName: string,
  nodes: string[],
  url = speedtestUrlWithDefault.value,
  backendUuid = activeUuid.value,
  signal?: AbortSignal,
) => {
  const total = nodes.length
  let testDone = 0
  let testFailed = 0

  await Promise.allSettled(
    nodes.map((name) =>
      limiter(async () => {
        if (signal?.aborted || !isBackendCurrent(backendUuid)) return

        const res = await latencyTestForSingle(
          name,
          url,
          Math.min(2000, speedtestTimeout.value),
          backendUuid,
          signal,
        )

        if (!res || signal?.aborted || !isBackendCurrent(backendUuid)) return

        if (res.status !== 200) {
          testFailed++
          setHistory(name, NOT_CONNECTED, backendUuid)
        } else {
          setHistory(name, res.data.delay, backendUuid)
        }
        testDone++
        showNotification({
          content: 'testFinishedTip',
          key: TIP_KEY + proxyGroupName,
          params: {
            name: getNameForNotification(proxyGroupName, url),
            total: total.toString(),
            number: testDone.toString(),
          },
          type: 'alert-info',
          timeout: 0,
        })
      }),
    ),
  )

  if (signal?.aborted || !isBackendCurrent(backendUuid)) return

  showNotification({
    content: 'testFinishedResultTip',
    key: TIP_KEY + proxyGroupName,
    params: {
      name: getNameForNotification(proxyGroupName, url),
      total: total.toString(),
      success: `${total - testFailed}`,
      failed: `${testFailed}`,
    },
    type: testFailed ? 'alert-warning' : 'alert-success',
    timeout: 3000,
  })
  await fetchProxies()
}

export const proxyGroupLatencyTest = async (
  proxyGroupName: string,
  backendUuid = activeUuid.value,
  signal?: AbortSignal,
) => {
  if (signal?.aborted || !isBackendCurrent(backendUuid)) return

  const proxyNode = proxyMap.value[proxyGroupName]

  if (!proxyNode) return

  const all = proxyNode.all ?? []
  const url = getTestUrl(proxyGroupName)

  if (
    speedtestMode.value === SPEEDTEST_MODE.DASHBOARD &&
    [PROXY_TYPE.Selector, PROXY_TYPE.LoadBalance, PROXY_TYPE.Smart].includes(
      proxyNode.type.toLowerCase() as PROXY_TYPE,
    )
  ) {
    if (proxyNode.fixed) {
      await deleteFixedProxyAPI(proxyGroupName)
      if (signal?.aborted || !isBackendCurrent(backendUuid)) return
    }
    return testLatencyOneByOneWithTip(proxyGroupName, all, url, backendUuid, signal)
  }

  const timeout = Math.max(5000, speedtestTimeout.value)

  if (IPv6test.value) {
    try {
      const { data: ipv6LatencyResult } = await fetchProxyGroupLatencyAPI(
        proxyGroupName,
        IPV6_TEST_URL,
        timeout,
        signal,
      )

      if (signal?.aborted || !isBackendCurrent(backendUuid)) return

      all?.forEach((name) => {
        IPv6Map.value[getNowProxyNodeName(name)] = ipv6LatencyResult[name] > NOT_CONNECTED
      })
    } catch (error) {
      if (isRequestCanceled(error) || signal?.aborted || !isBackendCurrent(backendUuid)) return

      all?.forEach((name) => {
        IPv6Map.value[getNowProxyNodeName(name)] = false
      })
    }
  }
  await fetchProxyGroupLatencyAPI(proxyGroupName, url, timeout, signal)

  if (signal?.aborted || !isBackendCurrent(backendUuid)) return

  await fetchProxies()

  if (signal?.aborted || !isBackendCurrent(backendUuid)) return

  const total = all.length
  const testFailed = all.filter(
    (name) => getLatencyByName(name, proxyGroupName) === NOT_CONNECTED,
  ).length

  showNotification({
    content: 'testFinishedResultTip',
    key: TIP_KEY + proxyGroupName,
    params: {
      name: getNameForNotification(proxyGroupName, url),
      total: total.toString(),
      success: `${total - testFailed}`,
      failed: `${testFailed}`,
    },
    type: testFailed ? 'alert-warning' : 'alert-success',
    timeout: 3000,
  })
}

export const allProxiesLatencyTest = async (signal?: AbortSignal) => {
  const backendUuid = activeUuid.value

  if (independentLatencyTest.value) {
    const limit = pLimit(3)

    await Promise.allSettled(
      proxyGroupList.value.map((proxyGroupName) =>
        limit(async () => {
          if (signal?.aborted) return
          await proxyGroupLatencyTest(proxyGroupName, backendUuid, signal)
        }),
      ),
    )
    return
  }

  const proxyNode = Object.keys(proxyMap.value).filter((proxy) => !isProxyGroup(proxy))

  return testLatencyOneByOneWithTip(
    'all',
    proxyNode,
    speedtestUrlWithDefault.value,
    backendUuid,
    signal,
  )
}

const getLatencyFromHistory = (history: Proxy['history']) => {
  return last(history)?.delay ?? NOT_CONNECTED
}

const getIPv6FromExtra = (proxy: Proxy) => {
  const ipv6History = proxy.extra?.[IPV6_TEST_URL]?.history

  return (last(ipv6History)?.delay ?? NOT_CONNECTED) > NOT_CONNECTED
}

export const getNowProxyNodeName = (name: string) => {
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

export const getProxyGroupChains = (name: string) => {
  let proxyNode = proxyMap.value[name]

  if (!proxyNode) {
    return []
  }

  const result = [name]

  while (
    proxyNode.now &&
    proxyNode.now !== proxyNode.name &&
    proxyGroupList.value.includes(proxyNode.now)
  ) {
    result.push(proxyNode.now)
    proxyNode = proxyMap.value[proxyNode.now]
  }
  return result
}

export const hasSmartGroup = computed(() => {
  return Object.values(proxyMap.value).some(
    (proxy) => proxy.type.toLowerCase() === PROXY_TYPE.Smart,
  )
})
