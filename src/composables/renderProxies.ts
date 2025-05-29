import { NOT_CONNECTED, PROXY_COUNT_MODE } from '@renderer/constant'
import { sortAndFilterProxyNodes } from '@renderer/helper'
import { getLatencyByName } from '@renderer/store/proxies'
import { proxyCountMode } from '@renderer/store/settings'
import { computed, type ComputedRef } from 'vue'

export function useRenderProxies(proxies: ComputedRef<string[]>, proxyGroup?: string) {
  const renderProxies = computed(() => {
    return sortAndFilterProxyNodes(proxies.value, proxyGroup)
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
