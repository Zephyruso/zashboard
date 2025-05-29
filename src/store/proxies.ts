import {
  deleteFixedProxyAPI,
  disconnectByIdAPI,
  fetchProxiesAPI,
  fetchProxyGroupLatencyAPI,
  fetchProxyLatencyAPI,
  fetchProxyProviderAPI,
  isSingBox,
  selectProxyAPI,
} from '@renderer/api'
import { useNotification } from '@renderer/composables/notification'
import {
  GLOBAL,
  IPV6_TEST_URL,
  NOT_CONNECTED,
  PROXY_TAB_TYPE,
  PROXY_TYPE,
  TEST_URL,
} from '@renderer/constant'
import { isProxyGroup } from '@renderer/helper'
import type { Proxy, ProxyProvider } from '@renderer/types'
import { useStorage } from '@vueuse/core'
import { debounce, last } from 'lodash-es'
import pLimit from 'p-limit'
import { computed, ref } from 'vue'
import { activeConnections } from './connections'
import {
  automaticDisconnection,
  iconReflectList,
  independentLatencyTest,
  IPv6test,
  speedtestTimeout,
  speedtestUrl,
} from './settings'
import { fetchSmartGroupWeights } from './smart'

export const proxiesFilter = ref('')
export const proxiesTabShow = ref(PROXY_TAB_TYPE.PROXIES)

export const proxyGroupList = ref<string[]>([])
export const proxyMap = ref<Record<string, Proxy>>({})
export const IPv6Map = useStorage<Record<string, boolean>>('config/ipv6-map', {})
export const hiddenGroupMap = useStorage<Record<string, boolean>>('config/hidden-group-map', {})
export const proxyProviederList = ref<ProxyProvider[]>([])

export const getTestUrl = (groupName?: string) => {
  const defaultUrl = speedtestUrl.value || TEST_URL

  if (!groupName || !independentLatencyTest.value) {
    return defaultUrl
  }

  const proxyNode =
    proxyMap.value[groupName] || proxyProviederList.value.find((p) => p.name === groupName)

  return proxyNode?.testUrl || defaultUrl
}

export const getLatencyByName = (proxyName: string, groupName?: string) => {
  const history = getHistoryByName(proxyName, groupName)

  return getLatencyFromHistory(history)
}

export const getHistoryByName = (proxyName: string, groupName?: string) => {
  if (independentLatencyTest.value && !isSingBox.value) {
    const proxyNode = proxyMap.value[proxyName]

    return proxyNode?.extra?.[getTestUrl(groupName)]?.history
  }

  const nowNode = proxyMap.value[getNowProxyNodeName(proxyName)]

  return nowNode?.history
}

export const getIPv6ByName = (proxyName: string) => {
  return IPv6Map.value[getNowProxyNodeName(proxyName)]
}

let fetchTime = 0

export const fetchProxies = async () => {
  const nowTime = Date.now()

  fetchTime = nowTime

  const [proxyRes, providerRes] = await Promise.all([fetchProxiesAPI(), fetchProxyProviderAPI()])
  const proxyData = proxyRes.data
  const providerData = providerRes.data

  if (fetchTime !== nowTime) {
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
    .sort((prev, next) => sortIndex.indexOf(prev.name) - sortIndex.indexOf(next.name))
    .map((proxy) => proxy.name)

  proxyProviederList.value = providers

  Object.entries(proxyMap.value).forEach(([name, proxy]) => {
    const iconReflect = iconReflectList.value.find((icon) => icon.name === name)

    if (iconReflect) {
      proxyMap.value[name].icon = iconReflect.icon
    }
    if (IPv6test.value && getIPv6FromExtra(proxy)) {
      IPv6Map.value[name] = true
    }

    if (proxy.type.toLowerCase() === PROXY_TYPE.Smart) {
      fetchSmartGroupWeights(name)
    }
  })
}

export const handlerProxySelect = async (proxyGroupName: string, proxyName: string) => {
  const proxyGroup = proxyMap.value[proxyGroupName]

  if (proxyGroup.type.toLowerCase() === PROXY_TYPE.LoadBalance) return
  if (proxyGroup.now === proxyName) {
    await fetchProxies()
    if (proxyGroup.now === proxyName) return
  }

  await selectProxyAPI(proxyGroupName, proxyName)
  proxyMap.value[proxyGroupName].now = proxyName

  if (automaticDisconnection.value) {
    activeConnections.value
      .filter((c) => c.chains.includes(proxyGroupName))
      .forEach((c) => disconnectByIdAPI(c.id))
  }
  fetchProxies()
}

const latencyTestForSingle = async (proxyName: string, url: string, timeout: number) => {
  const now = getNowProxyNodeName(proxyName)

  if (IPv6test.value) {
    try {
      const { data: ipv6LatencyResult } = await fetchProxyLatencyAPI(now, IPV6_TEST_URL, 2000)

      IPv6Map.value[now] = ipv6LatencyResult.delay > NOT_CONNECTED
    } catch {
      IPv6Map.value[now] = false
    }
  }

  return await fetchProxyLatencyAPI(independentLatencyTest.value ? proxyName : now, url, timeout)
}
const { showNotification } = useNotification()

export const proxyLatencyTest = async (
  proxyName: string,
  url = speedtestUrl.value,
  timeout = speedtestTimeout.value,
) => {
  const res = await latencyTestForSingle(proxyName, url, timeout)
  await fetchProxies()

  if (res.status !== 200) {
    showNotification({
      content: 'testFailedTip',
      type: 'alert-error',
      timeout: 2000,
    })
  }
}

const latencyTip = (finished: number, total: number, failed: number) => {
  const isFinished = finished === total

  if (isFinished) {
    showNotification({
      content: 'testFinishedResultTip',
      params: {
        success: `${total - failed}`,
        failed: `${failed}`,
      },
      type: failed ? 'alert-warning' : 'alert-success',
      timeout: 2000,
    })
  } else {
    showNotification({
      content: 'testFinishedTip',
      params: {
        number: `${finished}/${total}`,
      },
      type: 'alert-info',
      timeout: 0,
    })
  }
}

const fetchProxiesDebounced = debounce(fetchProxies, 800)
const proxyLatencyTestDebounced = async (
  proxyName: string,
  url = speedtestUrl.value,
  timeout = speedtestTimeout.value,
) => {
  const res = await latencyTestForSingle(proxyName, url, timeout)
  await fetchProxiesDebounced()
  return res
}

const limiter = pLimit(5)
const testLatencyOneByOneWithTip = async (nodes: string[], url = speedtestUrl.value) => {
  let testDone = 0
  let testFailed = 0

  return await Promise.all(
    nodes.map((name) =>
      limiter(async () => {
        const res = await proxyLatencyTestDebounced(
          name,
          url,
          Math.min(3000, speedtestTimeout.value),
        )
        testDone++
        if (res.status !== 200) {
          testFailed++
        }
        latencyTip(testDone, nodes.length, testFailed)
      }),
    ),
  )
}

export const proxyGroupLatencyTest = async (proxyGroupName: string) => {
  const proxyNode = proxyMap.value[proxyGroupName]
  const all = proxyNode.all ?? []
  const url = getTestUrl(proxyGroupName)

  if (
    [PROXY_TYPE.Selector, PROXY_TYPE.LoadBalance, PROXY_TYPE.Smart].includes(
      proxyNode.type.toLowerCase() as PROXY_TYPE,
    )
  ) {
    if (proxyNode.fixed) {
      deleteFixedProxyAPI(proxyGroupName)
    }
    await testLatencyOneByOneWithTip(all, url)
    return
  }

  const timeout = Math.max(5000, speedtestTimeout.value)

  if (IPv6test.value) {
    try {
      const { data: ipv6LatencyResult } = await fetchProxyGroupLatencyAPI(
        proxyGroupName,
        IPV6_TEST_URL,
        timeout,
      )

      all?.forEach((name) => {
        IPv6Map.value[getNowProxyNodeName(name)] = ipv6LatencyResult[name] > NOT_CONNECTED
      })
    } catch {
      all?.forEach((name) => {
        IPv6Map.value[getNowProxyNodeName(name)] = false
      })
    }
  }
  await fetchProxyGroupLatencyAPI(proxyGroupName, url, timeout)
  await fetchProxies()
}

export const allProxiesLatencyTest = async () => {
  const proxyNode = Object.keys(proxyMap.value).filter((proxy) => !isProxyGroup(proxy))

  return testLatencyOneByOneWithTip(proxyNode)
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

export const hasSmartGroup = computed(() => {
  return Object.values(proxyMap.value).some(
    (proxy) => proxy.type.toLowerCase() === PROXY_TYPE.Smart,
  )
})
