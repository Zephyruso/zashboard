import { proxiesFilter, proxiesTabShow, proxyMap, proxyProviederList } from '@/assembly/proxies'
import { PROXY_SEARCH_MODE, PROXY_TAB_TYPE } from '@/constant'
import { toSearchRegex } from '@/helper/search'
import { proxyProviderSearchMode, proxySearchMode } from '@/store/settings'
import { computed } from 'vue'

export const proxySearchKeyword = computed(() => proxiesFilter.value.trim())

const getCurrentSearchMode = () =>
  proxiesTabShow.value === PROXY_TAB_TYPE.PROVIDER ? proxyProviderSearchMode : proxySearchMode

export const isProxyNodeSearchMode = computed(
  () => getCurrentSearchMode().value === PROXY_SEARCH_MODE.GLOBAL,
)

export const toggleProxySearchMode = () => {
  const mode = getCurrentSearchMode()
  mode.value =
    mode.value === PROXY_SEARCH_MODE.GLOBAL ? PROXY_SEARCH_MODE.GROUP : PROXY_SEARCH_MODE.GLOBAL
}

export const matchProxySearchKeyword = (name: string, keyword = proxySearchKeyword.value) => {
  const normalizedKeyword = keyword.trim()

  if (!normalizedKeyword) {
    return true
  }

  return toSearchRegex(normalizedKeyword)?.test(name) ?? true
}

export const proxyGroupContainsMatchingNode = (groupName: string) => {
  return proxyMap.value[groupName]?.all?.some((name) => matchProxySearchKeyword(name)) ?? false
}

export const proxyProviderContainsMatchingNode = (providerName: string) => {
  const provider = proxyProviederList.value.find((p) => p.name === providerName)
  return provider?.proxies.some((node) => matchProxySearchKeyword(node.name)) ?? false
}
