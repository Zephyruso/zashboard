import { ref } from 'vue'

// State for the single page-level proxy-group-chain modal:
// a non-empty target opens the modal for that group.
export const proxyGroupChainTarget = ref('')

export const openProxyGroupChain = (groupName: string) => {
  proxyGroupChainTarget.value = groupName
}

export const closeProxyGroupChain = () => {
  proxyGroupChainTarget.value = ''
}
