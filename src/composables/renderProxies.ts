import { NOT_CONNECTED, PROXY_COUNT_MODE, PROXY_SORT_TYPE } from '@/constant'
import { isProxyGroup } from '@/helper'
import { getLatencyByName, proxiesFilter } from '@/store/proxies'
import {
  hideUnavailableProxies,
  proxyCountMode,
  proxySortType,
  useSmartGroupSort,
} from '@/store/settings'
import { smartOrderMap } from '@/store/smart'
import { sortBy } from 'lodash'
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

  proxies = [...proxies]
  proxies.forEach((name) => {
    latencyMap.set(name, getLatencyByName(name, groupName))
  })

  if (hideUnavailableProxies.value) {
    proxies = proxies.filter((name) => {
      return isProxyGroup(name) || latencyMap.get(name)! > NOT_CONNECTED
    })
  }

  if (proxiesFilter.value) {
    const filters = proxiesFilter.value.split(' ').map((f) => f.toLowerCase().trim())

    proxies = proxies.filter((name) => {
      name = name.toLowerCase()
      return filters.every((f) => name.includes(f))
    })
  }

  if (useSmartGroupSort.value && smartOrderMap.value[groupName!]) {
    const orderArr = smartOrderMap.value[groupName!]

    return sortBy(proxies, (name) => orderArr.indexOf(name))
  }

  if (proxySortType.value === PROXY_SORT_TYPE.DEFAULT) {
    return proxies
  }

  const proxyGroups: string[] = []
  const proxyNodes: string[] = []

  proxies.forEach((proxy) => {
    if (isProxyGroup(proxy)) {
      proxyGroups.push(proxy)
    } else {
      proxyNodes.push(proxy)
    }
  })

  const getLatencyForSort = (name: string) => {
    const latency = latencyMap.get(name)!
    return latency === 0 ? Infinity : latency
  }
  const sortFuncMap = {
    [PROXY_SORT_TYPE.NAME_ASC]: (prev: string, next: string) => prev.localeCompare(next),
    [PROXY_SORT_TYPE.NAME_DESC]: (prev: string, next: string) => next.localeCompare(prev),
    [PROXY_SORT_TYPE.LATENCY_ASC]: (prev: string, next: string) =>
      getLatencyForSort(prev) - getLatencyForSort(next),
    [PROXY_SORT_TYPE.LATENCY_DESC]: (prev: string, next: string) =>
      getLatencyForSort(next) - getLatencyForSort(prev),
  }
  const sortFunc = sortFuncMap[proxySortType.value]

  return proxyGroups.concat(proxyNodes.sort(sortFunc))
}
