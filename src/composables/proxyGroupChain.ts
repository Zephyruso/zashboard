import { proxyGroupList, proxyMap } from '@/assembly/proxies'
import { ref } from 'vue'

// Direct members of a group that are themselves proxy groups.
export const getChildProxyGroupNames = (name: string, groupSet?: Set<string>) => {
  const proxyGroup = proxyMap.value[name]

  if (!proxyGroup?.all?.length) {
    return []
  }

  const groups = groupSet ?? new Set(proxyGroupList.value)

  return proxyGroup.all.filter((member) => groups.has(member))
}

// Whether the group structurally contains child groups, regardless of the
// current selection. Controls the chain entry button on the group card.
export const hasChildProxyGroups = (groupName: string) =>
  getChildProxyGroupNames(groupName).length > 0

// State for the single page-level proxy-group-chain modal: a non-empty
// target opens the modal, focus selects the initially focused layer
// (defaults to the deepest selected group).
export const proxyGroupChainTarget = ref('')
export const proxyGroupChainFocus = ref('')

export const openProxyGroupChain = (groupName: string, focusGroup = '') => {
  proxyGroupChainFocus.value = focusGroup
  proxyGroupChainTarget.value = groupName
}

export const closeProxyGroupChain = () => {
  proxyGroupChainTarget.value = ''
  proxyGroupChainFocus.value = ''
}
