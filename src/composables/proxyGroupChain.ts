import { ref } from 'vue'

// State for the single page-level proxy-group-chain modal.
export const proxyGroupChainTarget = ref('')
export const proxyGroupChainModalOpen = ref(false)

export const openProxyGroupChain = (groupName: string) => {
  proxyGroupChainTarget.value = groupName
  proxyGroupChainModalOpen.value = true
}

export const closeProxyGroupChain = () => {
  proxyGroupChainModalOpen.value = false
  proxyGroupChainTarget.value = ''
}
