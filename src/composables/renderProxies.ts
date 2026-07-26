import { getLatencyByName, proxyMap, proxyProviederList } from '@/assembly/proxies'
import { NOT_CONNECTED, PROXY_SORT_TYPE } from '@/constant'
import { isProxyGroup } from '@/helper'
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

export type ProxiesProviderSection = {
  providerName: string
  proxies: string[]
}

export const groupProxiesByProviderName = (proxies: string[]): ProxiesProviderSection[] => {
  const proxiesOfProvider: Record<string, string[]> = {}
  const providerKeys: string[] = []

  for (const proxy of proxies) {
    const proxyNode = proxyMap.value[proxy]
    const providerName =
      proxyNode['provider-name'] ||
      (proxyProviederList.value.find((group) => group.proxies.find((node) => node.name === proxy))
        ?.name ??
        '')

    if (proxiesOfProvider[providerName]) {
      proxiesOfProvider[providerName].push(proxy)
    } else {
      if (providerName === '') {
        providerKeys.unshift('')
      } else {
        providerKeys.push(providerName)
      }

      proxiesOfProvider[providerName] = [proxy]
    }
  }

  return providerKeys.map((providerName) => ({
    providerName,
    proxies: proxiesOfProvider[providerName],
  }))
}

export function useRenderProxyList(proxies: ComputedRef<string[]>, groupName?: string) {
  const renderProxies = computed(() => getRenderProxies(proxies.value, groupName))

  const proxiesCount = computed(() => {
    const available = renderProxies.value.filter(
      (proxy) => getLatencyByName(proxy, groupName) !== NOT_CONNECTED,
    ).length
    return `${available}/${proxies.value.length}`
  })

  return { renderProxies, proxiesCount }
}

const getRenderProxies = (proxies: string[], groupName: string | undefined) => {
  const latencyMap: LatencyMap = new Map(
    proxies.map((name) => [name, getLatencyByName(name, groupName)]),
  )
  const filtered = filterProxies(proxies, groupName, latencyMap)
  return sortProxies(filtered, groupName, latencyMap)
}

const filterProxies = (
  proxies: string[],
  groupName: string | undefined,
  latencyMap: LatencyMap,
) => {
  let result = proxies

  if (hideUnavailableProxies.value) {
    result = result.filter((name) => isProxyGroup(name) || latencyMap.get(name)! > NOT_CONNECTED)
  }

  if (isProxyNodeSearchMode.value && proxySearchKeyword.value) {
    const keyword = proxySearchKeyword.value
    result = result.filter((name) => matchProxySearchKeyword(name, keyword))
  }

  const groupKeyword = groupName ? proxyGroupFilterMap.value[groupName] : ''
  if (groupKeyword) {
    result = result.filter((name) => matchProxySearchKeyword(name, groupKeyword))
  }

  return result
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
