import { isSingBox } from '@renderer/api'
import { GLOBAL, PROXY_TAB_TYPE } from '@renderer/constant'
import { isHiddenGroup } from '@renderer/helper'
import { configs } from '@renderer/store/config'
import {
  proxiesTabShow,
  proxyGroupList,
  proxyMap,
  proxyProviederList,
} from '@renderer/store/proxies'
import { customGlobalNode, displayGlobalByMode, manageHiddenGroup } from '@renderer/store/settings'
import { isEmpty } from 'lodash-es'
import { computed } from 'vue'

const filterGroups = (all: string[]) => {
  if (manageHiddenGroup.value) {
    return all
  }

  return all.filter((name) => !isHiddenGroup(name))
}

export const renderGroups = computed(() => {
  if (isEmpty(proxyMap.value)) {
    return []
  }

  if (proxiesTabShow.value === PROXY_TAB_TYPE.PROVIDER) {
    return proxyProviederList.value.map((group) => group.name)
  }

  if (displayGlobalByMode.value) {
    if (configs.value?.mode.toUpperCase() === GLOBAL) {
      return [
        isSingBox.value && proxyMap.value[customGlobalNode.value] ? customGlobalNode.value : GLOBAL,
      ]
    }

    return filterGroups(proxyGroupList.value)
  }

  return filterGroups([...proxyGroupList.value, GLOBAL])
})
