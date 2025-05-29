import { NOT_CONNECTED, PROXY_COUNT_MODE, PROXY_SORT_TYPE } from '@renderer/constant'
import { isProxyGroup } from '@renderer/helper'
import { getLatencyByName, proxiesFilter } from '@renderer/store/proxies'
import {
  hideUnavailableProxies,
  proxyCountMode,
  proxySortType,
  useSmartGroupSort,
} from '@renderer/store/settings'
import { smartWeightsMap } from '@renderer/store/smart'
import { computed, type ComputedRef } from 'vue'

export function useRenderProxies(proxies: ComputedRef<string[]>, proxyGroup?: string) {
  const renderProxies = computed(() => {
    return getRenderProxies(proxies.value, proxyGroup)
  })
  const availableProxies = computed(() => {
    return renderProxies.value.filter(
      (proxy) => getLatencyByName(proxy, proxyGroup) !== NOT_CONNECTED,
    ).length
  })

  const proxiesCount = computed(() => {
    const all = proxies.value.length

    if (proxyCountMode.value === PROXY_COUNT_MODE.FILTERED_TOTAL) {
      return renderProxies.value.length
    }

    if (proxyCountMode.value === PROXY_COUNT_MODE.TOTAL || availableProxies.value === all) {
      return all
    }

    return `${availableProxies.value}/${all}`
  })

  return {
    renderProxies,
    proxiesCount,
  }
}

const getRenderProxies = (proxies: string[], groupName?: string) => {
  const latencyMap = new Map<string, number>()
  const getLatencyForSort = (name: string) => {
    if (isProxyGroup(name)) {
      return -1
    }
    const latency = latencyMap.get(name)!

    return latency === 0 ? Infinity : latency
  }

  proxies = [...proxies]
  proxies.forEach((name) => {
    latencyMap.set(name, getLatencyByName(name, groupName))
  })

  if (hideUnavailableProxies.value) {
    proxies = proxies.filter((name) => {
      return isProxyGroup(name) || latencyMap.get(name)! > 0
    })
  }

  if (proxiesFilter.value) {
    const filters = proxiesFilter.value.split(' ').map((f) => f.toLowerCase().trim())

    proxies = proxies.filter((name) => {
      name = name.toLowerCase()
      return filters.every((f) => name.includes(f))
    })
  }

  if (useSmartGroupSort.value && smartWeightsMap.value[groupName!]) {
    const smartGroupSort = ['MostUsed', 'OccasionalUsed', 'RarelyUsed']

    return proxies.sort((prev, next) => {
      return (
        smartGroupSort.indexOf(smartWeightsMap.value[groupName!]![prev]!) -
        smartGroupSort.indexOf(smartWeightsMap.value[groupName!]![next]!)
      )
    })
  }

  switch (proxySortType.value) {
    case PROXY_SORT_TYPE.DEFAULT:
      return proxies
    case PROXY_SORT_TYPE.NAME_ASC:
      return proxies.sort((prev, next) => prev.localeCompare(next))
    case PROXY_SORT_TYPE.NAME_DESC:
      return proxies.sort((prev, next) => next.localeCompare(prev))
    case PROXY_SORT_TYPE.LATENCY_ASC:
      return proxies.sort((prev, next) => getLatencyForSort(prev) - getLatencyForSort(next))
    case PROXY_SORT_TYPE.LATENCY_DESC:
      return proxies.sort((prev, next) => getLatencyForSort(next) - getLatencyForSort(prev))
  }
}
