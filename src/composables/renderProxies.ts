import { NOT_CONNECTED, PROXY_SORT_TYPE } from '@/constant'
import { isProxyGroup } from '@/helper'
import { getLatencyByName } from '@/store/proxies'
import {
  hideUnavailableProxies,
  proxyGroupFilterMap,
  proxySortType,
  useSmartGroupSort,
} from '@/store/settings'
import { smartOrderMap } from '@/store/smart'
import { computed, type ComputedRef } from 'vue'
import { isProxyNodeSearchMode, matchProxySearchKeyword, proxySearchKeyword } from './proxySearch'

type LatencyMap = Map<string, number>

export function useRenderProxyList(proxies: ComputedRef<string[]>, groupName?: string) {
  const renderProxyState = computed(() => getRenderProxyState(proxies.value, groupName))
  const renderProxies = computed(() => renderProxyState.value.renderProxies)

  const proxiesCount = computed(() => `${renderProxyState.value.available}/${proxies.value.length}`)

  return { renderProxies, proxiesCount }
}

const getRenderProxyState = (proxies: string[], groupName: string | undefined) => {
  const latencyMap: LatencyMap = new Map(
    proxies.map((name) => [name, getLatencyByName(name, groupName)]),
  )
  const filtered = filterProxies(proxies, groupName, latencyMap)
  const renderProxies = sortProxies(filtered, groupName, latencyMap)
  const available = countAvailableProxies(renderProxies, latencyMap)

  return { renderProxies, available }
}

const filterProxies = (
  proxies: string[],
  groupName: string | undefined,
  latencyMap: LatencyMap,
) => {
  const keyword = isProxyNodeSearchMode.value ? proxySearchKeyword.value : ''
  const groupKeyword = groupName ? proxyGroupFilterMap.value[groupName] : ''

  if (!hideUnavailableProxies.value && !keyword && !groupKeyword) {
    return proxies
  }

  return proxies.filter((name) => {
    if (
      hideUnavailableProxies.value &&
      !isProxyGroup(name) &&
      latencyMap.get(name)! <= NOT_CONNECTED
    ) {
      return false
    }
    if (keyword && !matchProxySearchKeyword(name, keyword)) {
      return false
    }
    if (groupKeyword && !matchProxySearchKeyword(name, groupKeyword)) {
      return false
    }
    return true
  })
}

const countAvailableProxies = (proxies: string[], latencyMap: LatencyMap) => {
  let available = 0

  for (const proxy of proxies) {
    if (latencyMap.get(proxy)! !== NOT_CONNECTED) {
      available += 1
    }
  }

  return available
}

const sortProxies = (proxies: string[], groupName: string | undefined, latencyMap: LatencyMap) => {
  if (groupName && useSmartGroupSort.value && smartOrderMap.value[groupName]) {
    return sortBySmartOrder(proxies, smartOrderMap.value[groupName])
  }

  if (proxySortType.value === PROXY_SORT_TYPE.DEFAULT) {
    return proxies
  }

  const groups: string[] = []
  const nodes: string[] = []
  proxies.forEach((proxy) => {
    ;(isProxyGroup(proxy) ? groups : nodes).push(proxy)
  })

  const sortFunc = getSortFunc(proxySortType.value, latencyMap)
  return groups.concat(nodes.sort(sortFunc))
}

const sortBySmartOrder = (proxies: string[], orderMap: Record<string, number>) => {
  return [...proxies].sort((a, b) => {
    const ia = orderMap[a] ?? Number.MAX_SAFE_INTEGER
    const ib = orderMap[b] ?? Number.MAX_SAFE_INTEGER
    return ia - ib
  })
}

const getSortFunc = (sortType: PROXY_SORT_TYPE, latencyMap: LatencyMap) => {
  const latencyFor = (name: string) => {
    const latency = latencyMap.get(name)!
    return latency === 0 ? Infinity : latency
  }
  switch (sortType) {
    case PROXY_SORT_TYPE.NAME_ASC:
      return (a: string, b: string) => a.localeCompare(b)
    case PROXY_SORT_TYPE.NAME_DESC:
      return (a: string, b: string) => b.localeCompare(a)
    case PROXY_SORT_TYPE.LATENCY_ASC:
      return (a: string, b: string) => latencyFor(a) - latencyFor(b)
    case PROXY_SORT_TYPE.LATENCY_DESC:
      return (a: string, b: string) => latencyFor(b) - latencyFor(a)
    default:
      return undefined
  }
}
