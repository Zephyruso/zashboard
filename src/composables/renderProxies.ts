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
import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue'
import { isProxyNodeSearchMode, matchProxySearchKeyword, proxySearchKeyword } from './proxySearch'

type LatencyMap = Map<string, number>
type LatencyGetter = (name: string) => number

export function useRenderProxyList(
  proxies: ComputedRef<string[]>,
  groupName?: string,
  renderListEnabled: MaybeRefOrGetter<boolean> = true,
) {
  const renderProxyState = computed(() =>
    getRenderProxyState(proxies.value, groupName, toValue(renderListEnabled)),
  )
  const renderProxies = computed(() => renderProxyState.value.renderProxies)

  const proxiesCount = computed(() => `${renderProxyState.value.available}/${proxies.value.length}`)

  return { renderProxies, proxiesCount }
}

const getRenderProxyState = (
  proxies: string[],
  groupName: string | undefined,
  renderListEnabled: boolean,
) => {
  const latencyMap: LatencyMap = new Map()
  const getLatency: LatencyGetter = (name) => {
    const cached = latencyMap.get(name)
    if (cached !== undefined) return cached

    const latency = getLatencyByName(name, groupName)
    latencyMap.set(name, latency)

    return latency
  }
  const filtered = filterProxies(proxies, groupName, getLatency)
  const renderProxies = renderListEnabled ? sortProxies(filtered, groupName, getLatency) : []
  const available = countAvailableProxies(filtered, getLatency)

  return { renderProxies, available }
}

const filterProxies = (
  proxies: string[],
  groupName: string | undefined,
  getLatency: LatencyGetter,
) => {
  const keyword = isProxyNodeSearchMode.value ? proxySearchKeyword.value : ''
  const groupKeyword = groupName ? proxyGroupFilterMap.value[groupName] : ''

  if (!hideUnavailableProxies.value && !keyword && !groupKeyword) {
    return proxies
  }

  return proxies.filter((name) => {
    if (hideUnavailableProxies.value && !isProxyGroup(name) && getLatency(name) <= NOT_CONNECTED) {
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

const countAvailableProxies = (proxies: string[], getLatency: LatencyGetter) => {
  let available = 0

  for (const proxy of proxies) {
    if (getLatency(proxy) !== NOT_CONNECTED) {
      available += 1
    }
  }

  return available
}

const sortProxies = (
  proxies: string[],
  groupName: string | undefined,
  getLatency: LatencyGetter,
) => {
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

  const sortFunc = getSortFunc(proxySortType.value, getLatency)
  return groups.concat(nodes.sort(sortFunc))
}

const sortBySmartOrder = (proxies: string[], orderMap: Record<string, number>) => {
  return [...proxies].sort((a, b) => {
    const ia = orderMap[a] ?? Number.MAX_SAFE_INTEGER
    const ib = orderMap[b] ?? Number.MAX_SAFE_INTEGER
    return ia - ib
  })
}

const getSortFunc = (sortType: PROXY_SORT_TYPE, getLatency: LatencyGetter) => {
  const latencyFor = (name: string) => {
    const latency = getLatency(name)
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
