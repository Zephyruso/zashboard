import { isSingBox } from '@/api'
import { GLOBAL, PROXY_TAB_TYPE } from '@/constant'
import { isHiddenGroup } from '@/helper'
import { configs } from '@/store/config'
import {
  getProxyGroupChains,
  proxiesTabShow,
  proxyGroupList,
  proxyMap,
  proxyProviederList,
} from '@/store/proxies'
import { groupsInActiveFolder, isProxyFolderModeActive } from '@/store/proxyFolders'
import { customGlobalNode, displayGlobalByMode, manageHiddenGroup } from '@/store/settings'
import { isEmpty } from 'lodash-es'
import { computed, ref } from 'vue'
import {
  isProxyNodeSearchMode,
  matchProxySearchKeyword,
  proxyGroupContainsMatchingNode,
  proxyProviderContainsMatchingNode,
  proxySearchKeyword,
} from './proxySearch'

const filterProxyGroups = (groups: string[], respectHiddenGroups = true) => {
  if (!proxySearchKeyword.value) {
    if (!respectHiddenGroups || manageHiddenGroup.value) {
      return groups
    }

    return groups.filter((name) => !isHiddenGroup(name))
  }

  const matchesGroup = isProxyNodeSearchMode.value
    ? proxyGroupContainsMatchingNode
    : (name: string) => matchProxySearchKeyword(name)

  return groups.filter(matchesGroup)
}

const getRenderProxyGroups = () => {
  if (isEmpty(proxyMap.value)) {
    return []
  }

  if (displayGlobalByMode.value) {
    if (configs.value?.mode.toUpperCase() === GLOBAL) {
      const globalName =
        isSingBox.value && proxyMap.value[customGlobalNode.value] ? customGlobalNode.value : GLOBAL

      return filterProxyGroups(getProxyGroupChains(globalName), false)
    }

    return filterProxyGroups(proxyGroupList.value)
  }

  return filterProxyGroups([...proxyGroupList.value, GLOBAL])
}

const getRenderProxyProviders = () => {
  const names = proxyProviederList.value.map((provider) => provider.name)

  if (!proxySearchKeyword.value) {
    return names
  }

  const matches = isProxyNodeSearchMode.value
    ? proxyProviderContainsMatchingNode
    : (name: string) => matchProxySearchKeyword(name)

  return names.filter(matches)
}

const limitInitialRender = (names: string[]) => {
  if (isProxiesPageMounted.value) {
    return names
  }

  return names.slice(0, 16)
}

export const disableProxiesPageScroll = ref(false)
const proxiesPageScrollLockTokens = new Set<symbol>()

const syncProxiesPageScrollLock = () => {
  disableProxiesPageScroll.value = proxiesPageScrollLockTokens.size > 0
}

export const lockProxiesPageScroll = () => {
  const token = Symbol('proxies-page-scroll-lock')
  proxiesPageScrollLockTokens.add(token)
  syncProxiesPageScrollLock()

  return token
}

export const unlockProxiesPageScroll = (token: symbol | undefined) => {
  if (token === undefined) return

  proxiesPageScrollLockTokens.delete(token)
  syncProxiesPageScrollLock()
}

export const isProxiesPageMounted = ref(false)

const renderProxyGroups = computed(() => {
  return limitInitialRender(getRenderProxyGroups())
})

const renderProxyProviders = computed(() => {
  return limitInitialRender(getRenderProxyProviders())
})

export const renderProxiesPageItems = computed(() => {
  if (proxiesTabShow.value === PROXY_TAB_TYPE.PROVIDER) {
    return renderProxyProviders.value
  }

  const groups = renderProxyGroups.value
  if (!isProxyFolderModeActive.value) return groups
  const filter = groupsInActiveFolder.value
  if (!filter) return groups
  return groups.filter((name) => filter.has(name))
})
